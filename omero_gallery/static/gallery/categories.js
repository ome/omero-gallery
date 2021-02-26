"use strict";

//   Copyright (C) 2019-2020 University of Dundee & Open Microscopy Environment.
//   All rights reserved.
//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU Affero General Public License as
//   published by the Free Software Foundation, either version 3 of the
//   License, or (at your option) any later version.
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU Affero General Public License for more details.
//   You should have received a copy of the GNU Affero General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>.
// NB: SOURCE FILES are under /src. Compiled files are under /static/
// loaded below
var mapr_settings = {}; // Model for loading Projects, Screens and their Map Annotations

var model = new StudiesModel(); // ----- event handling --------

document.getElementById('maprConfig').onchange = function (event) {
  document.getElementById('maprQuery').value = '';
  var value = event.target.value.replace('mapr_', '');
  var placeholder = "Type to filter values...";

  if (mapr_settings[value]) {
    placeholder = "Type ".concat(mapr_settings[value]['default'][0], "...");
  }

  document.getElementById('maprQuery').placeholder = placeholder; // Show all autocomplete options...

  $("#maprQuery").focus();
  render();
};

document.getElementById('maprQuery').onfocus = function (event) {
  $("#maprQuery").autocomplete("search", event.target.value);
}; // ------ AUTO-COMPLETE -------------------


function showSpinner() {
  document.getElementById('spinner').style.visibility = 'visible';
}

function hideSpinner() {
  document.getElementById('spinner').style.visibility = 'hidden';
}

$("#maprQuery").keyup(function (event) {
  if (event.which == 13) {
    var configId = document.getElementById("maprConfig").value;
    document.location.href = "search/?query=".concat(configId, ":").concat(event.target.value);
  }
}).autocomplete({
  autoFocus: false,
  delay: 1000,
  source: function source(request, response) {
    // if configId is not from mapr, we filter on mapValues...
    var configId = document.getElementById("maprConfig").value;

    if (configId.indexOf('mapr_') != 0) {
      var matches;

      if (configId === 'Name') {
        matches = model.getStudiesNames(request.term);
      } else if (configId === 'Group') {
        matches = model.getStudiesGroups(request.term);
      } else {
        matches = model.getKeyValueAutoComplete(configId, request.term);
      }

      response(matches);
      return;
    } // Don't handle empty query for mapr


    if (request.term.length == 0) {
      return;
    } // Auto-complete to filter by mapr...


    configId = configId.replace('mapr_', '');
    var case_sensitive = false;
    var requestData = {
      case_sensitive: case_sensitive
    };
    var url;

    if (request.term.length === 0) {
      // Try to list all top-level values.
      // This works for 'wild-card' configs where number of values is small e.g. Organism
      // But will return empty list for e.g. Gene
      url = "".concat(BASE_URL, "mapr/api/").concat(configId, "/");
      requestData.orphaned = true;
    } else {
      // Find auto-complete matches
      url = "".concat(BASE_URL, "mapr/api/autocomplete/").concat(configId, "/");
      requestData.value = case_sensitive ? request.term : request.term.toLowerCase();
      requestData.query = true; // use a 'like' HQL query
    }

    showSpinner();
    $.ajax({
      dataType: "json",
      type: 'GET',
      url: url,
      data: requestData,
      success: function success(data) {
        hideSpinner();

        if (request.term.length === 0) {
          // Top-level terms in 'maps'
          if (data.maps && data.maps.length > 0) {
            var terms = data.maps.map(function (m) {
              return m.id;
            });
            terms.sort();
            response(terms);
          }
        } else if (data.length > 0) {
          response($.map(data, function (item) {
            return item;
          }));
        } else {
          response([{
            label: 'No results found.',
            value: -1
          }]);
        }
      },
      error: function error(data) {
        hideSpinner();
        response([{
          label: 'Error occured.',
          value: -1
        }]);
      }
    });
  },
  minLength: 0,
  open: function open() {},
  close: function close() {
    // $(this).val('');
    return false;
  },
  focus: function focus(event, ui) {},
  select: function select(event, ui) {
    if (ui.item.value == -1) {
      // Ignore 'No results found'
      return false;
    } // show temp message in case loading search page is slow


    $(this).val("loading search results..."); // Load search page...

    var configId = document.getElementById("maprConfig").value;
    document.location.href = "search/?query=".concat(configId, ":").concat(ui.item.value);
    return false;
  }
}).data("ui-autocomplete")._renderItem = function (ul, item) {
  return $("<li>").append("<a>" + item.label + "</a>").appendTo(ul);
}; // ------------ Render -------------------------


