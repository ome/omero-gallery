"use strict";

// Model for loading Projects, Screens and their Map Annotations
var model = new StudiesModel();
var mapr_settings;

function renderStudyKeys() {
  var html = FILTER_KEYS.map(function (key) {
    if (key.label && key.value) {
      return "<option value=\"".concat(key.value, "\">").concat(key.label, "</option>");
    }

    return "<option value=\"".concat(key, "\">").concat(key, "</option>");
  }).join("\n");
  document.getElementById('studyKeys').innerHTML = html;
}

renderStudyKeys(); // FIRST, populate forms from query string

function populateInputsFromSearch() {
  var search = window.location.search.substr(1);
  var query = '';
  var searchParams = search.split('&');

  for (var i = 0; i < searchParams.length; i++) {
    var paramSplit = searchParams[i].split('=');

    if (paramSplit[0] === 'query') {
      query = paramSplit[1].replace(/%20/g, " ");
    }
  }

  if (query) {
    var splitIndex = query.indexOf(':');
    var configId = query.slice(0, splitIndex);
    var value = query.slice(splitIndex + 1);

    if (configId && value) {
      document.getElementById("maprConfig").value = configId;
      document.getElementById("maprQuery").value = value;
      var key = configId.replace('mapr_', '');
      var placeholder = key;

      if (mapr_settings && mapr_settings[key]) {
        placeholder = mapr_settings[key].all.join(", ");
      }

      document.getElementById('maprQuery').placeholder = placeholder;
    }
  }
}

populateInputsFromSearch(); // ------------ Handle MAPR searching or filtering --------------------- 

function filterStudiesByMapr(value) {
  $('#studies').removeClass('studiesLayout');
  var configId = document.getElementById("maprConfig").value.replace("mapr_", "");
  document.getElementById('studies').innerHTML = "";
  var key = mapr_settings[value] ? mapr_settings[value].all.join(" or ") : value;
  showFilterSpinner("Finding images with ".concat(configId, ": ").concat(value, "...")); // First, get all terms that match (NOT case_sensitive)
  // /mapr/api/gene/?value=TOP2&case_sensitive=false&orphaned=true

  var url = "".concat(BASE_URL, "mapr/api/").concat(configId, "/?value=").concat(value, "&case_sensitive=false&orphaned=true");
  $.getJSON(url, function (data) {
    renderMaprMessage(data.maps);
    data.maps.forEach(function (termData) {
      var term = termData.id;
      renderMaprResults(term);
    });
  });
}

function renderMaprMessage(mapsData) {
  var studyCount = mapsData.reduce(function (count, data) {
    return count + data.childCount;
  }, 0);
  var imageCount = mapsData.reduce(function (count, data) {
    return count + data.extra.counter;
  }, 0);
  var terms = mapsData.map(function (d) {
    return d.id;
  }).join('/');
  var filterMessage = "";

  if (mapsData.length === 0) {
    filterMessage = noStudiesMessage();
  } else {
    var configId = document.getElementById("maprConfig").value.replace('mapr_', '');
    var key = configId;

    if (mapr_settings && mapr_settings[configId]) {
      key = mapr_settings[key].label;
    }

    filterMessage = "<p class=\"filterMessage\">\n      Found <strong>".concat(imageCount, "</strong> images with\n      <strong>").concat(key, "</strong>: <strong>").concat(terms, "</strong>\n      in <strong>").concat(studyCount, "</strong> stud").concat(studyCount == 1 ? 'y' : 'ies', "</strong></p>");
  }

  document.getElementById('filterCount').innerHTML = filterMessage;
}

