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


// ----- event handling --------

document.getElementById('maprConfig').onchange = (event) => {
  document.getElementById('maprQuery').value = '';
  let value = event.target.value.replace('mapr_', '');
  let placeholder = `Type to filter values...`;
  if (mapr_settings[value]) {
    placeholder = `Type ${mapr_settings[value]['default'][0]}...`;
  }
  document.getElementById('maprQuery').placeholder = placeholder;
  // Show all autocomplete options...
  $("#maprQuery").focus();
  render();
}

document.getElementById('maprQuery').onfocus = (event) => {
  $("#maprQuery").autocomplete("search", event.target.value);
}

// ------ AUTO-COMPLETE -------------------

function showSpinner() {
  document.getElementById('spinner').style.visibility = 'visible';
}
function hideSpinner() {
  document.getElementById('spinner').style.visibility = 'hidden';
}

$("#maprQuery")
  .keyup(event => {
    if (event.which == 13) {
      let configId = document.getElementById("maprConfig").value;
      document.location.href = `search/?query=${configId}:${event.target.value}`;
    }
  })
  .autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function (request, response) {

      // if configId is not from mapr, we filter on mapValues...
      let configId = document.getElementById("maprConfig").value;
      if (configId.indexOf('mapr_') != 0) {

        let matches;
        if (configId === 'Name') {
          matches = model.getStudiesNames(request.term);
        } else if (configId === 'Group') {
          matches = model.getStudiesGroups(request.term);
        } else {
          matches = model.getKeyValueAutoComplete(configId, request.term);
        }
        response(matches);
        return;
      }

      // Don't handle empty query for mapr
      if (request.term.length == 0) {
        return;
      }

      // Auto-complete to filter by mapr...
      configId = configId.replace('mapr_', '');
      let case_sensitive = false;

      let requestData = {
        case_sensitive: case_sensitive,
      }
      let url;
      if (request.term.length === 0) {
        // Try to list all top-level values.
        // This works for 'wild-card' configs where number of values is small e.g. Organism
        // But will return empty list for e.g. Gene
        url = `${BASE_URL}mapr/api/${configId}/`;
        requestData.orphaned = true
      } else {
        // Find auto-complete matches
        url = `${BASE_URL}mapr/api/autocomplete/${configId}/`;
        requestData.value = case_sensitive ? request.term : request.term.toLowerCase();
        requestData.query = true;   // use a 'like' HQL query
      }
      showSpinner();
      $.ajax({
        dataType: "json",
        type: 'GET',
        url: url,
        data: requestData,
        success: function (data) {
          hideSpinner();
          if (request.term.length === 0) {
            // Top-level terms in 'maps'
            if (data.maps && data.maps.length > 0) {
              let terms = data.maps.map(m => m.id);
              terms.sort();
              response(terms);
            }
          }
          else if (data.length > 0) {
            response($.map(data, function (item) {
              return item;
            }));
          } else {
            response([{ label: 'No results found.', value: -1 }]);
          }
        },
        error: function (data) {
          hideSpinner();
          response([{ label: 'Error occured.', value: -1 }]);
        }
      });
    },
    minLength: 0,
    open: function () { },
    close: function () {
      // $(this).val('');
      return false;
    },
    focus: function (event, ui) { },
    select: function (event, ui) {
      if (ui.item.value == -1) {
        // Ignore 'No results found'
        return false;
      }
      // show temp message in case loading search page is slow
      $(this).val("loading search results...");
      // Load search page...
      let configId = document.getElementById("maprConfig").value;
      document.location.href = `search/?query=${configId}:${ui.item.value}`;
      return false;
    }
  }).data("ui-autocomplete")._renderItem = function (ul, item) {
    return $("<li>")
      .append("<a>" + item.label + "</a>")
      .appendTo(ul);
  }

// ------------ Render -------------------------