function render() {
  document.getElementById('studies').innerHTML = "";
  var categories = Object.keys(CATEGORY_QUERIES); // Sort by index

  categories.sort(function (a, b) {
    var idxA = CATEGORY_QUERIES[a].index;
    var idxB = CATEGORY_QUERIES[b].index;
    return idxA > idxB ? 1 : idxA < idxB ? -1 : 0;
  }); // Link to the study in webclient...

  var linkFunc = function linkFunc(studyData) {
    var type = studyData['@type'].split('#')[1].toLowerCase();
    return "".concat(BASE_URL, "webclient/?show=").concat(type, "-").concat(studyData['@id']);
  };

  categories.forEach(function (category) {
    var cat = CATEGORY_QUERIES[category];
    var query = cat.query; // Find matching studies

    var matches = model.filterStudiesByMapQuery(query);
    if (matches.length == 0) return;
    var elementId = cat.label;
    var div = document.createElement("div"); // If only ONE category...

    if (categories.length == 1) {
      // list studies in a grid, without category.label
      div.innerHTML = "<div id=\"".concat(elementId, "\" class=\"row horizontal studiesLayout\"></div>");
      div.className = "row";
    } else {
      div.innerHTML = "\n        <h1 title=\"".concat(query, "\" style=\"margin-left:10px\">\n          ").concat(cat.label, " (").concat(matches.length, ")\n        </h1>\n        <div class=\"category\">\n          <div id=\"").concat(elementId, "\"></div>\n        </div>\n      ");
    }

    document.getElementById('studies').appendChild(div);
    matches.forEach(function (study) {
      return renderStudy(study, elementId, linkFunc);
    });
  }); // Now we iterate all Studies in DOM, loading image ID for link and thumbnail

  loadStudyThumbnails();
}

function renderStudy(studyData, elementId, linkFunc) {
  // Add Project or Screen to the page
  var title;

  for (var i = 0; i < TITLE_KEYS.length; i++) {
    title = model.getStudyValue(studyData, TITLE_KEYS[i]);

    if (title) {
      break;
    }
  }

  if (!title) {
    title = studyData.Name;
  }

  var type = studyData['@type'].split('#')[1].toLowerCase();
  var studyLink = linkFunc(studyData); // save for later

  studyData.title = title;
  var desc = studyData.Description;
  var studyDesc;

  if (desc) {
    // If description contains title, use the text that follows
    if (title.length > 0 && desc.indexOf(title) > -1) {
      desc = desc.split(title)[1];
    } // Remove blank lines (and first 'Experiment Description' line)


    studyDesc = desc.split('\n').filter(function (l) {
      return l.length > 0;
    }).filter(function (l) {
      return l !== 'Experiment Description' && l !== 'Screen Description';
    }).join('\n');

    if (studyDesc.indexOf('Version History') > 1) {
      studyDesc = studyDesc.split('Version History')[0];
    }
  }

  var shortName = getStudyShortName(studyData);
  var authors = model.getStudyValue(studyData, "Publication Authors") || ""; // Function (and template) are defined where used in index.html

  var html = studyHtml({
    studyLink: studyLink,
    studyDesc: studyDesc,
    shortName: shortName,
    title: title,
    authors: authors,
    BASE_URL: BASE_URL,
    type: type
  }, studyData);
  var div = document.createElement("div");
  div.innerHTML = html;
  div.className = "row study ";
  div.dataset.obj_type = type;
  div.dataset.obj_id = studyData['@id'];
  document.getElementById(elementId).appendChild(div);
} // --------- Render utils -----------


