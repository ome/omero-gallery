from django.http import HttpResponse

from omeroweb.webclient.decorators import login_required, render_response


@login_required(setGroupContext=True)
@render_response()
def index(request, conn=None, **kwargs):
    """
    Home page shows a list of Projects from our current/active group.
    Also gives us controls for switching active group.
    """

    groupId = conn.SERVICE_OPTS.getOmeroGroup()
    myGroups = list(conn.getGroupsMemberOf())

    projects = conn.listProjects()      # Will be from active group, owned by ALL users (as perms allow)

    context = {'template': "webgallery/index.html"}     # This is used by @render_response
    context['myGroups'] = myGroups
    context['active_group_id'] = groupId
    context['projects'] = projects

    return context
