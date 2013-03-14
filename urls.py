from django.conf.urls.defaults import *

from omeroweb.webgallery import views

urlpatterns = patterns('django.views.generic.simple',

    # index 'home page' of the webgallery app
    url( r'^$', views.index, name='webgallery_index' )

)
