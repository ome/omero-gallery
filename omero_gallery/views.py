from django.http import Http404
from django.urls import reverse, NoReverseMatch
import json
import logging
import base64

import omero
from omero.rtypes import wrap, rlong
from omeroweb.webclient.decorators import login_required, render_response
from omeroweb.api.decorators import login_required as api_login_required
from omeroweb.api.api_settings import API_MAX_LIMIT

try:
    from omero_marshal import get_encoder
except ImportError:
    get_encoder = None

from . import gallery_settings as settings

logger = logging.getLogger(__name__)
MAX_LIMIT = max(1, API_MAX_LIMIT)


@login_required()
@render_response()
def index(request, super_category=None, conn=None, **kwargs):
    """
    Home page shows a list of groups OR a set of 'categories' from
    user-configured queries.
    """

    category_queries = settings.CATEGORY_QUERIES
    if len(category_queries) > 0:
        context = {'template': "webgallery/categories/index.html"}
        context['favicon'] = settings.FAVICON
        context['gallery_title'] = settings.GALLERY_TITLE
        context['gallery_heading'] = settings.GALLERY_HEADING
        context['top_right_links'] = settings.TOP_RIGHT_LINKS
        context['top_left_logo'] = settings.TOP_LEFT_LOGO
        try:
            href = context['top_left_logo'].get('href', 'webgallery_index')
            context['top_left_logo']['href'] = reverse(href)
        except NoReverseMatch:
            pass
        context['subheading_html'] = settings.SUBHEADING_HTML
        context['footer_html'] = settings.FOOTER_HTML
        context['filter_keys'] = json.dumps(settings.FILTER_KEYS)
        context['TITLE_KEYS'] = json.dumps(settings.TITLE_KEYS)
        context['STUDY_SHORT_NAME'] = json.dumps(settings.STUDY_SHORT_NAME)
        context['filter_mapr_keys'] = json.dumps(
            settings.FILTER_MAPR_KEYS)
        context['super_categories'] = settings.SUPER_CATEGORIES
        category = settings.SUPER_CATEGORIES.get(super_category)
        if category is not None:
            label = category.get('label', context['gallery_heading'])
            title = category.get('title', label)
            context['gallery_heading'] = title
            context['super_category'] = json.dumps(category)
            context['category'] = super_category
        base_url = reverse('index')
        if settings.BASE_URL is not None:
            base_url = settings.BASE_URL
        context['base_url'] = base_url
        context['category_queries'] = json.dumps(category_queries)
        return context

    my_groups = list(conn.getGroupsMemberOf())

    # Need a custom query to get 1 (random) image per Project
    query_service = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(1)

    query = "select count(obj.id) from %s as obj"

    groups = []
    for g in my_groups:
        conn.SERVICE_OPTS.setOmeroGroup(g.id)
        images = list(conn.getObjects("Image", params=params))
        if len(images) == 0:
            continue        # Don't display empty groups
        p_count = query_service.projection(
            query % 'Project', None, conn.SERVICE_OPTS)
        d_count = query_service.projection(
            query % 'Dataset', None, conn.SERVICE_OPTS)
        i_count = query_service.projection(
            query % 'Image', None, conn.SERVICE_OPTS)
        groups.append({
            'id': g.getId(),
            'name': g.getName(),
            'description': g.getDescription(),
            'projectCount': p_count[0][0]._val,
            'datasetCount': d_count[0][0]._val,
            'imageCount': i_count[0][0]._val,
            'image': len(images) > 0 and images[0] or None})

    # This is used by @render_response
    context = {'template': "webgallery/index.html"}
    context['groups'] = groups

    return context


