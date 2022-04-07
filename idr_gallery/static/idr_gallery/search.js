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

// Model for loading Projects, Screens and their Map Annotations
let model = new StudiesModel();

model.subscribe("thumbnails", (event, data) => {
  // Will get called when each batch of thumbnails is loaded
  renderThumbnails(data);
});

let mapr_settings;

// FIRST, populate forms from query string
function populateInputsFromSearch() {
  let search = window.location.search.substr(1);
  let query = "";
  var searchParams = search.split("&");
  for (var i = 0; i < searchParams.length; i++) {
    var paramSplit = searchParams[i].split("=");
    if (paramSplit[0] === "query") {
      query = paramSplit[1].replace(/%20/g, " ");
    }
  }
  if (query) {
    let splitIndex = query.indexOf(":");
    let configId = query.slice(0, splitIndex);
    let value = query.slice(splitIndex + 1);
    if (configId && value) {
      document.getElementById("maprConfig").value = configId;
      document.getElementById("maprQuery").value = value;
      let key = configId.replace("mapr_", "");
      let placeholder = `Type to filter values...`;
      if (mapr_settings && mapr_settings[key]) {
        placeholder = `Type ${mapr_settings[key]["default"][0]}...`;
      }
      document.getElementById("maprQuery").placeholder = placeholder;
    }
  }
}
populateInputsFromSearch();

// ------------ Handle MAPR searching or filtering ---------------------

function filterStudiesByMapr(value) {
  $("#studies").removeClass("studiesLayout");
  let configId = document
    .getElementById("maprConfig")
    .value.replace("mapr_", "");
  document.getElementById("studies").innerHTML = "";
  let key = mapr_settings[value]
    ? mapr_settings[value].all.join(" or ")
    : value;
  showFilterSpinner(`Finding images with ${configId}: ${value}...`);

  // Get all terms that match (NOT case_sensitive)
  let url = `${BASE_URL}mapr/api/${configId}/?value=${value}&case_sensitive=false&orphaned=true`;
  $.getJSON(url, (data) => {
    let maprTerms = data.maps.map((term) => term.id);
    let termUrls = maprTerms.map(
      (term) => `${BASE_URL}mapr/api/${configId}/?value=${term}`
    );

    // Get results for All terms
    Promise.all(termUrls.map((url) => fetch(url)))
      .then((responses) => Promise.all(responses.map((res) => res.json())))
      .then((responses) => {
        hideFilterSpinner();

        // filter studies by each response
        let studiesByTerm = responses.map((data) =>
          filterStudiesByMaprResponse(data)
        );

        renderMaprMessage(studiesByTerm, maprTerms);

        // Show table for each...
        studiesByTerm.forEach((studies, idx) => {
          if (studies.length > 0) {
            renderMaprResultsTable(studies, maprTerms[idx]);
          }
        });
      });
    // .fail(() => {
    //   document.getElementById('filterCount').innerHTML = "Request failed. Server may be busy."
    // })
  });
}

function filterStudiesByMaprResponse(data) {
  // filter studies by 'screens' and 'projects'
  let imageCounts = {};
  data.screens.forEach((s) => {
    imageCounts[`screen-${s.id}`] = s.extra.counter;
  });
  data.projects.forEach((s) => {
    imageCounts[`project-${s.id}`] = s.extra.counter;
  });

  let filterFunc = (study) => {
    let studyId =
      study["@type"].split("#")[1].toLowerCase() + "-" + study["@id"];
    return imageCounts.hasOwnProperty(studyId);
  };

  let filteredStudies = model.studies.filter(filterFunc).map((study) => {
    let studyId =
      study["@type"].split("#")[1].toLowerCase() + "-" + study["@id"];
    let studyData = Object.assign({}, study);
    studyData.imageCount = imageCounts[studyId];
    return studyData;
  });
  return filteredStudies;
}

