.. image:: https://travis-ci.org/ome/omero-gallery.svg?branch=master
    :target: https://travis-ci.org/ome/omero-gallery

.. image:: https://badge.fury.io/py/omero-gallery.svg
    :target: https://badge.fury.io/py/omero-gallery

OMERO.gallery
=============

This is an OMERO.web plugin (Django app) that provides a 'gallery' view of images in OMERO, ideal for public browsing without editing.

Requirements
============

* OMERO 5.2.6 or newer.

Installing from PyPI
====================

This section assumes that an OMERO.web is already installed.

Install the app using `pip <https://pip.pypa.io/en/stable/>`_:

::

    $ pip install omero-gallery

Add gallery custom app to your installed web apps:

::

    $ bin/omero config append omero.web.apps '"omero_gallery"'

Now restart OMERO.web as normal.


**Warning**:

OMERO.gallery version 2.x or newer requires OMERO.web **5.2.6 or newer**.
This is due to a Django Framework compatibility and to a required package reorganization in OMERO.gallery in version 2.0 so the application can be distributed from Python Package Index `PyPI <https://pypi.python.org/pypi>`_.



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

2016-2017, The Open Microscopy Environment