function studyHtml(props, studyData) {
  var pubmed = model.getStudyValue(studyData, 'PubMed ID');

  if (pubmed) {
    pubmed = pubmed.split(" ")[1];
  }

  ;
  var author = props.authors.split(',')[0] || '';

  if (author) {
    author = "".concat(author, " et al.");
    author = author.length > 23 ? author.slice(0, 20) + '...' : author;
  }

  return "\n  <div style='white-space:nowrap'>\n    ".concat(props.shortName, "\n    ").concat(pubmed ? "<a class='pubmed' target=\"_blank\" href=\"".concat(pubmed, "\"> ").concat(author, "</a>") : author, "\n  </div>\n  <div class=\"studyImage\">\n    <a target=\"_blank\" href=\"").concat(props.studyLink, "\">\n      <div style=\"height: 100%; width: 100%\">\n        <div class=\"studyText\">\n          <p title='").concat(props.studyDesc || '', "'>\n            ").concat(props.title, "\n          </p>\n        </div>\n        <div class=\"studyAuthors\">\n          ").concat(props.authors, "\n        </div>\n      </div>\n    </a>\n    <a class=\"viewerLink\" title=\"Open image in viewer\" target=\"_blank\"\n       href=\"\">\n      <i class=\"fas fa-eye\"></i>\n    </a>\n  </div>\n  ");
}

function loadStudyThumbnails() {
  var ids = []; // Collect study IDs 'project-1', 'screen-2' etc

  $('div.study').each(function () {
    var obj_id = $(this).attr('data-obj_id');
    var obj_type = $(this).attr('data-obj_type');

    if (obj_id && obj_type) {
      ids.push(obj_type + '-' + obj_id);
    }
  }); // Load images

  model.loadStudiesThumbnails(ids, function (data) {
    // data is e.g. { project-1: {thumbnail: base64data, image: {id:1}} }
    for (var id in data) {
      var obj_type = id.split('-')[0];
      var obj_id = id.split('-')[1];
      var elements = document.querySelectorAll("div[data-obj_type=\"".concat(obj_type, "\"][data-obj_id=\"").concat(obj_id, "\"]"));

      for (var e = 0; e < elements.length; e++) {
        // Find all studies matching the study ID and set src on image
        var element = elements[e];
        var studyImage = element.querySelector('.studyImage');
        studyImage.style.backgroundImage = "url(".concat(data[id].thumbnail, ")"); // viewer link

        var iid = data[id].image.id;
        var link = "".concat(BASE_URL, "webclient/img_detail/").concat(iid, "/");
        element.querySelector('a.viewerLink').href = link;
      }
    }
  });
}

function renderStudyKeys() {
  if (FILTER_KEYS.length > 0) {
    var html = FILTER_KEYS.map(function (key) {
      if (key.label && key.value) {
        return "<option value=\"".concat(key.value, "\">").concat(key.label, "</option>");
      }

      return "<option value=\"".concat(key, "\">").concat(key, "</option>");
    }).join("\n");
    document.getElementById('studyKeys').innerHTML = html; // Show the <optgroup> and the whole form

    document.getElementById('studyKeys').style.display = 'block';
    document.getElementById('search-form').style.display = 'block';
  }
}

renderStudyKeys(); // ----------- Load / Filter Studies --------------------
// Do the loading and render() when done...

model.loadStudies(function () {
  // Immediately filter by Super category
  if (SUPER_CATEGORY && SUPER_CATEGORY.query) {
    model.studies = model.filterStudiesByMapQuery(SUPER_CATEGORY.query);
  }

  render();
}); // Load MAPR config

fetch(BASE_URL + 'mapr/api/config/').then(function (response) {
  return response.json();
}).then(function (data) {
  mapr_settings = data;
  var options = FILTER_MAPR_KEYS.map(function (key) {
    var config = mapr_settings[key];

    if (config) {
      return "<option value=\"mapr_".concat(key, "\">").concat(config.label, "</option>");
    } else {
      return "";
    }
  });

  if (options.length > 0) {
    document.getElementById('maprKeys').innerHTML = options.join("\n"); // Show the <optgroup> and the whole form

    document.getElementById('maprKeys').style.display = 'block';
    document.getElementById('search-form').style.display = 'block';
  }
})["catch"](function (err) {
  console.log("mapr not installed (config not available)");
});