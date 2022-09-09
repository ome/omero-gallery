from django.conf.urls import url
from .gallery_settings import SUPER_CATEGORIES

from . import views

urlpatterns = [
    # index 'home page' of the idr_gallery app
    url(r'^$', views.index, name='idr_gallery_index'),

    # All settings as JSON
    url(r'^gallery_settings/$', views.gallery_settings),

    # Search page shows Projects / Screens filtered by Map Annotation
    url(r'^search/$', views.index, {'super_category': None},
        name="idr_gallery_search"),

    # Supports e.g. ?project=1&project=2&screen=3
    url(r'^gallery-api/thumbnails/$', views.api_thumbnails,
        name='idr_gallery_api_thumbnails'),
]

for c in SUPER_CATEGORIES:
    urlpatterns.append(url(r'^%s/$' % c, views.index, {'super_category': c},
                           name="gallery_super_category"))
    urlpatterns.append(url(r'^%s/search/$' % c, views.index,
                           {'super_category': c}))
