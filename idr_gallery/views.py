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

IDR_IMAGES = [
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/13965767/294/0/",
        "title": "idr0124 Esteban: Heart morphogenesis",
        "image_id": 13965767,
        "thumbnail": "data:image/jpeg;base64,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"
    },
    {
        "light": True,
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/13461816/0/0/?tile=3,2,4,1024,512",
        "title": "idr0096 Tratwal: Marrowquant",
        "image_id": 13461816,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/9846152/45/0/?tile=4,0,0,1024,512",
        "title": "idr0048 Abdeladim: Chroms",
        "image_id": 9846152,
    },
    {
        "light": True,
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/13383922/0/0/?region=412,1224,1536,1024",
        "title": "idr0043 Uhlen: Human Protein Atlas",
        "image_id": 13383922,
    },
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/4990991/0/0/?c=1|144:2250$0000FF,-2|972:2528$FFFFFF,3|126:3456$FF0000,4|131:2749$00FF00",
        "title": "idr0050 Springer: Cyto-skeletal systems",
        "image_id": 4990991,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/9846154/268/0/?region=1024,0,2048,1024&c=1|4283:12901$FF00FF,2|1278:8356$FFFF00",
        "title": "idr0085 Walsh: MF-HREM",
        "image_id": 9846154,
    },
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/9753804/0/0/",
        "title": "idr0056 Stojic: Long noncoding RNA",
        "image_id": 9753804,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/9836841/0/0/",
        "title": "idr0077 Valuchova: Flower lightsheet",
        "image_id": 9836841,
    },
]

CELL_IMAGES = [
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/13417268/34/0/?c=1|5000:13880$FF0000,2|10353:50528$00FF00,3|14416:36737$0000FF",
        "title": "idr0107 Morgan: HEI10",
        "image_id": 13417268,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/12570400/0/0/?c=1|91:1391$fire.lut",
        "title": "idr0093 Mueller: Genome-wide siRNA screen",
        "image_id": 12570400,
    },
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/4991918/0/0/?c=1|28:178$00FF00,3|22:110$FF0000",
        "title": "idr0050 Springer: Cyto-skeletal systems",
        "image_id": 4991918,
    },
    {
        "light": True,
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/9846137/92/0/?c=1|85:153$hilo.lut&m=c",
        "title": "idr0086 Miron: Chromatin micrographs",
        "image_id": 9846137,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/3005394/0/0/",
        "title": "idr0028 Pascual-Vargas: Rho GTPases",
        "image_id": 3005394,
    },
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/9753804/0/0/",
        "title": "idr0056 Stojic: Long noncoding RNA",
        "image_id": 9753804,
    },
    {
        "src": "https://idr.openmicroscopy.org/webclient/render_image/3231645/0/0/?c=1|464:8509$FF0000,2|518:21105$00FF00,3|519:19845$0000FF",
        "title": "idr0033 Rohban: Cell painting",
        "image_id": 3231645,
    },
]

TISSUE_IMAGES = [
    {
        "light": True,
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/13461816/0/0/?tile=3,2,4,1024,512",
        "title": "idr0096 Tratwal: Marrowquant",
        "image_id": 13461816,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/8343616/0/0/?region=2048,6072,2024,1024&c=1|0:105$red_hot.lut&m=c",
        "title": "idr0066 Voigt: Meso SPIM",
        "image_id": 8343616,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/9846152/45/0/?tile=4,0,0,1024,512",
        "title": "idr0048 Abdeladim: Chroms",
        "image_id": 9846152,
    },
    {
        "light": True,
        "src": "https://idr.openmicroscopy.org/webgateway/render_image_region/13383922/0/0/?region=412,1224,1536,1024",
        "title": "idr0043 Uhlen: Human Protein Atlas",
        "image_id": 13383922,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/9846154/268/0/?region=1024,0,2048,1024&c=1|4283:12901$FF00FF,2|1278:8356$FFFF00",
        "title": "idr0085 Walsh: MF-HREM",
        "image_id": 9846154,
    },
    {
        "src": "https://idr.openmicroscopy.org/webgateway/render_image/9836841/0/0/",
        "title": "idr0077 Valuchova: Flower lightsheet",
        "image_id": 9836841,
    }
]
# //background-position-y: 15%;

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
        context['INDEX_JSON_URL'] = settings.INDEX_JSON_URL
        context['IDR_STUDIES_URL'] = settings.IDR_STUDIES_URL
        try:
            href = context['top_left_logo'].get('href', 'webgallery_index')
            context['top_left_logo']['href'] = reverse(href)
        except NoReverseMatch:
            pass
        context['subheading_html'] = settings.SUBHEADING_HTML
        context['footer_html'] = settings.FOOTER_HTML
        context['filter_keys'] = settings.FILTER_KEYS
        context['TITLE_KEYS'] = json.dumps(settings.TITLE_KEYS)
        context['STUDY_SHORT_NAME'] = json.dumps(settings.STUDY_SHORT_NAME)
        context['filter_mapr_keys'] = json.dumps(
            settings.FILTER_MAPR_KEYS)
        context['super_categories'] = settings.SUPER_CATEGORIES
        category = settings.SUPER_CATEGORIES.get(super_category)
        if category is not None:
            category['id'] = super_category
            label = category.get('label', context['gallery_heading'])
            title = category.get('title', label)
            context['gallery_heading'] = title
            context['super_category'] = json.dumps(category)
            context['category'] = super_category
        base_url = reverse('index')
        if settings.BASE_URL is not None:
            base_url = settings.BASE_URL
        context['base_url'] = base_url
        context['gallery_index'] = reverse('webgallery_index')
        if settings.GALLERY_INDEX is not None:
            context['gallery_index'] = settings.GALLERY_INDEX
        context['category_queries'] = json.dumps(category_queries)
        context["idr_images"] = IDR_IMAGES
        if super_category == "cell":
            context["idr_images"] = CELL_IMAGES
        elif super_category == "tissue":
            context["idr_images"] = TISSUE_IMAGES
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
    context['filter_keys'] = settings.FILTER_KEYS
    context['super_categories'] = settings.SUPER_CATEGORIES
    context['SUPER_CATEGORIES'] = json.dumps(settings.SUPER_CATEGORIES)
    context['TITLE_KEYS'] = json.dumps(settings.TITLE_KEYS)
    context['STUDY_SHORT_NAME'] = json.dumps(settings.STUDY_SHORT_NAME)
    context['filter_mapr_keys'] = json.dumps(
            settings.FILTER_MAPR_KEYS)
    category = settings.SUPER_CATEGORIES.get(super_category)
    if category is not None:
        category['id'] = super_category
        label = category.get('label', context['gallery_heading'])
        title = category.get('title', label)
        context['gallery_heading'] = title
        context['super_category'] = json.dumps(category)
        context['category'] = super_category
    base_url = reverse('index')
    if settings.BASE_URL is not None:
        base_url = settings.BASE_URL
    context['base_url'] = base_url
    context['gallery_index'] = reverse('webgallery_index')
    if settings.GALLERY_INDEX is not None:
        context['gallery_index'] = settings.GALLERY_INDEX
    context['category_queries'] = json.dumps(settings.CATEGORY_QUERIES)
    return context


def _get_study_images(conn, obj_type, obj_id, limit=1, offset=0, tag_text=None):

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
                 " left outer join i.annotationLinks as al"\
                 " join al.child as annotation"\
                 " where screen.id = :id%s"
                 " order by well.column, well.row" % and_text_value)

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
            images = _get_study_images(conn, obj_type, obj_id, tag_text="Study Example Image")
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