function render(groupByType) {
  document.getElementById('studies').innerHTML = "";
  let studyThumbs = {
    "screen-3": { "image": 1230459 },
    "screen-102": { "image": 223948 },
    "screen-51": { "image": 16255 },
    "screen-202": { "image": 719331 },
    "screen-597": { "image": 1014884 },
    "screen-751": { "image": 930626 },
    "screen-253": { "image": 353185 },  // idr0006
    "screen-201": { "image": 96901 },
    "screen-154": { "image": 35730 },  // idr0008
    "screen-206": { "image": 106959 },  // idr0008
    "screen-251": { "image": 171499 },  // idr0009
    "screen-803": { "image": 1313778, },  // idr0009
    "screen-1351": { "image": 1921258, },  // idr0010
    "screen-1501": { "image": 2849858, },  // idr0011
    "screen-1551": { "image": 2856665, },  // idr0011
    "screen-1601": { "image": 2857812, },  // idr0011
    "screen-1602": { "image": 2959610, },  // idr0011
    "screen-1603": { "image": 2857890, },  // idr0011
    "screen-1202": { "image": 1811590, },  // idr0012
    "screen-1101": { "image": 1484653, },  // idr0013
    "screen-1302": { "image": 2865040, },  // idr0013
    "screen-1201": { "image": 1845698, },  // idr0015
    "screen-1251": { "image": 2044489, },  // idr0016
    "screen-1151": { "image": 1755287, },  // idr0017
    "project-101": { "image": 1920105, },  // idr0018
    "screen-1203": { "image": 1851832, },  // idr0019
    "screen-1204": { "image": 1911858, },  // idr0020
    "project-51": { "image": 1884913, },  // idr0021
    "screen-2151": { "image": 6150653, },  // idr0022
    "screen-2152": { "image": 7948817, },  // idr0022
    "project-52": { "image": 1885643, },  // idr0023
    "screen-1851": { "image": 3260524, },  // idr0025
    "project-301": { "image": 3261662, },  // idr0026
    "project-151": { "image": 2858229, },  // idr0027
    "screen-1651": { "image": 2873791, },  // idr0028A
    "screen-1652": { "image": 2893662, },  // idr0028B
    "screen-1653": { "image": 2974825, },  // idr0028C
    "screen-1654": { "image": 3005373, },  // idr0028D
    "screen-1801": { "image": 3137952, },  // idr0030
    "project-201": { "image": 3125701, },  // idr0032
    "screen-1751": { "image": 3191907, },  // idr0033
    "screen-1901": { "image": 3262540, },  // idr0034
    "screen-2001": { "image": 3414398, },  // idr0035
    "screen-1952": { "image": 1896580, },  // idr0036
    "screen-2051": { "image": 4996009, },  // idr0037
    "project-351": { "image": 3414018, },  // idr0038A
    "project-352": { "image": 3414075, },  // idr0038B
    "project-353": { "image": 3414085, },  // idr0038C
    "project-401": { "image": 3491629, },  // idr0040
    "project-404": { "image": 3489996, },  // idr0041
    "project-402": { "image": 3428080, },  // idr0042
    "project-501": { "image": 13384350, },  // idr0043
    "project-502": { "image": 4007802, },  // idr0044
    "project-405": { "image": 3509480, },  // idr0045
    "project-503": { "image": 4498386, },  // idr0047
    "project-1201": { "image": 9846152, },  // idr0048
    "project-505": { "image": 4995115, },  // idr0050
    "project-552": { "image": 4007817, },  // idr0051
    "project-752": { "image": 5514272, },  // idr0052
    "project-753": { "image": 5514071, },  // idr0052B
    "project-754": { "image": 5514131, },  // idr0052C
    "project-504": { "image": 4495402, },  // idr0053
    "project-701": { "image": 5025551, },  // idr0054
    "screen-2301": { "image": 9545729, },  // idr0056A
    "screen-2302": { "image": 9627851, },  // idr0056B
    "screen-2303": { "image": 9753804, },  // idr0052C
    "screen-2101": { "image": 6001463, },  // idr0061
    "project-801": { "image": 6001240, },  // idr0062
    "project-1751": { "image": 12922261, },  // idr0063
    "screen-2351": { "image": 9822058, },  // idr0064
    "project-901": { "image": 9022301, },  // idr0065A
    "project-902": { "image": 9035363, },  // idr0065B
    "project-851": { "image": 8343601, },  // idr0066A
    "project-852": { "image": 8343611, },  // idr0066B
    "project-853": { "image": 8343615, },  // idr0066C
    "project-854": { "image": 8343616, },  // idr0066D
    "project-904": { "image": 9036345, },  // idr0067
    "project-2152": { "image": 13462847, },  // idr0068
    "screen-2251": { "image": 8833072, },  // idr0069
    "project-1104": { "image": 9840230, },  // idr0070
    "project-1503": { "image": 12240772, },  // idr0071A
    "project-1503": { "image": 12240772, },  // idr0071A
    "project-1503": { "image": 12240772, },  // idr0071A
    "project-1503": { "image": 12240772, },  // idr0071A
    "project-1503": { "image": 12240772, },  // idr0071A
    "project-1505": { "image": 12249248, },  // idr0071B
    "project-1504": { "image": 12241566, },  // idr0071C
    "project-1506": { "image": 12295354, },  // idr0071D
    "project-1502": { "image": 12106324, },  // idr0071E
    "project-1507": { "image": 12142871, },  // idr0071F
    "screen-2952": { "image": 12794451, },  // idr0072A
    "screen-2953": { "image": 12814262, },  // idr0072B
    "project-1002": { "image": 9798438, },  // idr0073
    "project-951": { "image": 9528933, },  // idr0075
    "project-1302": { "image": 10501759, },  // idr0076
    "project-1101": { "image": 9836841, },  // idr0077
    "screen-2501": { "image": 10342647, },  // idr0078A
    "screen-2502": { "image": 10496304, },  // idr0078B
    "project-1102": { "image": 9836998, },  // idr0079
    "project-1103": { "image": 9837354, },  // idr0079B
    "screen-2701": { "image": 11550334, },  // idr0080
    "screen-2401": { "image": 9822627, },  // idr0081A
    "screen-2402": { "image": 9823119, },  // idr0081B
    "screen-2403": { "image": 9823804, },  // idr0081C
    "screen-2404": { "image": 9825105, },  // idr0081D
    "screen-2405": { "image": 9830833, },  // idr0081E
    "project-1251": { "image": 9846228, },  // idr0082
    "project-1051": { "image": 9822152, },  // idr0083
    "project-1151": { "image": 9842150, },  // idr0084
    "project-1202": { "image": 9846157, },  // idr0085
    "project-1158": { "image": 9844675, },  // idr0086A
    "project-1159": { "image": 9845931, },  // idr0086B
    "project-1160": { "image": 9846057, },  // idr0086C
    "project-1161": { "image": 9846131, },  // idr0086D
    "project-1157": { "image": 9844391, },  // idr0087A
    "screen-2651": { "image": 11407784, },  // idr0088
    "project-1303": { "image": 10502515, },  // idr0089A
    "project-1304": { "image": 10502961, },  // idr0089B
    "screen-2851": { "image": 12540310, },  // idr0090
    "project-1351": { "image": 10647409, },  // idr0091
    "screen-2451": { "image": 10340801, },  // idr0092
    "screen-2751": { "image": 12570400, },  // idr0093
    "screen-2602": { "image": 10532657, },  // idr0094A
    "screen-2603": { "image": 10560362, },  // idr0094B
    "project-1402": { "image": 11511168, },  // idr0095A
    "project-1403": { "image": 11511984, },  // idr0095B
    "project-1404": { "image": 11512177, },  // idr0095C
    "project-2102": { "image": 13461739, },  // idr0096A
    "project-2103": { "image": 13461816, },  // idr0096B
    "project-1602": { "image": 12532806, },  // idr0097B
    "project-1603": { "image": 12532833, },  // idr0097C
    "screen-2801": { "image": 12529301, },  // idr0097A
    "project-1605": { "image": 12533815, },  // idr0098A
    "project-1606": { "image": 12539666, },  // idr0098B
    "project-1651": { "image": 12557110, },  // idr0099
    "project-1451": { "image": 11576516, },  // idr0100
    "project-2051": { "image": 13457541, },  // idr0101A
    "project-2052": { "image": 13457423, },  // idr0101B
    "project-1501": { "image": 12074276, },  // idr0103
    "project-1701": { "image": 12689244, },  // idr0106
    "project-1854": { "image": 13417058, },  // idr0107
    "project-1951": { "image": 13425427, },  // idr0108
    "project-1801": { "image": 12922839, },  // idr0109
    "project-1902": { "image": 13422206, },  // idr0110
    "project-1852": { "image": 13416839, },  // idr0111
    "project-1853": { "image": 13416991, },  // idr0111B
    "screen-3001": { "image": 13444729, },  // idr0112
    "project-1903": { "image": 13425213, },  // idr0113
    "project-2151": { "image": 13462232, },  // idr0114
    "project-2053": { "image": 13457674, },  // idr0116
    "project-2001": { "image": 13441324, },  // idr0117
    "project-2101": { "image": 13461595, },  // idr0118
    "project-2201": { "image": 13965767, },  // idr0124
  }

  let idrIds = [];
  console.log("model.studies", model.studies)

  let html = "";
  if (!groupByType) {
    // Show all studies...
    html = model.studies.map(study => {
      let idrId = study.Name.split("-")[0];
        // Ignore multiple projects/screens from same study/publication
      if (idrIds.includes(idrId)) {
        return '';
      }
      idrIds.push(idrId);
      let src = `${BASE_URL}webgateway/render_thumbnail/${studyThumbs[study.objId]?.image}/`;

      let title = escapeHTML(getStudyTitle(model, study));
      console.log(title);
      return `
        <div class="studyThumb" data-title="${title}" title="${idrId}" data-obj_type="${study.type}" data-obj_id="${study.id}">
          <img class="studyImage" src="${src}"/>
        </div>
    `}).join("");
  } else {
    // group by Categories
    let categories = Object.keys(CATEGORY_QUERIES);
    // Sort by index
    categories.sort(function (a, b) {
      let idxA = CATEGORY_QUERIES[a].index;
      let idxB = CATEGORY_QUERIES[b].index;
      return (idxA > idxB ? 1 : idxA < idxB ? -1 : 0);
    });

    let allIds = [];

    html = categories.map(category => {

      let cat = CATEGORY_QUERIES[category];
      let query = cat.query;

      // Find matching studies
      let matches = model.filterStudiesByMapQuery(query);
      console.log("query", cat.label, matches.length)
      if (matches.length == 0) return '';

      let catIds = [];

      let catThumbs = matches.map(study => {
        let idrId = study.Name.split("-")[0];
        // Ignore multiple projects/screens from same study/publication
        if (cat.label !== "Others" && catIds.includes(idrId)) {
          return '';
        }
        if (cat.label === "Others" && allIds.includes(idrId)) {
          return '';
        }
        catIds.push(idrId);
        allIds.push(idrId);
        let src = `${BASE_URL}webgateway/render_thumbnail/${studyThumbs[study.objId]?.image}/`;
        return `
          <div class="studyThumb" title="${idrId}" data-obj_type="${study.type}" data-obj_id="${study.id}">
            <img class="studyImage" src="${src}"/>
          </div>
        `
      }).join("");

      return `
        <div style="clear:left">
          <div style="color:#666">${cat.label}</div>
          <div>
          ${catThumbs}
          </div>
        </div>`
    }).join("");
  }

  document.getElementById('studies').innerHTML = html;

  tippy('.studyThumb', {
    // content: '<div style="width:max-content"><p> tooltip!<br>Test<p><div>',
    content: (reference) => {
      let src = reference.children[0].src;
      let studyName = reference.getAttribute('title');
      let title = reference.dataset.title;
      return `<div style="width:max-content; padding:2px 0 3px; margin:0">
        <div>${studyName}</div>
        <div style="max-width:300px; margin-bottom: 5px">${title}</div>
        <img src="${src}"/>
        </div>`;
    },
    theme: 'light-border',
    allowHTML: true,
    moveTransition: 'transform 2s ease-out',
  });
  instance.show();
}