function renderMaprResults(term) {
  var configId = document.getElementById("maprConfig").value.replace("mapr_", "");
  var elementId = 'maprResultsTable' + term;
  var html = "\n    <h2>".concat(term, "</h2>\n    <table class='maprResultsTable' style='margin-top:20px'>\n      <tbody data-id='").concat(elementId, "'>\n        <tr>\n          <th>Study ID</th>\n          <th>Organism</th>\n          <th>Image count</th>\n          <th>Title</th>\n          <th>Sample Images</th>\n          <th>Link</th>\n        </tr>\n      </tbody>\n    </table>");
  $('#studies').append(html);
  var url = "".concat(BASE_URL, "mapr/api/").concat(configId, "/?value=").concat(term);
  $.getJSON(url, function (data) {
    // filter studies by 'screens' and 'projects'
    var imageCounts = {};
    data.screens.forEach(function (s) {
      imageCounts["screen-".concat(s.id)] = s.extra.counter;
    });
    data.projects.forEach(function (s) {
      imageCounts["project-".concat(s.id)] = s.extra.counter;
    });

    var filterFunc = function filterFunc(study) {
      var studyId = study['@type'].split('#')[1].toLowerCase() + '-' + study['@id'];
      return imageCounts.hasOwnProperty(studyId);
    };

    var maprData = model.studies.filter(filterFunc).map(function (study) {
      var studyId = study['@type'].split('#')[1].toLowerCase() + '-' + study['@id'];
      var studyData = Object.assign({}, study);
      studyData.imageCount = imageCounts[studyId];
      return studyData;
    });
    renderMapr(maprData, term);
  }).fail(function () {
    document.getElementById('filterCount').innerHTML = "Request failed. Server may be busy.";
  }).always(function () {
    hideFilterSpinner();
  });
} // ----- event handling --------


document.getElementById('maprConfig').onchange = function (event) {
  document.getElementById('maprQuery').value = '';
  var value = event.target.value.replace('mapr_', '');
  var placeholder = mapr_settings[value] ? mapr_settings[value].all.join(", ") : value;
  document.getElementById('maprQuery').placeholder = placeholder; // Show all autocomplete options...

  $("#maprQuery").focus();
  render();
}; // We want to show auto-complete options when user
// clicks on the field.


function showAutocomplete(event) {
  var configId = document.getElementById("maprConfig").value;
  var autoCompleteValue = event.target.value;

  if (configId.indexOf('mapr_') != 0) {
    // If not MAPR search, show all auto-complete results
    autoCompleteValue = '';
  }

  $("#maprQuery").autocomplete("search", autoCompleteValue);
}

document.getElementById('maprQuery').onfocus = function (event) {
  showAutocomplete(event);
};

document.getElementById('maprQuery').onclick = function (event) {
  // select all the text (easier to type new search term)
  event.target.setSelectionRange(0, event.target.value.length);
  showAutocomplete(event);
}; // ------ AUTO-COMPLETE -------------------


function showSpinner() {
  document.getElementById('spinner').style.visibility = 'visible';
}

function hideSpinner() {
  document.getElementById('spinner').style.visibility = 'hidden';
} // timeout to avoid flash of spinner


var filterSpinnerTimout;

function showFilterSpinner(message) {
  filterSpinnerTimout = setTimeout(function () {
    document.getElementById('filterSpinnerMessage').innerHTML = message ? message : '';
    document.getElementById('filterSpinner').style.display = 'block';
  }, 500);
}

function hideFilterSpinner() {
  clearTimeout(filterSpinnerTimout);
  document.getElementById('filterSpinnerMessage').innerHTML = '';
  document.getElementById('filterSpinner').style.display = 'none';
}

