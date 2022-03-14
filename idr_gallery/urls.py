from django.conf.urls import url
from .gallery_settings import SUPER_CATEGORIES

from . import views

urlpatterns = [
    # index 'home page' of the idr_gallery app
    url(r'^$', views.index, name='idr_gallery_index'),

    # All settings as JSON
    url(r'^gallery_settings/$', views.gallery_settings),

    # group view
    url(r'show_group/(?P<group_id>[0-9]+)/$',
        views.show_group,
        name='idr_gallery_show_group'),

    # project view
    url(r'show_project/(?P<project_id>[0-9]+)/$',
        views.show_project,
        name='idr_gallery_show_project'),

    # dataset view
    url(r'show_dataset/(?P<dataset_id>[0-9]+)/$',
        views.show_dataset,
        name='idr_gallery_show_dataset'),
    # use the same dataset view, with a different
    # template that only shows thumbnails
    url(r'dataset_thumbs/(?P<dataset_id>[0-9]+)/$',
        views.show_dataset,
        {'template': 'idr_gallery/dataset_thumbs.html'},
        name='idr_gallery_dataset_thumbs'),

    # image view
    url(r'show_image/(?P<image_id>[0-9]+)/$',
        views.show_image, name='idr_gallery_show_image'),

    # Search page shows Projects / Screens filtered by Map Annotation
    url(r'^search/$', views.search, {'super_category': None}),

    # list images within container. NB: not used but potentially useful
    url(r'^gallery-api/(?P<obj_type>[screen|project]+)s/'
        r'(?P<obj_id>[0-9]+)/images/$',
        views.study_images, name='idr_gallery_study_image'),

    # Supports e.g. ?project=1&project=2&screen=3
    url(r'^gallery-api/thumbnails/$', views.api_thumbnails,
        name='idr_gallery_api_thumbnails'),
]

for c in SUPER_CATEGORIES:
    urlpatterns.append(url(r'^%s/$' % c, views.index, {'super_category': c},
                           name="gallery_super_category"))
    urlpatterns.append(url(r'^%s/search/$' % c, views.search,
                           {'super_category': c}))
