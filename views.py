from django.http import HttpResponse
from django.shortcuts import render_to_response


def index(request):
    """
    Just a place-holder while we get started
    """

    return render_to_response("webgallery/index.html", {})