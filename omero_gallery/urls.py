from django.conf.urls import url, patterns
from gallery_settings import SUPER_CATEGORIES

from . import views

urlpatterns = patterns(
    'django.views.generic.simple',

    # index 'home page' of the webgallery app
    url(r'^$', views.index, name='webgallery_index'),

    # group view
    url(r'show_group/(?P<group_id>[0-9]+)/$',
        views.show_group,
        name='webgallery_show_group'),

    # project view
    url(r'show_project/(?P<project_id>[0-9]+)/$',
        views.show_project,
        name='webgallery_show_project'),

    # dataset view
    url(r'show_dataset/(?P<dataset_id>[0-9]+)/$',
        views.show_dataset,
        name='webgallery_show_dataset'),
    # use the same dataset view, with a different
    # template that only shows thumbnails
    url(r'dataset_thumbs/(?P<dataset_id>[0-9]+)/$',
        views.show_dataset,
        {'template': 'webgallery/dataset_thumbs.html'},
        name='webgallery_dataset_thumbs'),

    # image view
    url(r'show_image/(?P<image_id>[0-9]+)/$',
        views.show_image, name='webgallery_show_image'),

    # IDR UI prototype
    # url(r'^idr/$', views.idr, {'idr_type': None}),
    # url(r'^idr/(?P<idr_type>[cells|tissue]+)/$', views.idr),
    url(r'^search/$', views.search, {'super_category': None}),
    # url(r'^idr/(?P<idr_type>[cells|tissue]+)/search/$', views.idr_search),

    # Temp mapr config - until mapr PR 46 is merged
    url(r'^idr/mapr/config/$', views.temp_mapr_config),

    url(r'^study_image/(?P<obj_type>[screen|project]+)/'
        r'(?P<obj_id>[0-9]+)/$',
        views.study_image, name='webgallery_study_image'),

    url(r'^study_thumbnail/(?P<obj_type>[screen|project]+)/'
        r'(?P<obj_id>[0-9]+)/$',
        views.study_thumbnail, name='webgallery_study_thumbnail'),
)

for c in SUPER_CATEGORIES:
    urlpatterns += (url(r'^%s/$' % c, views.index, {'super_category': c}),
                    url(r'^%s/search/$' % c, views.search, {'super_category':
                        c}),)
