from django.http import HttpResponse
from django.shortcuts import render_to_response

from omeroweb.webclient.decorators import login_required


@login_required()
def index(request, conn=None, **kwargs):
    """
    Just a place-holder while we get started
    """

    userName = conn.getUser().getFullName()
    defaultGroup = conn.getGroupFromContext().getName()   # this is the 'default' group

    projects = conn.listProjects()      # Will be from ALL groups, owned by ALL users (as perms allow)

    return render_to_response("webgallery/index.html", {'userName': userName, 'defaultGroup': defaultGroup, 'projects': projects})
