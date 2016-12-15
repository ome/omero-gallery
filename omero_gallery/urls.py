from django.conf.urls import url, patterns

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

)
