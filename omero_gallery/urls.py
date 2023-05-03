from django.urls import re_path
from .gallery_settings import SUPER_CATEGORIES

from . import views

urlpatterns = [
    # index 'home page' of the webgallery app
    re_path(r'^$', views.index, name='webgallery_index'),

    # All settings as JSON
    re_path(r'^gallery_settings/$', views.gallery_settings),

    # group view
    re_path(r'show_group/(?P<group_id>[0-9]+)/$',
            views.show_group,
            name='webgallery_show_group'),

    # project view
    re_path(r'show_project/(?P<project_id>[0-9]+)/$',
            views.show_project,
            name='webgallery_show_project'),

    # dataset view
    re_path(r'show_dataset/(?P<dataset_id>[0-9]+)/$',
            views.show_dataset,
            name='webgallery_show_dataset'),
    # use the same dataset view, with a different
    # template that only shows thumbnails
    re_path(r'dataset_thumbs/(?P<dataset_id>[0-9]+)/$',
            views.show_dataset,
            {'template': 'webgallery/dataset_thumbs.html'},
            name='webgallery_dataset_thumbs'),

    # image view
    re_path(r'show_image/(?P<image_id>[0-9]+)/$',
            views.show_image, name='webgallery_show_image'),

    # Search page shows Projects / Screens filtered by Map Annotation
    re_path(r'^search/$', views.search, {'super_category': None}),

    # list images within container. NB: not used but potentially useful
    re_path(r'^gallery-api/(?P<obj_type>[screen|project]+)s/'
            r'(?P<obj_id>[0-9]+)/images/$',
            views.study_images, name='webgallery_study_image'),

    # Supports e.g. ?project=1&project=2&screen=3
    re_path(r'^gallery-api/thumbnails/$', views.api_thumbnails,
            name='webgallery_api_thumbnails'),
]

for c in SUPER_CATEGORIES:
    urlpatterns.append(re_path(r'^%s/$' % c, views.index,
                               {'super_category': c},
                               name="gallery_super_category"))
    urlpatterns.append(re_path(r'^%s/search/$' % c, views.search,
                               {'super_category': c}))