function renderMaprMessage(studiesByTerm, maprTerms) {
  // for each term e.g. TOP2, top2 etc sum image counts from each study
  let imageCount = studiesByTerm.reduce((count, studies) => {
    return (
      count + studies.reduce((count, study) => count + study.imageCount, 0)
    );
  }, 0);
  let studyCount = studiesByTerm.reduce(
    (count, studies) => count + studies.length,
    0
  );

  let terms = maprTerms.join("/");
  let filterMessage = "";
  if (studyCount === 0) {
    filterMessage = noStudiesMessage();
  } else {
    let configId = document
      .getElementById("maprConfig")
      .value.replace("mapr_", "");
    let key = configId;
    if (mapr_settings && mapr_settings[configId]) {
      key = mapr_settings[key].label;
    }
    filterMessage = `<p class="filterMessage">
      Found <strong>${imageCount}</strong> images with
      <strong>${key}</strong>: <strong>${terms}</strong>
      in <strong>${studyCount}</strong> stud${
      studyCount == 1 ? "y" : "ies"
    }</strong></p>`;
  }
  document.getElementById("filterCount").innerHTML = filterMessage;
}

function renderMaprResultsTable(maprData, term) {
  let configId = document
    .getElementById("maprConfig")
    .value.replace("mapr_", "");
  let elementId = "maprResultsTable" + term;
  let html = `
    <h2>${term}</h2>
    <table class='maprResultsTable' style='margin-top:20px'>
      <tbody data-id='${elementId}'>
        <tr>
          <th>Study ID</th>
          <th>Organism</th>
          <th>Image count</th>
          <th>Title</th>
          <th>Sample Images</th>
          <th>Link</th>
        </tr>
      </tbody>
    </table>`;
  $("#studies").append(html);
  renderMapr(maprData, term);
}

// ----- event handling --------

document.getElementById("maprConfig").onchange = (event) => {
  document.getElementById("maprQuery").value = "";
  let value = event.target.value.replace("mapr_", "");
  let placeholder = `Type to filter values...`;
  if (mapr_settings[value]) {
    placeholder = `Type ${mapr_settings[value]["default"][0]}...`;
  }
  document.getElementById("maprQuery").placeholder = placeholder;
  // Show all autocomplete options...
  $("#maprQuery").focus();
  render();
};

// We want to show auto-complete options when user
// clicks on the field.
function showAutocomplete(event) {
  let configId = document.getElementById("maprConfig").value;
  let autoCompleteValue = event.target.value;
  if (configId.indexOf("mapr_") != 0) {
    // If not MAPR search, show all auto-complete results
    autoCompleteValue = "";
  }
  $("#maprQuery").autocomplete("search", autoCompleteValue);
}

document.getElementById("maprQuery").onfocus = (event) => {
  showAutocomplete(event);
};
document.getElementById("maprQuery").onclick = (event) => {
  showAutocomplete(event);
};

// ------ AUTO-COMPLETE -------------------

function showSpinner() {
  document.getElementById("spinner").style.visibility = "visible";
}
function hideSpinner() {
  document.getElementById("spinner").style.visibility = "hidden";
}
// timeout to avoid flash of spinner
let filterSpinnerTimout;
function showFilterSpinner(message) {
  filterSpinnerTimout = setTimeout(() => {
    document.getElementById("filterSpinnerMessage").innerHTML = message
      ? message
      : "";
    document.getElementById("filterSpinner").style.display = "block";
  }, 500);
}
function hideFilterSpinner() {
  clearTimeout(filterSpinnerTimout);
  document.getElementById("filterSpinnerMessage").innerHTML = "";
  document.getElementById("filterSpinner").style.display = "none";
}

