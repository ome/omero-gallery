
from django.http import HttpResponseRedirect, HttpResponseBadRequest
from django.urls import reverse, NoReverseMatch
import json
import logging
import base64
import urllib

import omero
from omero.rtypes import wrap, rlong
from omeroweb.webclient.decorators import login_required, render_response
from omeroweb.api.decorators import login_required as api_login_required
from omeroweb.api.api_settings import API_MAX_LIMIT

import requests

from . import gallery_settings as settings
from .data.background_images import IDR_IMAGES, TISSUE_IMAGES, CELL_IMAGES
from .data.tabs import TABS
from .version import VERSION

try:
    from omero_mapr import mapr_settings
except ImportError:
    mapr_settings = None

logger = logging.getLogger(__name__)
MAX_LIMIT = max(1, API_MAX_LIMIT)


def redirect_with_params(viewname, **kwargs):
    """
    Redirect a view with params
    """
    rev = reverse(viewname)
    params = urllib.parse.urlencode(kwargs)
    if params:
        rev = '{}?{}'.format(rev, params)
    return HttpResponseRedirect(rev)


@login_required()
@render_response()
def index(request, super_category=None, conn=None, **kwargs):
    """
    Home page shows a list of groups OR a set of 'categories' from
    user-configured queries.
    """

    # template is different for '/search' page
    template = "idr_gallery/index.html"
    if "search" in request.path:
        template = "idr_gallery/search.html"
        query = request.GET.get("query")
        # Handle old URLs e.g. ?query=mapr_gene:PAX7
        if query:
            # if 'mapr' search, redirect to searchengine page
            if query.startswith("mapr_"):
                keyval = find_mapr_key_value(request, query)
                if keyval is not None:
                    # /search/?key=Gene+Symbol&value=pax6&operator=contains
                    # Use "contains" to be consistent with studies search below
                    return redirect_with_params('idr_gallery_search',
                                                key=keyval[0],
                                                value=keyval[1],
                                                operator="contains")
            # handle e.g. ?query=Publication%20Authors:smith
            # ?key=Publication+Authors&value=Smith&operator=contains&resource=container
            keyval = query.split(":", 1)
            if len(keyval) > 1 and len(keyval[1]) > 0:
                # search for studies ("containers") and use "contains"
                # to match previous behaviour
                # NB: 'Name' needs to be 'name' for search-engine
                key = "name" if keyval[0] == "Name" else keyval[0]
                return redirect_with_params('idr_gallery_search',
                                            key=key,
                                            value=keyval[1],
                                            resource="container",
                                            operator="contains")
            return HttpResponseBadRequest(
                "Query should be ?query=key:value format")
    context = {'template': template}
    context["idr_images"] = IDR_IMAGES
    if super_category == "cell":
        context["idr_images"] = CELL_IMAGES
    elif super_category == "tissue":
        context["idr_images"] = TISSUE_IMAGES
    category = settings.SUPER_CATEGORIES.get(super_category)
    if category is not None:
        category['id'] = super_category
        context['super_category'] = json.dumps(category)
        context['category'] = super_category
    context["TABS"] = TABS
    context["VERSION"] = VERSION

    settings_ctx = get_settings_as_context()
    context = {**context, **settings_ctx}

    return context


def find_mapr_key_value(request, query):
    key_val = query.split(":", 1)
    if len(key_val) < 2:
        return None
    mapr_key = key_val[0].replace("mapr_", "")
    mapr_value = key_val[1]
    if mapr_settings and mapr_key in mapr_settings.MAPR_CONFIG:
        if len(key_val) > 0:
            # Key could be e.g. 'Gene Symbol' or 'Gene Identifier'
            mapr_config = mapr_settings.MAPR_CONFIG
            all_keys = mapr_config[mapr_key]["all"]
            default_key = mapr_config[mapr_key]["default"][0]
            # if multiple keys e.g. 'Gene Symbol' or 'Gene Identifier'
            if len(all_keys) > 1:
                # need to check which Key matches the Value...
                matching_keys = search_engine_keys(request, mapr_value)
                all_keys = [key for key in all_keys if key in matching_keys]
            if len(all_keys) > 1 and default_key in all_keys:
                mapann_key = default_key
            elif len(all_keys) == 1:
                mapann_key = all_keys[0]
            else:
                # no matches -> use default
                mapann_key = default_key
        return mapann_key, mapr_value
    return None


def search_engine_keys(request, value):
    # find keys that are match the given value
    if settings.BASE_URL is not None:
        base_url = settings.BASE_URL
    else:
        base_url = request.build_absolute_uri(reverse('index'))
    url = f"{base_url}searchengine/api/v1/resources/image/searchvalues/"
    url += f"?value={value}"
    json_data = requests.get(url).json().get("data", [])
    keys = [result.get("Key") for result in json_data]
    return keys