$("#maprQuery").keyup(function (event) {
  if (event.which == 13) {
    $(event.target).autocomplete("close");
    filterAndRender(); // Add to browser history. Handled by onpopstate on browser Back

    var configId = document.getElementById("maprConfig").value;
    window.history.pushState({}, "", "?query=".concat(configId, ":").concat(event.target.value));
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
      } else {
        matches = model.getKeyValueAutoComplete(configId, request.term);
      }

      response(matches);

      if (request.term.length === 0) {
        render();
        return;
      }

      filterAndRender();
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
        hideSpinner(); // E.g. status 504 for timeout

        response([{
          label: 'Loading auto-complete terms failed. Server may be busy.',
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
    }

    $(this).val(ui.item.value);
    filterAndRender(); // Add to browser history. Handled by onpopstate on browser Back

    var configId = document.getElementById("maprConfig").value;
    window.history.pushState({}, "", "?query=".concat(configId, ":").concat(ui.item.value));
    return false;
  }
}).data("ui-autocomplete")._renderItem = function (ul, item) {
  return $("<li>").append("<a>" + item.label + "</a>").appendTo(ul);
}; // ------------ Render -------------------------


function filterAndRender() {
  var configId = document.getElementById("maprConfig").value;
  var value = document.getElementById("maprQuery").value;

  if (!value) {
    render();
    return;
  }

  if (configId.indexOf('mapr_') != 0) {
    // filter studies by Key-Value pairs
    var filterFunc = function filterFunc(study) {
      var toMatch = value.toLowerCase();

      if (configId === 'Name') {
        return study.Name.toLowerCase().indexOf(toMatch) > -1;
      } // Filter by Map-Annotation Key-Value


      var show = false;

      if (study.mapValues) {
        study.mapValues.forEach(function (kv) {
          if (kv[0] === configId && kv[1].toLowerCase().indexOf(toMatch) > -1) {
            show = true;
          }
        });
      }

      return show;
    };

    render(filterFunc);
  } else {
    filterStudiesByMapr(value);
  }
}

function renderMapr(maprData, term) {
  maprData.sort(function (a, b) {
    return a.Name > b.Name ? 1 : -1;
  });
  var elementId = 'maprResultsTable' + term;
  var configId = document.getElementById("maprConfig").value;

  var linkFunc = function linkFunc(studyData) {
    var type = studyData['@type'].split('#')[1].toLowerCase();
    var maprKey = configId.replace('mapr_', '');
    var maprValue = document.getElementById('maprQuery').value;
    return "/mapr/".concat(maprKey, "/?value=").concat(maprValue, "&show=").concat(type, "-").concat(studyData['@id']);
  };

  var elementSelector = "[data-id=\"".concat(elementId, "\"]");
  maprData.forEach(function (s) {
    return renderStudy(s, elementSelector, linkFunc, maprHtml);
  }); // load images for each study...

  document.querySelectorAll("[data-id=\"".concat(elementId, "\"] tr")).forEach(function (element) {
    // load children in MAPR jsTree query to get images
    var studyId = element.id;
    var objId = studyId.split("-")[1];
    var objType = studyId.split("-")[0];
    if (!objId || !objType) return;
    var childType = objType === "project" ? "datasets" : "plates";
    var configId = document.getElementById("maprConfig").value.replace('mapr_', '');
    var maprValue = term; // We want to link to the dataset or plate...

    var imgContainer;
    var url = "".concat(BASE_URL, "mapr/api/").concat(configId, "/").concat(childType, "/?value=").concat(maprValue, "&id=").concat(objId);
    fetch(url).then(function (response) {
      return response.json();
    }).then(function (data) {
      var firstChild = data[childType][0];
      imgContainer = "".concat(firstChild.extra.node, "-").concat(firstChild.id);
      var imagesUrl = "".concat(BASE_URL, "mapr/api/").concat(configId, "/images/?value=").concat(maprValue, "&id=").concat(firstChild.id, "&node=").concat(firstChild.extra.node);
      return fetch(imagesUrl);
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      var html = data.images.slice(0, 3).map(function (i) {
        return "\n          <a href=\"".concat(BASE_URL, "webclient/img_detail/").concat(i.id, "/\"\n             target=\"_blank\" title=\"Open image in viewer\" class=\"maprViewerLink\">\n            <div>\n              <img class=\"thumbnail\" src=\"").concat(STATIC_DIR, "images/transparent.png\"\n                data-src=\"").concat(BASE_URL, "webgateway/render_thumbnail/").concat(i.id, "/\">\n              <i class=\"fas fa-eye\"></i>\n            </div>\n          </a>");
      }).join("");
      var linkHtml = "<a target=\"_blank\" href=\"".concat(BASE_URL, "mapr/").concat(configId, "/?value=").concat(maprValue, "&show=").concat(imgContainer, "\">\n                  more...\n                </a>"); // Find the container and add placeholder images html

      $("#" + element.id + " .exampleImages").html(html);
      $("#" + element.id + " .exampleImagesLink").append(linkHtml); // Update the src to load the thumbnails. Timeout to let placeholder render while we wait for thumbs

      setTimeout(function () {
        $('img', "#" + element.id).each(function (index, img) {
          img.src = img.dataset.src;
        });
      }, 0);
    });
  });
}

function render(filterFunc) {
  $('#studies').addClass('studiesLayout');
  document.getElementById('studies').innerHTML = "";

  if (!filterFunc) {
    document.getElementById('filterCount').innerHTML = "";
    return;
  }

  var studiesToRender = model.studies;

  if (filterFunc) {
    studiesToRender = model.studies.filter(filterFunc);
  }

  var filterMessage = "";

  if (studiesToRender.length === 0) {
    filterMessage = noStudiesMessage();
  } else if (studiesToRender.length < model.studies.length) {
    var configId = document.getElementById("maprConfig").value.replace('mapr_', '');
    configId = mapr_settings[configId] || configId;
    var maprValue = document.getElementById('maprQuery').value;
    filterMessage = "<p class=\"filterMessage\">\n      Found <strong>".concat(studiesToRender.length, "</strong> studies with\n      <strong>").concat(configId, "</strong>: <strong>").concat(maprValue, "</strong></p>");
  }

  document.getElementById('filterCount').innerHTML = filterMessage; // By default, we link to the study itself in IDR...

  var linkFunc = function linkFunc(studyData) {
    var type = studyData['@type'].split('#')[1].toLowerCase();
    return "".concat(BASE_URL, "webclient/?show=").concat(type, "-").concat(studyData['@id']);
  };

  var htmlFunc = studyHtml;
  studiesToRender.forEach(function (s) {
    return renderStudy(s, '#studies', linkFunc, htmlFunc);
  });
  loadStudyThumbnails();
} // When no studies match the filter, show message/link.


function noStudiesMessage() {
  var filterMessage = "No matching studies.";

  if (SUPER_CATEGORY) {
    var currLabel = SUPER_CATEGORY.label;
    var configId = document.getElementById("maprConfig").value;
    var maprQuery = document.getElementById("maprQuery").value;
    var others = [];

    for (var cat in SUPER_CATEGORIES) {
      if (SUPER_CATEGORIES[cat].label !== currLabel) {
        others.push("<a href=\"".concat(GALLERY_INDEX).concat(cat, "/search/?query=").concat(configId, ":").concat(maprQuery, "\">").concat(SUPER_CATEGORIES[cat].label, "</a>"));
      }
    }

    if (others.length > 0) {
      filterMessage += " Try " + others.join(" or ");
    }
  }

  return filterMessage;
}

function renderStudy(studyData, elementSelector, linkFunc, htmlFunc) {
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
  }

  var idrId = studyData.Name.split('-')[0]; // idr0001

  var authors = model.getStudyValue(studyData, "Publication Authors") || "";
  var div = htmlFunc({
    studyLink: studyLink,
    studyDesc: studyDesc,
    idrId: idrId,
    title: title,
    authors: authors,
    BASE_URL: BASE_URL,
    type: type
  }, studyData);
  document.querySelector(elementSelector).appendChild(div);
} // --------- Render utils -----------