function renderStudy(studyData, elementId, linkFunc) {

  // Add Project or Screen to the page
  let title;
  for (let i = 0; i < TITLE_KEYS.length; i++) {
    title = model.getStudyValue(studyData, TITLE_KEYS[i]);
    if (title) {
      break;
    }
  }
  if (!title) {
    title = studyData.Name;
  }
  let type = studyData['@type'].split('#')[1].toLowerCase();
  let studyLink = linkFunc(studyData);
  // save for later
  studyData.title = title;

  let desc = studyData.Description;
  let studyDesc;
  if (desc) {
    // If description contains title, use the text that follows
      if (title.length > 0 && desc.indexOf(title) >1) {
          desc = desc.split(title)[1];
        }
    // Remove blank lines (and first 'Experiment Description' line)
      studyDesc = desc.split('\n')
          .filter(l => l.length > 0)
          .filter(l => l !== 'Experiment Description' && l !== 'Screen Description')
          .join('\n');
    if (studyDesc.indexOf('Version History') > 1) {
        studyDesc = studyDesc.split('Version History')[0];
      }
  }

  let shortName = getStudyShortName(studyData);
  let authors = model.getStudyValue(studyData, "Publication Authors") || "";

  // Function (and template) are defined where used in index.html
  let html = studyHtml({ studyLink, studyDesc, shortName, title, authors, BASE_URL, type }, studyData)

  var div = document.createElement("div");
  div.innerHTML = html;
  div.className = "row study ";
  div.dataset.obj_type = type;
  div.dataset.obj_id = studyData['@id'];
  document.getElementById(elementId).appendChild(div);
}

