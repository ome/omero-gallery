from django.http import HttpResponse
from django.shortcuts import render_to_response

from omeroweb.webclient.decorators import login_required


@login_required()
def index(request, conn=None, **kwargs):
    """
    Just a place-holder while we get started
    """

    userName = conn.getUser().getFullName()

    return render_to_response("webgallery/index.html", {'userName': userName})