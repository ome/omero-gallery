//   Copyright (C) 2019-2022 University of Dundee & Open Microscopy Environment.
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
let mapr_settings = {};

// Model for loading Projects, Screens and their Map Annotations
let model = new StudiesModel();

model.subscribe("thumbnails", (event, data) => {
  // Will get called when each batch of thumbnails is loaded
  renderThumbnails(data);
});

let getTooltipContent = (reference) => {
  return reference.querySelector(".idr_tooltip").innerHTML;
};

function renderStudyContainers(containers) {
  return ["screen", "project"]
    .map((objType) => {
      let studies = containers[objType];
      let count = studies.length;
      if (count == 0) return;
      // Link to first Project or Screen
      return `<a target="_blank" href="${BASE_URL}webclient/?show=${
        studies[studies.length - 1].objId
      }">${count} ${objType == "project" ? "Experiment" : "Screen"}${
        count === 1 ? "" : "s"
      }</a>`;
    })
    .filter(Boolean)
    .join(", ");
}

function studyHtml(study, studyObj) {
  let idrId = study.Name.split("-")[0];
  let authors = model.getStudyValue(study, "Publication Authors") || " ";
  authors = authors.split(",")[0];
  let title = escapeHTML(getStudyTitle(model, study));
  let pubmed = studyObj["pubmed_id"];
  return `
          <div class="studyThumb" style="${
            study.thumbnail
              ? "background-image: url(" + study.thumbnail + ")"
              : ""
          }" data-authors="${authors}" data-title="${title}" data-idrid="${idrId}" data-obj_type="${
    study.type
  }" data-obj_id="${study.id}">
            <div class="idr_tooltip">
              <div style="float: right">
                ${
                  pubmed
                    ? `<a target="_blank" href="${pubmed}"> ${authors} et. al </a>`
                    : `<b> ${authors} et. al </b>`
                }
              </div>
              <div style="margin-bottom:5px">${idrId}</div>
              <div style="width: 300px; display:flex">
                <div style="width:96px; position: relative" title="Open image viewer">
                  <a class="viewer_link" target="_blank" href="${BASE_URL}webclient/img_detail/${
    study.image?.id
  }/">
                    <img class="tooltipThumb" src="${
                      study.thumbnail ? study.thumbnail : ""
                    }"></img>
                    <i class="fas fa-eye"></i>
                  </a>
                </div>
                <div style="width:204px; margin-left: 7px">
                  <div style="float: left">${renderStudyContainers(
                    studyObj
                  )}</div>
                  <div style="float: right; font-weight: bold">${imageCount(
                    idrId
                  )}</div>
                  <div style="clear: both"></div>
                  <span title="${studyObj["description"]}">
                    ${title}
                  </span>
                </div>
              </div>
            </div>
          </div>
      `;
}

// ------------ Render -------------------------

function render() {
  const groupByType = document.getElementById("groupByType").checked;
  document.getElementById("studies").innerHTML = "";

  // we group by 'idr00ID' and show Screens and Experiments
  let studyContainers = {};
  // go through all Screens and Experiments...
  model.studies.forEach((study) => {
    let idrId = study.Name.split("-")[0];
    if (!studyContainers[idrId]) {
      // data for each study:
      studyContainers[idrId] = {
        screen: [],
        project: [],
        description: "",
        pubmed_id: "",
      };
    }
    let objType = study.objId.split("-")[0]; // 'screen' or 'project'
    studyContainers[idrId][objType].push(study);
    studyContainers[idrId]["description"] = study["StudyDescription"];
    let pubmed = model.getStudyValue(study, "PubMed ID");
    if (pubmed) {
      studyContainers[idrId]["pubmed_id"] = pubmed.split(" ")[1];
    }
  });

  let idrIds = [];

  let html = "";
  if (!groupByType) {
    // Show all studies...
    html = model.studies
      .map((study) => {
        let idrId = study.Name.split("-")[0];
        // Ignore multiple projects/screens from same study/publication
        if (idrIds.includes(idrId)) {
          return "";
        }
        idrIds.push(idrId);
        return studyHtml(study, studyContainers[idrId]);
      })
      .join("");
  } else {
    // group by Categories
    let categories = Object.keys(CATEGORY_QUERIES);
    // Sort by index
    categories.sort(function (a, b) {
      let idxA = CATEGORY_QUERIES[a].index;
      let idxB = CATEGORY_QUERIES[b].index;
      return idxA > idxB ? 1 : idxA < idxB ? -1 : 0;
    });

    let allIds = [];

    html = categories
      .map((category) => {
        let cat = CATEGORY_QUERIES[category];
        let query = cat.query;

        // Find matching studies
        let matches = model.filterStudiesByMapQuery(query);
        if (matches.length == 0) return "";

        let catIds = [];

        let catThumbs = matches
          .map((study) => {
            let idrId = study.Name.split("-")[0];
            // Ignore multiple projects/screens from same study/publication
            if (cat.label !== "Others" && catIds.includes(idrId)) {
              return "";
            }
            if (cat.label === "Others" && allIds.includes(idrId)) {
              return "";
            }
            catIds.push(idrId);
            allIds.push(idrId);
            return studyHtml(study, studyContainers[idrId]);
          })
          .join("");

        return `
        <div style="clear:left">
          <div style="color:#666">${cat.label}</div>
          <div>
          ${catThumbs}
          </div>
        </div>`;
      })
      .join("");
  }

  document.getElementById("studies").innerHTML = html;

  // tooltips - NB: updated when thumbnails loaded
  tippy(".studyThumb", {
    content: getTooltipContent,
    trigger: "mouseenter click", // click to show - eg. on mobile
    theme: "light-border",
    offset: [0, 2],
    allowHTML: true,
    moveTransition: "transform 2s ease-out",
    interactive: true, // allow click
  });
}