def get_settings_as_context():
    context = {}
    category_queries = settings.CATEGORY_QUERIES
    context['favicon'] = settings.FAVICON
    context['gallery_title'] = settings.GALLERY_TITLE
    context['top_right_links'] = settings.TOP_RIGHT_LINKS
    context['top_left_logo'] = settings.TOP_LEFT_LOGO
    context['IDR_STUDIES_URL'] = settings.IDR_STUDIES_URL
    try:
        href = context['top_left_logo'].get('href', 'idr_gallery_index')
        context['top_left_logo']['href'] = reverse(href)
    except NoReverseMatch:
        pass
    # used by /search page
    context['SUPER_CATEGORIES'] = json.dumps(settings.SUPER_CATEGORIES)
    context['filter_keys'] = settings.FILTER_KEYS
    context['TITLE_KEYS'] = json.dumps(settings.TITLE_KEYS)
    context['STUDY_SHORT_NAME'] = json.dumps(settings.STUDY_SHORT_NAME)
    context['filter_mapr_keys'] = json.dumps(
        settings.FILTER_MAPR_KEYS)
    context['super_categories'] = settings.SUPER_CATEGORIES
    base_url = reverse('index')
    if settings.BASE_URL is not None:
        base_url = settings.BASE_URL
    context['base_url'] = base_url
    context['gallery_index'] = reverse('idr_gallery_index')
    if settings.GALLERY_INDEX is not None:
        context['gallery_index'] = settings.GALLERY_INDEX
    context['category_queries'] = json.dumps(category_queries)
    return context


@render_response()
def gallery_settings(request):
    """Return all settings as JSON."""

    attrs = ['CATEGORY_QUERIES',
             'GALLERY_TITLE',
             'FILTER_KEYS',
             'TITLE_KEYS',
             'FILTER_MAPR_KEYS',
             'SUPER_CATEGORIES',
             'BASE_URL',
             'TOP_RIGHT_LINKS',
             'TOP_LEFT_LOGO',
             'FAVICON',
             'STUDY_SHORT_NAME',
             ]

    context = {}
    for attr in attrs:
        try:
            context[attr] = getattr(settings, attr)
        except AttributeError:
            pass

    return context


def _get_study_images(conn, obj_type, obj_id, limit=1,
                      offset=0, tag_text=None):

    query_service = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.addId(obj_id)
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(limit)
    params.theFilter.offset = wrap(offset)
    and_text_value = ""
    if tag_text is not None:
        params.addString("tag_text", tag_text)
        and_text_value = " and annotation.textValue = :tag_text"

    if obj_type == "project":
        query = "select i from Image as i"\
                " left outer join i.datasetLinks as dl"\
                " join dl.parent as dataset"\
                " left outer join dataset.projectLinks"\
                " as pl join pl.parent as project"\
                " left outer join i.annotationLinks as al"\
                " join al.child as annotation"\
                " where project.id = :id%s" % and_text_value

    elif obj_type == "screen":
        query = ("select i from Image as i"
                 " left outer join i.wellSamples as ws"
                 " join ws.well as well"
                 " join well.plate as pt"
                 " left outer join pt.screenLinks as sl"
                 " join sl.parent as screen"
                 " left outer join i.annotationLinks as al"
                 " join al.child as annotation"
                 " where screen.id = :id%s"
                 " order by well.column, well.row" % and_text_value)

    objs = query_service.findAllByQuery(query, params, conn.SERVICE_OPTS)

    return objs


@render_response()
@api_login_required()   # 403 JsonResponse if not logged in
def api_thumbnails(request, conn=None, **kwargs):
    """
    Return data like
    { project-1: {thumbnail: base64data, image: {id:1}} }
    """
    project_ids = request.GET.getlist('project')
    screen_ids = request.GET.getlist('screen')

    image_ids = {}
    for obj_type, ids in zip(['project', 'screen'], [project_ids, screen_ids]):
        for obj_id in ids:
            images = _get_study_images(conn, obj_type, obj_id,
                                       tag_text="Study Example Image")
            if len(images) == 0:
                # None found with Tag - just load untagged image
                images = _get_study_images(conn, obj_type, obj_id)
            if len(images) > 0:
                image_ids[images[0].id.val] = "%s-%s" % (obj_type, obj_id)

    thumbnails = conn.getThumbnailSet([rlong(i) for i in image_ids.keys()], 96)
    rv = {}
    for i, obj_id in image_ids.items():
        rv[obj_id] = {"image": {'id': i}}
        try:
            t = thumbnails[i]
            if len(t) > 0:
                # replace thumbnail urls by base64 encoded image
                rv[obj_id]["thumbnail"] = ("data:image/jpeg;base64,%s" %
                                           base64.b64encode(t).decode("utf-8"))

        except KeyError:
            logger.error("Thumbnail not available. (img id: %d)" % i)
    return rv