$("#maprQuery")
  .keyup((event) => {
    if (event.which == 13) {
      $(event.target).autocomplete("close");
      filterAndRender();
      // Add to browser history. Handled by onpopstate on browser Back
      let configId = document.getElementById("maprConfig").value;
      window.history.pushState(
        {},
        "",
        `?query=${configId}:${event.target.value}`
      );
    }
  })
  .autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function (request, response) {
      // if configId is not from mapr, we filter on mapValues...
      let configId = document.getElementById("maprConfig").value;
      if (configId.indexOf("mapr_") != 0) {
        let matches;
        if (configId === "Name") {
          matches = model.getStudiesNames(request.term);
        } else if (configId === "Group") {
          matches = model.getStudiesGroups(request.term);
        } else {
          matches = model.getKeyValueAutoComplete(configId, request.term);
        }
        response(matches);

        // When not mapr, we filter while typing
        filterAndRender();
        return;
      }

      // Don't handle empty query for mapr
      if (request.term.length == 0) {
        return;
      }

      // Auto-complete to filter by mapr...
      configId = configId.replace("mapr_", "");
      let case_sensitive = false;

      let requestData = {
        case_sensitive: case_sensitive,
      };
      let url;
      if (request.term.length === 0) {
        // Try to list all top-level values.
        // This works for 'wild-card' configs where number of values is small e.g. Organism
        // But will return empty list for e.g. Gene
        url = `${BASE_URL}mapr/api/${configId}/`;
        requestData.orphaned = true;
      } else {
        // Find auto-complete matches
        url = `${BASE_URL}mapr/api/autocomplete/${configId}/`;
        requestData.value = case_sensitive
          ? request.term
          : request.term.toLowerCase();
        requestData.query = true; // use a 'like' HQL query
      }

      showSpinner();
      $.ajax({
        dataType: "json",
        type: "GET",
        url: url,
        data: requestData,
        success: function (data) {
          hideSpinner();
          if (request.term.length === 0) {
            // Top-level terms in 'maps'
            if (data.maps && data.maps.length > 0) {
              let terms = data.maps.map((m) => m.id);
              terms.sort();
              response(terms);
            }
          } else if (data.length > 0) {
            response(
              $.map(data, function (item) {
                return item;
              })
            );
          } else {
            response([{ label: "No results found.", value: -1 }]);
          }
        },
        error: function (data) {
          hideSpinner();
          // E.g. status 504 for timeout
          response([
            {
              label: "Loading auto-complete terms failed. Server may be busy.",
              value: -1,
            },
          ]);
        },
      });
    },
    minLength: 0,
    open: function () {},
    close: function () {
      // $(this).val('');
      return false;
    },
    focus: function (event, ui) {},
    select: function (event, ui) {
      if (ui.item.value == -1) {
        // Ignore 'No results found'
        return false;
      }
      $(this).val(ui.item.value);
      filterAndRender();
      // Add to browser history. Handled by onpopstate on browser Back
      let configId = document.getElementById("maprConfig").value;
      window.history.pushState({}, "", `?query=${configId}:${ui.item.value}`);

      return false;
    },
  })
  .data("ui-autocomplete")._renderItem = function (ul, item) {
  return $("<li>")
    .append("<a>" + item.label + "</a>")
    .appendTo(ul);
};

// ------------ Render -------------------------

