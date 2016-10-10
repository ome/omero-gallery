from django.http import Http404

import omero
from omero.rtypes import wrap
from omeroweb.webclient.decorators import login_required, render_response


@login_required()
@render_response()
def index(request, conn=None, **kwargs):
    """
    Home page shows a list of Projects from all of our groups
    """

    myGroups = list(conn.getGroupsMemberOf())

    # Need a custom query to get 1 (random) image per Project
    queryService = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(1)

    query = "select count(obj.id) from %s as obj"

    groups = []
    for g in myGroups:
        conn.SERVICE_OPTS.setOmeroGroup(g.id)
        images = list(conn.getObjects("Image", params=params))
        if len(images) == 0:
            continue        # Don't display empty groups
        pCount = queryService.projection(
            query % 'Project', None, conn.SERVICE_OPTS)
        dCount = queryService.projection(
            query % 'Dataset', None, conn.SERVICE_OPTS)
        iCount = queryService.projection(
            query % 'Image', None, conn.SERVICE_OPTS)
        groups.append({
            'id': g.getId(),
            'name': g.getName(),
            'description': g.getDescription(),
            'projectCount': pCount[0][0]._val,
            'datasetCount': dCount[0][0]._val,
            'imageCount': iCount[0][0]._val,
            'image': len(images) > 0 and images[0] or None})

    # This is used by @render_response
    context = {'template': "webgallery/index.html"}
    context['groups'] = groups

    return context


@login_required()
@render_response()
def show_group(request, groupId, conn=None, **kwargs):
    conn.SERVICE_OPTS.setOmeroGroup(groupId)

    s = conn.groupSummary(groupId)
    group_owners = s["leaders"]
    group_members = s["colleagues"]
    group = conn.getObject("ExperimenterGroup", groupId)

    # Get NEW user_id, OR current user_id from session OR 'All Members' (-1)
    user_id = request.REQUEST.get(
        'user_id', request.session.get('user_id', -1))
    userIds = [u.id for u in group_owners]
    userIds.extend([u.id for u in group_members])
    user_id = int(user_id)
    # Check user is in group
    if user_id not in userIds and user_id is not -1:
        user_id = -1
    # save it to session
    request.session['user_id'] = int(user_id)
    request.session.modified = True

    queryService = conn.getQueryService()
    params = omero.sys.ParametersI()
    params.theFilter = omero.sys.Filter()
    params.theFilter.limit = wrap(1)
    # params.map = {}
    query = "select i from Image as i"\
            " left outer join i.datasetLinks as dl join dl.parent as dataset"\
            " left outer join dataset.projectLinks"\
            " as pl join pl.parent as project"\
            " where project.id = :pid"
    paramAll = omero.sys.ParametersI()
    countImages = "select count(i), count(distinct dataset) from Image as i"\
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
        params.addLong('pid', p.id)
        img = queryService.findByQuery(query, params, conn.SERVICE_OPTS)
        if img is None:
            continue    # Ignore projects with no images
        pdata['image'] = {'id': img.id.val, 'name': img.name.val}
        paramAll.addLong('pid', p.id)
        imageCount = queryService.projection(
            countImages, paramAll, conn.SERVICE_OPTS)
        pdata['imageCount'] = imageCount[0][0].val
        pdata['datasetCount'] = imageCount[0][1].val
        projects.append(pdata)

    query = "select i from Image as i"\
            " left outer join i.datasetLinks as dl"\
            " join dl.parent as dataset"\
            " where dataset.id = :did"
    countImages = "select count(i) from Image as i"\
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
        params.addLong('did', d.id)
        img = queryService.findByQuery(query, params, conn.SERVICE_OPTS)
        if img is None:
            continue    # ignore datasets with no images
        ddata['image'] = {'id': img.id.val, 'name': img.name.val}
        paramAll.addLong('did', d.id)
        imageCount = queryService.projection(
            countImages, paramAll, conn.SERVICE_OPTS)
        ddata['imageCount'] = imageCount[0][0].val
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
def show_project(request, projectId, conn=None, **kwargs):
    """
    Show a project
    """

    project = conn.getObject("Project", projectId)

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
def show_dataset(request, datasetId, conn=None, **kwargs):
    """
    Show a dataset
    """

    dataset = conn.getObject("Dataset", datasetId)

    if dataset is None:
        raise Http404

    context = {'template': "webgallery/show_dataset.html"}
    context['dataset'] = dataset

    return context


@login_required()
@render_response()
def show_image(request, imageId, conn=None, **kwargs):
    """
    Show an image
    """

    image = conn.getObject("Image", imageId)

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
