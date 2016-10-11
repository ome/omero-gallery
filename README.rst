.. image:: https://travis-ci.org/ome/omero-gallery.svg?branch=master
    :target: https://travis-ci.org/ome/omero-gallery

.. image:: https://badge.fury.io/py/omero-gallery.svg
    :target: https://badge.fury.io/py/omero-gallery

OMERO.gallery
=============

This is an OMERO.web plugin (Django app) that provides a 'gallery' view of images in OMERO, ideal for public browsing without editing.


Installation
============

Install OMERO.web

This app installs into the OMERO.web framework.

::

    $ pip install omero-gallery

Add gallery custom app to your installed web apps:

::

    $ bin/omero config append omero.web.apps '"omero_gallery"'

Now restart OMERO.web as normal.


And you're done! Go to https://your-web-server/gallery



OMERO.gallery overview
======================

This application is designed to support browsing of images via the hierarchy of
Group > Project > Dataset > Image.

Public access can be enabled [as described here]
(http://www.openmicroscopy.org/site/support/omero5/developers/Web/PublicData.html), otherwise
users will see the standard web login screen.

The home page will display all the available groups that the user can access, with a random
thumbnail from each group. The number of Projects, Datasets and Images within each group
will also be displayed.

.. image:: http://ome.github.io/omero-gallery/images/gallery.png


On browsing into a group, the Projects and 'orphaned' Datasets will be shown in a similar layout.

.. image:: http://ome.github.io/omero-gallery/images/show_group.png

Projects are shown with 5 thumbnails from each Dataset. Clicking 'All Images' will load all the remaining thumbnails
from a chosen Dataset (or you can browse to the Dataset itself by clicking the Dataset name link).

.. image:: http://ome.github.io/omero-gallery/images/show_project.png

Clicking a thumbnail will take you directly to the full image viewer.

.. image:: http://ome.github.io/omero-gallery/images/webgateway_viewer.png

License
-------

OMERO.gallery is released under the AGPL.

Copyright
---------

2016, The Open Microscopy Environment

