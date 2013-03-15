from django.http import HttpResponse

from omeroweb.webclient.decorators import login_required, render_response


@login_required(setGroupContext=True)
@render_response()
def index(request, conn=None, **kwargs):
    """
    Just a place-holder while we get started
    """

    groupId = conn.SERVICE_OPTS.getOmeroGroup()
    active_group = conn.getObject("ExperimenterGroup", groupId).getName()

    projects = conn.listProjects()      # Will be from active group, owned by ALL users (as perms allow)

    context = {'template': "webgallery/index.html"}     # This is used by @render_response
    context['active_group'] = active_group
    context['projects'] = projects

    return context