// --------- Render utils -----------

function imageCount(idrId, container) {
  // idrId e.g. "idr0001". container optional e.g. "experimentA"
  if (!model.studyStats) return "";

  let containers = model.studyStats[idrId];
  if (!containers) return "";
  if (container) {
    containers.filter((c) => c.Container == container);
  }

  let imgCount = containers
    .map((row) => row["5D Images"])
    .reduce((total, value) => total + parseInt(value, 10), 0);
  return (
    new Intl.NumberFormat().format(imgCount) +
    " Image" +
    (imgCount != "1" ? "s" : "")
  );
}

function renderThumbnails(data) {
  // data is {'project-1': {'image':{'id': 2}, 'thumbnail': 'data:image/jpeg;base64,/9j/4AAQSkZ...'}}
  for (let id in data) {
    let obj_type = id.split("-")[0];
    let obj_id = id.split("-")[1];
    let elements = document.querySelectorAll(
      `div[data-obj_type="${obj_type}"][data-obj_id="${obj_id}"]`
    );
    // This updates small grid thumbnails and the tooltip images
    for (let e = 0; e < elements.length; e++) {
      // Find all studies matching the study ID and set src on image
      let element = elements[e];
      element.style.backgroundImage = `url(${data[id].thumbnail})`;
      // tooltip content is child of this element
      let thumb = element.querySelector(".tooltipThumb");
      if (thumb) {
        thumb.src = data[id].thumbnail;
      }
      // add viewer-link for tooltip
      let link = element.querySelector(".viewer_link");
      if (link) {
        let url = `${BASE_URL}webclient/img_detail/${data[id].image.id}/`;
        link.href = url;
      }
      // update tooltips
      if (element._tippy) {
        element._tippy.setContent(getTooltipContent(element));
      }
    }
  }
}

// ----------- Load / Filter Studies --------------------

model.loadStudyStats(IDR_STUDIES_URL, function (stats) {
  // Load stats and show spinning counters...

  // In case studies.tsv loading from github fails, show older values
  let totalImages = 12840301;
  let tbTotal = 307;
  let studyCount = 104;

  if (stats) {
    let studyIds = Object.keys(stats);
    // remove grouping of containers by idrId
    let containers = Object.values(stats).flatMap((containers) => containers);

    if (SUPER_CATEGORY) {
      try {
        // filter studies and containers by cell or tissue
        let query = SUPER_CATEGORY.query.split(":"); // e.g. "Sample Type:tissue"
        studyIds = studyIds.filter((studyId) =>
          stats[studyId].some((row) => row[query[0]] == query[1])
        );
        let filtered = containers.filter((row) => row[query[0]] == query[1]);
        if (filtered.length != 0) {
          // in case we filter out everything!
          containers = filtered;
        }
      } catch (error) {
        console.log("Failed to filter studies stats by category");
      }
    }
    let imageCounts = containers.map((row) => row["5D Images"]);
    totalImages = imageCounts.reduce(
      (total, value) => total + parseInt(value, 10),
      0
    );
    let tbCounts = containers.map((row) => row["Size (TB)"]);
    tbTotal = tbCounts.reduce(
      (total, value) => total + parseFloat(value, 10),
      0
    );
    studyCount = studyIds.length;
  }

  animateValue(document.getElementById("imageCount"), 0, totalImages, 1500);
  animateValue(document.getElementById("tbCount"), 0, tbTotal, 1500);
  animateValue(document.getElementById("studyCount"), 0, studyCount, 1500);
});

async function init() {
  // Do the loading and render() when done...
  await model.loadStudies();

  // Immediately filter by Super category
  if (SUPER_CATEGORY && SUPER_CATEGORY.query) {
    model.studies = model.filterStudiesByMapQuery(SUPER_CATEGORY.query);
  }

  // start loading thumbnails in batches... triggers render() when loaded
  model.loadStudiesThumbnails();

  render();

  document
    .getElementById("groupByType")
    .addEventListener("change", function (event) {
      render();
    });

  // auto-complete: 'Enter' key will browse to results page
  enableEnterGoesToResultsPage();

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
    })
    .catch(function (err) {
      console.log("mapr not installed (config not available)");
    });
}

init();
