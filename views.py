from django.http import Http404

from omeroweb.webclient.decorators import login_required, render_response


@login_required(setGroupContext=True)
@render_response()
def index(request, conn=None, **kwargs):
    """
    Home page shows a list of Projects from our current/active group.
    Also gives us controls for switching active group.
    """

    groupId = conn.SERVICE_OPTS.getOmeroGroup()
    s = conn.groupSummary(groupId)
    group_owners = s["leaders"]
    group_members = s["colleagues"]
    # Get NEW user_id, OR current user_id from session OR id of logged-in user
    user_id = request.REQUEST.get('user_id', request.session.get('user_id', conn.getUserId()))
    userIds = [u.id for u in group_owners]
    userIds.extend([u.id for u in group_members])
    user_id = int(user_id)
    if user_id not in userIds and user_id is not -1:        # Check user is in group
        user_id = conn.getUserId()
    request.session['user_id'] = int(user_id)    # save it to session
    request.session.modified = True
    myGroups = list(conn.getGroupsMemberOf())

    if user_id == -1:
        user_id = None
    projects = conn.listProjects(eid=user_id)      # Will be from active group, owned by user_id (as perms allow)

    context = {'template': "webgallery/index.html"}     # This is used by @render_response
    context['myGroups'] = myGroups
    context['group_owners'] = group_owners
    context['group_members'] =group_members
    context['active_group_id'] = int(groupId)
    context['projects'] = projects

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

    context = {'template': "webgallery/show_project.html"}
    context['project'] = project

    return context