function filterAndRender() {
  let configId = document.getElementById("maprConfig").value;
  let value = document.getElementById("maprQuery").value;
  if (!value) {
    render();
    return;
  }
  if (configId.indexOf("mapr_") != 0) {
    // filter studies by Key-Value pairs
    let filterFunc = (study) => {
      let toMatch = value.toLowerCase();
      if (configId === "Name") {
        return study.Name.toLowerCase().indexOf(toMatch) > -1;
      }
      if (configId === "Group") {
        var group = study["omero:details"].group;
        return group.Name.toLowerCase().indexOf(toMatch) > -1;
      }
      // Filter by Map-Annotation Key-Value
      let show = false;
      if (study.mapValues) {
        study.mapValues.forEach((kv) => {
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
  maprData.sort((a, b) => {
    return a.Name > b.Name ? 1 : -1;
  });

  let elementId = "maprResultsTable" + term;

  let configId = document.getElementById("maprConfig").value;
  let linkFunc = (studyData) => {
    let type = studyData["@type"].split("#")[1].toLowerCase();
    let maprKey = configId.replace("mapr_", "");
    return `/mapr/${maprKey}/?value=${term}&show=${type}-${studyData["@id"]}`;
  };
  let elementSelector = `[data-id="${elementId}"]`;

  maprData.forEach((s) => renderStudy(s, elementSelector, linkFunc, maprHtml));

  // load images for each study...
  $(`[data-id="${elementId}"] tr`).each(function () {
    // load children in MAPR jsTree query to get images
    let element = this;
    let studyId = element.id;
    let objId = studyId.split("-")[1];
    let objType = studyId.split("-")[0];
    if (!objId || !objType) return;
    let childType = objType === "project" ? "datasets" : "plates";
    let configId = document
      .getElementById("maprConfig")
      .value.replace("mapr_", "");
    let maprValue = term;
    // We want to link to the dataset or plate...
    let imgContainer;
    let url = `${BASE_URL}mapr/api/${configId}/${childType}/?value=${maprValue}&id=${objId}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        let firstChild = data[childType][0];
        imgContainer = `${firstChild.extra.node}-${firstChild.id}`;
        let imagesUrl = `${BASE_URL}mapr/api/${configId}/images/?value=${maprValue}&id=${firstChild.id}&node=${firstChild.extra.node}`;
        return fetch(imagesUrl);
      })
      .then((response) => response.json())
      .then((data) => {
        let html = data.images
          .slice(0, 3)
          .map(
            (i) => `
          <a href="${BASE_URL}webclient/img_detail/${i.id}/"
             target="_blank" title="Open image in viewer" class="maprViewerLink">
            <div>
              <img class="thumbnail" src="${STATIC_DIR}images/transparent.png"
                data-src="${BASE_URL}webgateway/render_thumbnail/${i.id}/">
              <i class="fas fa-eye"></i>
            </div>
          </a>`
          )
          .join("");
        let linkHtml = `<a target="_blank" href="${BASE_URL}mapr/${configId}/?value=${maprValue}&show=${imgContainer}">
                  more...
                </a>`;
        // Find the container and add placeholder images html
        $("#" + element.id + " .exampleImages").html(html);
        $("#" + element.id + " .exampleImagesLink").append(linkHtml);
        // Update the src to load the thumbnails. Timeout to let placeholder render while we wait for thumbs
        setTimeout(() => {
          $("img", "#" + element.id).each((index, img) => {
            img.src = img.dataset.src;
          });
        }, 0);
      });
  });
}

function render(filterFunc) {
  $("#studies").addClass("studiesLayout");
  document.getElementById("studies").innerHTML = "";

  if (!filterFunc) {
    document.getElementById("filterCount").innerHTML = "";
    return;
  }

  let studiesToRender = model.studies;
  if (filterFunc) {
    studiesToRender = model.studies.filter(filterFunc);
  }

  let configId = document
    .getElementById("maprConfig")
    .value.replace("mapr_", "");
  configId = (mapr_settings && mapr_settings[configId]) || configId;
  let maprValue = document.getElementById("maprQuery").value;

  if (configId === "Name") {
    // If searching by idrID (Number)  show best match first...
    let value = document.getElementById("maprQuery").value;
    if (!isNaN(value)) {
      let padZeros = "0000" + value;
      let idrId = `idr${padZeros.slice(padZeros.length - 4)}`;
      studiesToRender.sort(function (a, b) {
        return a.Name.includes(idrId) ? -1 : 1;
      });
    }
  }

  let filterMessage = "";
  if (studiesToRender.length === 0) {
    filterMessage = noStudiesMessage();
  } else if (studiesToRender.length < model.studies.length) {
    filterMessage = `<p class="filterMessage">
      Found <strong>${studiesToRender.length}</strong> studies with
      <strong>${configId}</strong>: <strong>${maprValue}</strong></p>`;
  }
  document.getElementById("filterCount").innerHTML = filterMessage;

  // By default, we link to the study itself in IDR...
  let linkFunc = (studyData) => {
    let type = studyData["@type"].split("#")[1].toLowerCase();
    return `${BASE_URL}webclient/?show=${type}-${studyData["@id"]}`;
  };
  let htmlFunc = studyHtml;

  studiesToRender.forEach((s) =>
    renderStudy(s, "#studies", linkFunc, htmlFunc)
  );

  // loadStudyThumbnails();
  model.loadStudiesThumbnails();
}

// When no studies match the filter, show message/link.
function noStudiesMessage() {
  let filterMessage = "No matching studies.";
  if (SUPER_CATEGORY) {
    let currLabel = SUPER_CATEGORY.label;
    let configId = document.getElementById("maprConfig").value;
    let maprQuery = document.getElementById("maprQuery").value;
    let others = [];
    for (let cat in SUPER_CATEGORIES) {
      if (SUPER_CATEGORIES[cat].label !== currLabel) {
        others.push(
          `<a href="${GALLERY_HOME}${cat}/search/?query=${configId}:${maprQuery}">${SUPER_CATEGORIES[cat].label}</a>`
        );
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
  var title = model.getStudyTitle(studyData);

  let type = studyData["@type"].split("#")[1].toLowerCase();
  let studyLink = linkFunc(studyData);
  // save for later
  studyData.title = title;

  var studyDesc = model.getStudyDescription(studyData, title);

  let shortName = getStudyShortName(studyData);
  let authors = model.getStudyValue(studyData, "Publication Authors") || "";

  let div = htmlFunc(
    { studyLink, studyDesc, shortName, title, authors, BASE_URL, type },
    studyData
  );
  document.querySelector(elementSelector).appendChild(div);
}

// --------- Render utils -----------

function studyHtml(props, studyData) {
  let pubmed = model.getStudyValue(studyData, "PubMed ID");
  if (pubmed) {
    pubmed = pubmed.split(" ")[1];
  }
  let author = props.authors.split(",")[0] || "";
  if (author) {
    author = `${author} et al.`;
    author = author.length > 23 ? author.slice(0, 20) + "..." : author;
  }
  let html = `
  <div style='white-space:nowrap'>
    ${props.shortName}
    ${
      pubmed
        ? `<a class='pubmed' target="_blank" href="${pubmed}"> ${author}</a>`
        : author
    }
  </div>
  <div class="studyImage">
    <a target="_blank" href="${props.studyLink}">
      <div style="height: 100%; width: 100%">
        <div class="studyText">
          <p title='${props.studyDesc}'>
            ${props.title}
          </p>
        </div>
        <div class="studyAuthors">
          ${props.authors}
        </div>
      </div>
    </a>
    <a class="viewerLink" title="Open image in viewer" target="_blank"
       href="">
      <i class="fas fa-eye"></i>
    </a>
  </div>
  `;
  var div = document.createElement("div");
  div.innerHTML = html;
  div.id = props.type + "-" + studyData["@id"];
  div.dataset.obj_type = props.type;
  div.dataset.obj_id = studyData["@id"];
  div.className = "row study ";
  return div;
}

function maprHtml(props, studyData) {
  let html = `  
    <td>
      <a target="_blank" href="${props.studyLink}" />
        ${props.shortName}
      </a>
    </td>
    <td>${model.getStudyValue(studyData, "Organism")}</td>
    <td>${studyData.imageCount}</td>
    <td title="${props.title}">${props.title.slice(0, 40)}${
    props.title.length > 40 ? "..." : ""
  }</td>
    <td class='exampleImages'>loading...</td>
    <td class='exampleImagesLink'></td>
  `;
  var tr = document.createElement("tr");
  tr.innerHTML = html;
  tr.id = props.type + "-" + studyData["@id"];
  tr.dataset.obj_type = props.type;
  tr.dataset.obj_id = studyData["@id"];
  return tr;
}

function renderThumbnails(data) {
  // data is e.g. { project-1: {thumbnail: base64data, image: {id:1}} }
  for (let id in data) {
    if (!data[id]) continue; // may be null
    let obj_type = id.split("-")[0];
    let obj_id = id.split("-")[1];
    let elements = document.querySelectorAll(
      `div[data-obj_type="${obj_type}"][data-obj_id="${obj_id}"]`
    );
    for (let e = 0; e < elements.length; e++) {
      // Find all studies matching the study ID and set src on image
      let element = elements[e];
      let studyImage = element.querySelector(".studyImage");
      if (data[id].thumbnail) {
        studyImage.style.backgroundImage = `url(${data[id].thumbnail})`;
      }
      // viewer link
      if (data[id].image && data[id].image.id) {
        let iid = data[id].image.id;
        let link = `${BASE_URL}webclient/img_detail/${iid}/`;
        element.querySelector("a.viewerLink").href = link;
      }
    }
  }
}

// ----------- Load / Filter Studies --------------------

async function init() {
  // Do the loading and render() when done...
  await model.loadStudies();

  // Immediately filter by Super category
  if (SUPER_CATEGORY && SUPER_CATEGORY.query) {
    model.studies = model.filterStudiesByMapQuery(SUPER_CATEGORY.query);
  }

  // load thumbs for all studies, even if not needed
  // URL will be same each time (before filtering) so response will be cached
  model.loadStudiesThumbnails();

  filterAndRender();
}

init();

// Handle browser Back and Forwards - redo filtering
window.onpopstate = (event) => {
  populateInputsFromSearch();
  filterAndRender();
};

// Load MAPR config
fetch(BASE_URL + "mapr/api/config/")
  .then((response) => response.json())
  .then((data) => {
    mapr_settings = data;

    let options = FILTER_MAPR_KEYS.map((key) => {
      let config = mapr_settings[key];
      if (config) {
        return `<option value="mapr_${key}">${config.label}</option>`;
      } else {
        return "";
      }
    });
    if (options.length > 0) {
      document.getElementById("maprKeys").innerHTML = options.join("\n");
      // Show the <optgroup> and the whole form
      document.getElementById("maprKeys").style.display = "block";
      document.getElementById("search-form").style.display = "block";
    }
    populateInputsFromSearch();
  })
  .catch(function (err) {
    console.log("mapr not installed (config not available)");
  });