function studyHtml(props, studyData) {
  var pubmed = model.getStudyValue(studyData, 'PubMed ID');

  if (pubmed) {
    pubmed = pubmed.split(" ")[1];
  }

  var author = props.authors.split(',')[0] || '';
  var html = "\n  <div style='white-space:nowrap'>\n    ".concat(props.idrId, "\n    ").concat(pubmed ? "<a class='pubmed' target=\"_blank\" href=\"".concat(pubmed, "\"> ").concat(author, " et al.</a>") : author, "\n  </div>\n  <div class=\"studyImage\">\n    <a target=\"_blank\" href=\"").concat(props.studyLink, "\">\n      <div style=\"height: 100%; width: 100%\">\n        <div class=\"studyText\">\n          <p title=\"").concat(props.studyDesc, "\">\n            ").concat(props.title, "\n          </p>\n        </div>\n        <div class=\"studyAuthors\">\n          ").concat(props.authors, "\n        </div>\n      </div>\n    </a>\n    <a class=\"viewerLink\" title=\"Open image in viewer\" target=\"_blank\"\n       href=\"\">\n      <i class=\"fas fa-eye\"></i>\n    </a>\n  </div>\n  ");
  var div = document.createElement("div");
  div.innerHTML = html;
  div.id = props.type + '-' + studyData['@id'];
  div.dataset.obj_type = props.type;
  div.dataset.obj_id = studyData['@id'];
  div.className = "row study ";
  return div;
}