// --------- Render utils -----------

function studyHtml(props, studyData) {
  let pubmed = model.getStudyValue(studyData, 'PubMed ID');
  if (pubmed) {
    pubmed = pubmed.split(" ")[1];
  };
  let author = props.authors.split(',')[0] || '';
  if (author) {
    author = `${author} et al.`;
    author = author.length > 23 ? author.slice(0, 20) + '...' : author;
  }
  return `
  <div style='white-space:nowrap'>
    ${props.shortName}
    ${pubmed ? `<a class='pubmed' target="_blank" href="${pubmed}"> ${author}</a>` : author}
  </div>
  <div class="studyImage">
    <a target="_blank" href="${props.studyLink}">
      <div style="height: 100%; width: 100%">
        <div class="studyText">
          <p title='${props.studyDesc || ''}'>
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
  `
}


function loadStudyThumbnails() {

  let ids = [];
  // Collect study IDs 'project-1', 'screen-2' etc
  $('div.study').each(function () {
    let obj_id = $(this).attr('data-obj_id');
    let obj_type = $(this).attr('data-obj_type');
    if (obj_id && obj_type) {
      ids.push(obj_type + '-' + obj_id);
    }
  });

  // Load images
  model.loadStudiesThumbnails(ids, (data) => {
    // data is e.g. { project-1: {thumbnail: base64data, image: {id:1}} }
    for (let id in data) {
      let obj_type = id.split('-')[0];
      let obj_id = id.split('-')[1];
      let elements = document.querySelectorAll(`div[data-obj_type="${obj_type}"][data-obj_id="${obj_id}"]`);
      for (let e = 0; e < elements.length; e++) {
        // Find all studies matching the study ID and set src on image
        let element = elements[e];
        let studyImage = element.querySelector('.studyImage');
        studyImage.style.backgroundImage = `url(${data[id].thumbnail})`;
        // viewer link
        let iid = data[id].image.id;
        let link = `${BASE_URL}webclient/img_detail/${iid}/`;
        element.querySelector('a.viewerLink').href = link;
      }
    }
  });
}

