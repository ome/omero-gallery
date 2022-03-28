#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Copyright (C) 2019 University of Dundee & Open Microscopy Environment.
# All rights reserved.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

"""Settings for the idr_gallery app."""

import sys
from omeroweb.settings import process_custom_settings, \
  report_settings, str_slash
import json

# load settings
GALLERY_SETTINGS_MAPPING = {

    "omero.web.gallery.base_url":
        ["BASE_URL",
         None,
         str_slash,
         ("Base URL to use for non-gallery JSON AJAX requests."
          " e.g. 'https://idr.openmicroscopy.org/'."
          " This allows data to be loaded from another OMERO server."
          " The default behaviour is to use the current server.")],

    "omero.web.gallery.gallery_index":
        ["GALLERY_INDEX",
         None,
         str_slash,
         ("Base gallery URL to use for gallery JSON AJAX requests."
          " e.g. 'https://idr.openmicroscopy.org/' is gallery index on IDR."
          " This allows data to be loaded from another OMERO server, e.g. run"
          " locally or on test server, but load data from IDR."
          " Default behaviour is to use current server idr_gallery_index")],

    "omero.web.gallery.category_queries":
        ["CATEGORY_QUERIES",
         ('{"others":{ "label": "Others", "query": "LAST200:date", "index": '
          '10 },"lightsheet":{"label":"Light-sheet imaging","index":0,'
          '"query":'
          '"Imaging Method:light sheet fluorescence microscopy OR '
          'Imaging Method:light sheet fluorescence microscopy, SPIM"},'
          '"infection":{"label":'
          '"Infection studies","index":1,"query":"Study Type:infection"},'
          '"timelapse":{"label":"Time-lapse imaging","index":2,"query":'
          '"Study Type:time OR Study Type:5D OR Study Type:3D-tracking"}'
          ',"lightsheet":{"label":"Light sheet fluorescence microscopy",'
          '"index":3,"query":"Imaging Method: light sheet fluorescence '
          'microscopy OR Imaging Method:'
          'light sheet fluorescence microscopy, SPIM"},"proteinlocalization":'
          '{"label":"Protein localization studies","index":4,"query":'
          '"Study Type:protein localization"},"histology":{"label":'
          '"Digital pathology imaging","index":5,"query":"Study Type:'
          'histology"},"yeast":{"label":"Yeast studies"'
          ',"index":6,"query":"Organism: Saccharomyces cerevisiae OR Organism:'
          'Schizosaccharomyces pombe"},"humancellscreen":{"label":'
          '"High-content screening (human)","index":7,"query":"Organism:'
          'Homo sapiens AND Study Type:high content screen"}}'),
         json.loads,
         ("If this is configured then the gallery Home Page shows a list"
          " of categories containing Projects and Screens that match the"
          " relevant query. Each category is defined by"
          " 'id': {'label':'Cool data', 'query': 'Key:Value', 'index': 0}"
          " Query is by Key:Value on Map Annotations linked"
          " to Projects and Screens, e.g. 'Study Type:light sheet'"
          " OR e.g. 'FIRST5:Name' or 'LAST10:date"
          " to sort by Name or date.")],

    "omero.web.gallery.filter_keys":
        ["FILTER_KEYS",
         ('[{"label": "Name (IDR number)", "value": "Name" }, '
          '"Imaging Method", "License", "Organism", "Publication Authors", '
          '"Publication Title", "Screen Technology Type", "Screen Type",'
          '"Study Type"]'),
         json.loads,
         ("If this is configured then we allow filtering of Screens and"
          " Projects by Key:Value pairs linked to them. This list allows us"
          " to specify which Keys the user can choose in the UI."
          " Each item is simple string or object with 'label' and 'value'")],

    "omero.web.gallery.filter_mapr_keys":
        ["FILTER_MAPR_KEYS",
         ('["antibody","cellline","compound","gene","phenotype","sirna"]'),
         json.loads,
         ("If this is configured then we allow filtering of Screens and"
          " Projects by OMERO.mapr. This is a list of mapr_config IDs, such"
          " as 'gene', 'antibody' etc. which allows us"
          " to specify which Keys the user can choose in the UI.")],

    "omero.web.gallery.title_keys":
        ["TITLE_KEYS",
         ('["Publication Title", "Study Title"]'),
         json.loads,
         ("Supports lookup of a Title for Screens and Projects using"
          " Map Annotations on those objects and the specified Key(s)."
          " Each Key in this list will be checked in turn until a"
          " Value is found")],

    "omero.web.gallery.super_categories":
        ["SUPER_CATEGORIES",
         ('{"cell": {"label": "Cell - IDR","title": "Welcome to Cell-IDR",'
          '"query": "Sample Type:cell"},"tissue": {"label": "Tissue - IDR",'
          '"title": "Welcome to Tissue-IDR","query": "Sample Type:tissue"}}'),
         json.loads,
         ("Optional config to provide top-level categories, similar to"
          " category_queries, using the same config format and 'query' syntax."
          " Each will create a landing page /:id/ that will filter Projects"
          " and Screens by the query. Optional 'title' for each category"
          " can be used for page title, otherwise the 'label' is used.")],

    "omero.web.gallery.title":
        ["GALLERY_TITLE", "IDR: Image Data Resource", str,
         "Page <title> for gallery, shown when category_queries is set."],

    "omero.web.gallery.top_right_links":
        ["TOP_RIGHT_LINKS",
         ('[{"text":"About","href":"https://idr.openmicroscopy.org/about/'
          'index.html","submenu":[{"text":"Overview","href":"https://idr.'
          'openmicroscopy.org/about/index.html"},{"text":"Published studies"'
          ',"href":"https://idr.openmicroscopy.org/about/studies.html"},'
          '{"text":"Linked resources","href":"https://idr.openmicroscopy.org'
          '/about/linked-resources.html"},{"text":"API Access","href":'
          '"https://idr.openmicroscopy.org/about/api.html"},{"text":"Data '
          'download","href":"https://idr.openmicroscopy.org/about/download.'
          'html"},{"text":"Image Tools Resource (ITR)","href":"https://idr.'
          'openmicroscopy.org/about/itr.html"},{"text":"Analysis Environments"'
          ',"href":"https://idr.openmicroscopy.org/about/analysis-environments'
          '.html"},{"text":"Deployment","href":"https://idr.openmicroscopy.org'
          '/about/deployment.html"},{"text":"FAQ","href":"https://idr.open'
          'microscopy.org/about/faq/"}]},{"text":"Submissions","href":'
          '"https://idr.openmicroscopy.org/about/submission.html","submenu":'
          '[{"text":"Overview","href":"https://idr.openmicroscopy.org/about/'
          'submission.html"},{"text":"Screens","href":"https://idr.'
          'openmicroscopy.org/about/screens.html"},{"text":"Experiments",'
          '"href":"https://idr.openmicroscopy.org/about/experiments.html"'
          '}]}]'),
         json.loads,
         ("List of {'text':'Text','href':'www.url'} links for top-right of"
          " page. If a link contains 'submenu':[ ] with more links,"
          " these will be shown in a dropdown menu")],

    "omero.web.gallery.top_left_logo":
        ["TOP_LEFT_LOGO",
         ('{"src": "https://idr.openmicroscopy.org/about/img/logos/logo-idr'
          '.svg","href": "/"}'),
         json.loads,
         ("Logo image and link. e.g."
          " {'src':'url.png','href':'www.url', 'alt':'Image alt text'}"
          " href can be URL name for reverse(url_name). If href is omitted,"
          " it will default to 'idr_gallery_index'")],

    "omero.web.gallery.favicon":
        ["FAVICON",
         ("https://idr.openmicroscopy.org/about/img/logos/favicon-idr.ico"),
         str,
         ("URL to favicon.")],

    "omero.web.gallery.study_short_name":
        ["STUDY_SHORT_NAME",
         ('[{"key": "Name", "regex": "^(.*?)-.*?(.)$", "template": "$1$2"}]'),
         json.loads,
         ("Gets a short name for Screen or Project to show above the"
          " study Image in the search page, instead of"
          " the default 'Project: 123'. The list allows us"
          " to try multiple methods, using the first that works. Each object"
          " in the list has e.g. {'key': 'Name'}. The 'key' can be Name,"
          " Description or the key for a Key:Value pair on the object."
          " If a 'regex' and 'template' are specified, we try"
          " name.replace(regex, template).")],

    "omero.web.gallery.idr_studies_url":
        ["IDR_STUDIES_URL",
         'https://raw.githubusercontent.com/IDR/idr.openmicroscopy.org/master'
         '/_data/studies.tsv',
         str,
         "URL to IDR studies as a tsv table"],

}

process_custom_settings(sys.modules[__name__], 'GALLERY_SETTINGS_MAPPING')
report_settings(sys.modules[__name__])