function maprHtml(props, studyData) {
  var html = "  \n    <td>\n      <a target=\"_blank\" href=\"".concat(props.studyLink, "\" />\n        ").concat(props.idrId, "\n      </a>\n    </td>\n    <td>").concat(model.getStudyValue(studyData, 'Organism'), "</td>\n    <td>").concat(studyData.imageCount, "</td>\n    <td title=\"").concat(props.studyDesc, "\">").concat(props.studyDesc.slice(0, 40), "...</td>\n    <td class='exampleImages'>loading...</td>\n    <td class='exampleImagesLink'></td>\n  ");
  var tr = document.createElement("tr");
  tr.innerHTML = html;
  tr.id = props.type + '-' + studyData['@id'];
  tr.dataset.obj_type = props.type;
  tr.dataset.obj_id = studyData['@id'];
  return tr;
}

function loadStudyThumbnails() {
  var ids = []; // Collect study IDs 'project-1', 'screen-2' etc

  document.querySelectorAll('div.study').forEach(function (element) {
    var obj_id = element.dataset.obj_id;
    var obj_type = element.dataset.obj_type;

    if (obj_id && obj_type) {
      ids.push(obj_type + '-' + obj_id);
    }
  }); // Load images

  model.loadStudiesThumbnails(ids, function (data) {
    // data is e.g. { project-1: {thumbnail: base64data, image: {id:1}} }
    for (var id in data) {
      if (!data[id]) continue; // may be null

      var obj_type = id.split('-')[0];
      var obj_id = id.split('-')[1];
      var elements = document.querySelectorAll("div[data-obj_type=\"".concat(obj_type, "\"][data-obj_id=\"").concat(obj_id, "\"]"));

      for (var e = 0; e < elements.length; e++) {
        // Find all studies matching the study ID and set src on image
        var element = elements[e];
        var studyImage = element.querySelector('.studyImage');

        if (data[id].thumbnail) {
          studyImage.style.backgroundImage = "url(".concat(data[id].thumbnail, ")");
        } // viewer link


        if (data[id].image && data[id].image.id) {
          var iid = data[id].image.id;
          var link = "".concat(BASE_URL, "webclient/img_detail/").concat(iid, "/");
          element.querySelector('a.viewerLink').href = link;
        }
      }
    }
  });
} // ----------- Load / Filter Studies --------------------
// Do the loading and render() when done...


model.loadStudies(function () {
  // Immediately filter by Super category
  if (SUPER_CATEGORY && SUPER_CATEGORY.query) {
    model.studies = model.filterStudiesByMapQuery(SUPER_CATEGORY.query);
  }

  filterAndRender();
}); // Handle browser Back and Forwards - redo filtering

window.onpopstate = function (event) {
  populateInputsFromSearch();
  filterAndRender();
}; // Load MAPR config


fetch(BASE_URL + 'mapr/api/config/').then(function (response) {
  return response.json();
}).then(function (data) {
  mapr_settings = data;
  var html = FILTER_MAPR_KEYS.map(function (key) {
    var config = mapr_settings[key];

    if (config) {
      return "<option value=\"mapr_".concat(key, "\">").concat(config.label, "</option>");
    } else {
      return "";
    }
  }).join("\n");
  document.getElementById('maprKeys').innerHTML = html;
  populateInputsFromSearch();
});