@render_response()
def gallery_settings(request):
    """Return all settings as JSON."""

    attrs = ['CATEGORY_QUERIES',
             'GALLERY_TITLE',
             'GALLERY_HEADING',
             'FILTER_KEYS',
             'TITLE_KEYS',
             'FILTER_MAPR_KEYS',
             'SUPER_CATEGORIES',
             'BASE_URL',
             'TOP_RIGHT_LINKS',
             'TOP_LEFT_LOGO',
             'FOOTER_HTML',
             'SUBHEADING_HTML',
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


@login_required()
@render_response()
def show_group(request, group_id, conn=None, **kwargs):
    conn.SERVICE_OPTS.setOmeroGroup(group_id)

    s = conn.groupSummary(group_id)
    group_owners = s["leaders"]
    group_members = s["colleagues"]
    group = conn.getObject("ExperimenterGroup", group_id)

    # Get NEW user_id, OR current user_id from session OR 'All Members' (-1)
    user_id = request.GET.get(
        'user_id', request.session.get('user_id', -1))
    user_ids = [u.id for u in group_owners]
    user_ids.extend([u.id for u in group_members])
    user_id = int(user_id)
    # Check user is in group
    if user_id not in user_ids and user_id is not -1:
        user_id = -1
    # save it to session
    request.session['user_id'] = int(user_id)
    request.session.modified = True

    query_service = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(1)
    # params.map = {}
    query = "select i from Image as i"\
            " left outer join i.datasetLinks as dl join dl.parent as dataset"\
            " left outer join dataset.projectLinks"\
            " as pl join pl.parent as project"\
            " where project.id = :pid"
    param_all = omero.sys.ParametersI()
    count_images = "select count(i), count(distinct dataset) from Image as i"\
                   " left outer join i.datasetLinks"\
                   " as dl join dl.parent as dataset"\
                   " left outer join dataset.projectLinks"\
                   " as pl join pl.parent as project"\
                   " where project.id = :pid"

    if user_id == -1:
        user_id = None
    projects = []
    # Will be from active group, owned by user_id (as perms allow)
    for p in conn.listProjects(eid=user_id):
        pdata = {'id': p.getId(), 'name': p.getName()}
        pdata['description'] = p.getDescription()
        pdata['owner'] = p.getDetails().getOwner().getOmeName()
        # Look-up a single image
        params.addLong('pid', p.getId())
        img = query_service.findByQuery(query, params, conn.SERVICE_OPTS)
        if img is None:
            continue    # Ignore projects with no images
        pdata['image'] = {'id': img.getId().getValue(),
                          'name': img.getName().getValue()}
        param_all.addLong('pid', p.getId())
        image_count = query_service.projection(
            count_images, param_all, conn.SERVICE_OPTS)
        pdata['imageCount'] = image_count[0][0].val
        pdata['datasetCount'] = image_count[0][1].val
        projects.append(pdata)

    query = "select i from Image as i"\
            " left outer join i.datasetLinks as dl"\
            " join dl.parent as dataset"\
            " where dataset.id = :did"
    count_images = "select count(i) from Image as i"\
                   " left outer join i.datasetLinks as dl "\
                   "join dl.parent as dataset"\
                   " where dataset.id = :did"
    datasets = []
    for d in conn.listOrphans("Dataset", eid=user_id):
        ddata = {'id': d.getId(), 'name': d.getName()}
        ddata['description'] = d.getDescription()
        ddata['owner'] = d.getDetails().getOwner().getOmeName()
        # Look-up a single image
        # params.map['did'] = wrap(d.id)
        params.addLong('did', d.getId())
        img = query_service.findByQuery(query, params, conn.SERVICE_OPTS)
        if img is None:
            continue    # ignore datasets with no images
        ddata['image'] = {'id': img.getId().getValue(),
                          'name': img.getName().getValue()}
        param_all.addLong('did', d.getId())
        image_count = query_service.projection(
            count_images, param_all, conn.SERVICE_OPTS)
        ddata['imageCount'] = image_count[0][0].val
        datasets.append(ddata)
    context = {'template': "webgallery/show_group.html"}
    context['group'] = group
    context['group_owners'] = group_owners
    context['group_members'] = group_members
    context['projects'] = projects
    context['datasets'] = datasets

    return context


@login_required()
@render_response()
def show_project(request, project_id, conn=None, **kwargs):
    """
    Show a project
    """

    project = conn.getObject("Project", project_id)

    if project is None:
        raise Http404

    # Set a limit to grab 5 images from each Dataset
    params = omero.sys.Parameters()
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(5)

    datasets = []
    for ds in project.listChildren():
        # want to display 5 images from each dataset
        images = ds.listChildren(params=params)
        datasets.append({
            "id": ds.getId(),
            "name": ds.getName(),
            "description": ds.getDescription(),
            "images": images})

    context = {'template': "webgallery/show_project.html"}
    context['project'] = project
    context['datasets'] = datasets

    return context


@login_required()
@render_response()
def show_dataset(request, dataset_id, conn=None, **kwargs):
    """
    Show a dataset
    """

    dataset = conn.getObject("Dataset", dataset_id)

    if dataset is None:
        raise Http404

    context = {'template': "webgallery/show_dataset.html"}
    context['dataset'] = dataset

    return context


@login_required()
@render_response()
def show_image(request, image_id, conn=None, **kwargs):
    """
    Show an image
    """

    image = conn.getObject("Image", image_id)

    if image is None:
        raise Http404

    tags = []
    for ann in image.listAnnotations():
        if isinstance(ann, omero.gateway.TagAnnotationWrapper):
            tags.append(ann)

    context = {'template': "webgallery/show_image.html"}
    context['image'] = image
    context['tags'] = tags

    return context


@render_response()
def search(request, super_category=None, conn=None, **kwargs):

    context = {'template': "webgallery/categories/search.html"}
    context['favicon'] = settings.FAVICON
    context['gallery_title'] = settings.GALLERY_TITLE
    context['gallery_heading'] = settings.GALLERY_HEADING
    context['top_right_links'] = settings.TOP_RIGHT_LINKS
    context['top_left_logo'] = settings.TOP_LEFT_LOGO
    try:
        href = context['top_left_logo'].get('href', 'webgallery_index')
        context['top_left_logo']['href'] = reverse(href)
    except NoReverseMatch:
        pass
    context['subheading_html'] = settings.SUBHEADING_HTML
    context['footer_html'] = settings.FOOTER_HTML
    context['filter_keys'] = json.dumps(settings.FILTER_KEYS)
    context['super_categories'] = settings.SUPER_CATEGORIES
    context['SUPER_CATEGORIES'] = json.dumps(settings.SUPER_CATEGORIES)
    context['TITLE_KEYS'] = json.dumps(settings.TITLE_KEYS)
    context['STUDY_SHORT_NAME'] = json.dumps(settings.STUDY_SHORT_NAME)
    context['filter_mapr_keys'] = json.dumps(
            settings.FILTER_MAPR_KEYS)
    category = settings.SUPER_CATEGORIES.get(super_category)
    if category is not None:
        label = category.get('label', context['gallery_heading'])
        title = category.get('title', label)
        context['gallery_heading'] = title
        context['super_category'] = json.dumps(category)
        context['category'] = super_category
    base_url = reverse('index')
    if settings.BASE_URL is not None:
        base_url = settings.BASE_URL
    context['base_url'] = base_url
    context['category_queries'] = json.dumps(settings.CATEGORY_QUERIES)
    return context


def _get_study_images(conn, obj_type, obj_id, limit=1, offset=0):

    query_service = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.addId(obj_id)
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(limit)
    params.theFilter.offset = wrap(offset)

    if obj_type == "project":
        query = "select i from Image as i"\
                " left outer join i.datasetLinks as dl"\
                " join dl.parent as dataset"\
                " left outer join dataset.projectLinks"\
                " as pl join pl.parent as project"\
                " where project.id = :id"

    elif obj_type == "screen":
        query = ("select i from Image as i"
                 " left outer join i.wellSamples as ws"
                 " join ws.well as well"
                 " join well.plate as pt"
                 " left outer join pt.screenLinks as sl"
                 " join sl.parent as screen"
                 " where screen.id = :id"
                 " order by well.column, well.row")

    objs = query_service.findAllByQuery(query, params, conn.SERVICE_OPTS)

    return objs


@render_response()
@login_required()
def study_images(request, obj_type, obj_id, conn=None, **kwargs):
    limit = int(request.REQUEST.get('limit', 1))
    limit = min(limit, MAX_LIMIT)
    offset = int(request.REQUEST.get('offset', 0))
    images = _get_study_images(conn, obj_type, obj_id, limit, offset)
    json_data = []
    for image in images:
        if get_encoder is not None:
            encoder = get_encoder(image.__class__)
            if encoder is not None:
                json_data.append(encoder.encode(image))
                continue
        json_data.append({'@id': image.id.val, 'Name': image.name.val})
    meta = {}
    meta['offset'] = offset
    meta['limit'] = limit
    meta['maxLimit'] = MAX_LIMIT
    # Same format as OMERO.api app
    return {'data': json_data, 'meta': meta}


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
