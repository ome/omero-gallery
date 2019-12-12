.. image:: https://travis-ci.org/ome/omero-gallery.svg?branch=master
    :target: https://travis-ci.org/ome/omero-gallery

.. image:: https://badge.fury.io/py/omero-gallery.svg
    :target: https://badge.fury.io/py/omero-gallery

OMERO.gallery
=============

This is an OMERO.web plugin (Django app) that provides a 'gallery' view of images in OMERO, ideal for public browsing without editing.

Also see `SUPPORT.md <https://github.com/ome/omero-gallery/blob/master/SUPPORT.md>`_

Requirements
============

* OMERO 5.2.6 or newer.

Installing from PyPI
====================

This section assumes that an OMERO.web is already installed.

Install the app using `pip <https://pip.pypa.io/en/stable/>`_:

::

    $ pip install -U omero-gallery

Add gallery custom app to your installed web apps:

::

    $ bin/omero config append omero.web.apps '"omero_gallery"'

Now restart OMERO.web as normal.


**Warning**:

OMERO.gallery version 2.x or newer requires OMERO.web **5.2.6 or newer**.
This is due to a Django Framework compatibility and to a required package reorganization in OMERO.gallery in version 2.0 so the application can be distributed from Python Package Index `PyPI <https://pypi.org>`_.



OMERO.gallery overview
======================

This application supports 2 alternative views of your data in OMERO, which can
be chosen and customised via config settings:

 - Default UI (no config): Browse `Group > Project > Dataset > Image`
 - Categories UI: Show categories of interest. Allow filtering by map annotations.

For both views, public access can be enabled
`as described here <https://docs.openmicroscopy.org/latest/omero/sysadmins/public.html>`_,
otherwise users will see the standard web login screen.
Once logged-in (as a regular user or public user), the data displayed will
include all data accessible to that user via the normal OMERO permissions.


Default UI
----------

This view supports minimal functionality required for browsing the hierarchy
from Groups -> Projects -> Datasets -> Images. Screen/Plate/Well data is
not supported in this UI.

The home page will display all the available groups that the user can access, with a random
thumbnail from each group. The number of Projects, Datasets and Images within each group
will also be displayed.

.. image:: https://ome.github.io/omero-gallery/images/gallery.png


On browsing into a group, the Projects and 'orphaned' Datasets will be shown in a similar layout.

.. image:: https://ome.github.io/omero-gallery/images/show_group.png

Projects are shown with 5 thumbnails from each Dataset. Clicking 'All Images' will load all the remaining thumbnails
from a chosen Dataset (or you can browse to the Dataset itself by clicking the Dataset name link).

.. image:: https://ome.github.io/omero-gallery/images/show_project.png

Clicking a thumbnail will take you directly to the full image viewer.

.. image:: https://ome.github.io/omero-gallery/images/webgateway_viewer.png


Categories UI
-------------

This view was originally developed for use in the IDR and can be seen at
https://idr.openmicroscopy.org/. In the IDR, a "Study" is a Project or Screen
and they are annotated with Key-Value data in the form of Map Annotations,
for example ``Study Type: 3D-tracking``.
The UI supports several features based on these Key-Value attributes:

 - Home page shows 'Categories' that are defined by queries on Map Annotations.
 - Filter studies by Map Annotations.

If Images are also annotated with Map Annotations and
https://github.com/ome/omero-mapr/ is installed then you can:

 - Find Studies containing Images that match queries on their Map Annotations.


Configuring the Categories UI
-----------------------------

*omero.web.gallery.category_queries*

To enable the Categories UI, you must set ``omero.web.gallery.category_queries``.
Each Category is defined by a display ``label``, a ``query`` to select the Projects
and Screens and an ``index`` to specify the order they appear on the page.
Most of the examples below are used in the IDR. You can view the Categories
at https://idr.openmicroscopy.org/ and see the query for each as a tooltip on
the label of each category.

In the simplest case, if you do not have Map Annotations on Studies (Projects and
Screens), you can simply sort by Name or creation Date. This example defines
2 Categories: "All Studies" to show the first 50 studies by Name and
"Recent" to list the last 20 studies by Date (most recent)::

    $ omero config set omero.web.gallery.category_queries '{ \
      "all":{"label":"All Studies", "index":0, "query":"FIRST50:Name"}, \
      "recent":{"label":"Recent", "index":1, "query":"LAST20:Date"}, \
      }'

Other categories are defined by queries on Map Annotations. For example, to
show all Studies that have Key:Value of ``Study Type: 3D-tracking``::

    $ omero config set omero.web.gallery.category_queries '{ \
      "tracking":{"label":"3D tracking", "index":0, "query":"Study Type: 3D-tracking"}, \
      }'

Queries can use the ``AND`` and ``OR`` keywords to combine queries::

    $ omero config set omero.web.gallery.category_queries '{ \
      "time":{"label":"Time-lapse imaging", "index":0, "query":"Study Type: 3D-tracking OR Study Type: time"}, \
      "screens":{"label":"High-content screening (human)", "index":1, "query":"Organism:Homo sapiens AND Study Type:high content screen"}, \
      }'


License
-------

OMERO.gallery is released under the AGPL.

Copyright
---------

2016-2017, The Open Microscopy Environment