function renderStudyKeys() {
  if (FILTER_KEYS.length > 0) {
    let html = FILTER_KEYS
      .map(key => {
        if (key.label && key.value) {
          return `<option value="${key.value}">${key.label}</option>`
        }
        return `<option value="${key}">${key}</option>`
      })
      .join("\n");
    document.getElementById('studyKeys').innerHTML = html;
    // Show the <optgroup> and the whole form
    document.getElementById('studyKeys').style.display = 'block';
    document.getElementById('search-form').style.display = 'block';
  }
}
renderStudyKeys();


// ----------- Load / Filter Studies --------------------

// Do the loading and render() when done...
model.loadStudies(() => {
  // Immediately filter by Super category
  if (SUPER_CATEGORY && SUPER_CATEGORY.query) {
    model.studies = model.filterStudiesByMapQuery(SUPER_CATEGORY.query);
  }
  render();
});

document.getElementById("groupByType").addEventListener("change", function(event){
  console.log("check", event.target.checked)
  render(event.target.checked);
})


// Load MAPR config
fetch(BASE_URL + 'mapr/api/config/')
  .then(response => response.json())
  .then(data => {
    mapr_settings = data;

    let options = FILTER_MAPR_KEYS.map(key => {
      let config = mapr_settings[key];
      if (config) {
        return `<option value="mapr_${key}">${config.label}</option>`;
      } else {
        return "";
      }
    });
    if (options.length > 0) {
      document.getElementById('maprKeys').innerHTML = options.join("\n");
      // Show the <optgroup> and the whole form
      document.getElementById('maprKeys').style.display = 'block';
      document.getElementById('search-form').style.display = 'block';
    }
  })
  .catch(function (err) {
    console.log("mapr not installed (config not available)");
  });
