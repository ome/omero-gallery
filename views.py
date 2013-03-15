from django.http import HttpResponse

from omeroweb.webclient.decorators import login_required, render_response


@login_required()
@render_response()
def index(request, conn=None, **kwargs):
    """
    Just a place-holder while we get started
    """

    defaultGroup = conn.getGroupFromContext().getName()   # this is the 'default' group

    projects = conn.listProjects()      # Will be from ALL groups, owned by ALL users (as perms allow)

    context = {'template': "webgallery/index.html"}     # This is used by @render_response
    context['defaultGroup'] = defaultGroup
    context['projects'] = projects

    return context
