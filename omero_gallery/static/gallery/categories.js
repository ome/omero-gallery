// loaded below
let mapr_settings = {};

// Model for loading Projects, Screens and their Map Annotations
let model = new StudiesModel();


// ----- event handling --------

document.getElementById('maprConfig').onchange = (event) => {
  document.getElementById('maprQuery').value = '';
  let value = event.target.value.replace('mapr_', '');
  let placeholder = mapr_settings[value] ? mapr_settings[value].default[0] : value;
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
      document.location.href = `search/?query=${ configId }:${ event.target.value }`;
    }
  })
  .autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function( request, response ) {

        // if configId is not from mapr, we filter on mapValues...
        let configId = document.getElementById("maprConfig").value;
        if (configId.indexOf('mapr_') != 0) {

          let matches;
          if (configId === 'Name') {
            matches = model.getStudiesNames(request.term);
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
            '_': CACHE_BUSTER,    // CORS cache-buster
        }
        let url;
        if (request.term.length === 0) {
          // Try to list all top-level values.
          // This works for 'wild-card' configs where number of values is small e.g. Organism
          // But will return empty list for e.g. Gene
          url = `${ BASE_URL }/mapr/api/${ configId }/`;
          requestData.orphaned = true
        } else {
          // Find auto-complete matches
          url = `${ BASE_URL }/mapr/api/autocomplete/${ configId }/`;
          requestData.value = case_sensitive ? request.term : request.term.toLowerCase();
          requestData.query = true;   // use a 'like' HQL query
        }
        showSpinner();
        $.ajax({
            dataType: "json",
            type : 'GET',
            url: url,
            data: requestData,
            success: function(data) {
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
                    response( $.map( data, function(item) {
                        return item;
                    }));
                } else {
                   response([{ label: 'No results found.', value: -1 }]);
                }
            },
            error: function(data) {
                hideSpinner();
                response([{ label: 'Error occured.', value: -1 }]);
            }
        });
    },
    minLength: 0,
    open: function() {},
    close: function() {
        // $(this).val('');
        return false;
    },
    focus: function(event,ui) {},
    select: function(event, ui) {
        let configId = document.getElementById("maprConfig").value;
        document.location.href = `search/?query=${ configId }:${ ui.item.value }`;
        return false;
    }
}).data("ui-autocomplete")._renderItem = function( ul, item ) {
    return $( "<li>" )
        .append( "<a>" + item.label + "</a>" )
        .appendTo( ul );
}

// ------------ Render -------------------------

function render() {
  document.getElementById('studies').innerHTML = "";

  let categories = Object.keys(CATEGORY_QUERIES);
   // Sort by index
  categories.sort(function(a, b) {
    let idxA = CATEGORY_QUERIES[a].index;
    let idxB = CATEGORY_QUERIES[b].index;
    return (idxA > idxB ? 1 : idxA < idxB ? -1 : 0);
  });
  
  categories.forEach(category => {
    let cat = CATEGORY_QUERIES[category];
    let query = cat.query;

    // Find matching studies
    let matches = model.filterStudiesByMapQuery(query);
    if (matches.length == 0) return;

    var div = document.createElement( "div" );
    div.innerHTML = `<h1 title="${query}">${cat.label} (${ matches.length })</h1>
      <div style="width100%; overflow:auto; background: white">
        <div id="${cat.label}" style="width: 5000px"></div>
      </div>
    `;
    div.className = "row";
    document.getElementById('studies').appendChild(div);

    // By default, we link to the study itself in IDR...
    let linkFunc = (studyData) => {
      let type = studyData['@type'].split('#')[1].toLowerCase();
      return `${ BASE_URL }/webclient/?show=${ type }-${ studyData['@id'] }`;
    }

    matches.forEach(study => renderStudy(study, cat.label, linkFunc));
  });

  // Now we iterate all Studies in DOM, loading image ID for link and thumbnail
  loadStudyThumbnails();
}


function renderStudy(studyData, elementId, linkFunc) {

  // Add Project or Screen to the page
  let title;
  for (let i=0; i<TITLE_KEYS.length; i++) {
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
    if (title.length > 0 && desc.indexOf(title) > -1) {
      desc = desc.split(title)[1];
    }
    // Remove blank lines
    studyDesc = desc.split('\n').filter(l => l.length > 0).join('\n');
  }

  let idrId = studyData.Name.split('-')[0];  // idr0001
  let authors = model.getStudyValue(studyData, "Publication Authors") || "";

  // Function (and template) are defined where used in index.html
  let html = studyHtml(studyLink, studyDesc, idrId, title, authors, BASE_URL)

  var div = document.createElement( "div" );
  div.innerHTML = html;
  div.className = "row study ";
  div.dataset.obj_type = type;
  div.dataset.obj_id = studyData['@id'];
  document.getElementById(elementId).appendChild(div);
}

// --------- Render utils -----------
function loadStudyThumbnails() {

  let ids = [];
  // Collect study IDs 'project-1', 'screen-2' etc
  document.querySelectorAll('div.study').forEach(element => {
    let obj_id = element.dataset.obj_id;
    let obj_type = element.dataset.obj_type;
    if (obj_id && obj_type) {
      ids.push(obj_type + '=' + obj_id);
    }
  });

  // Load images
  model.loadStudiesThumbnails(ids, (data) => {
    // data is e.g. { project-1: {thumbnail: base64data, image: {id:1}} }
    for (id in data) {
      let obj_type = id.split('-')[0];
      let obj_id = id.split('-')[1];
      let elements = document.querySelectorAll(`div[data-obj_type="${obj_type}"][data-obj_id="${obj_id}"]`);
      for (let e=0; e<elements.length; e++) {
        // Find all studies matching the study ID and set src on image
        let element = elements[e];
        let studyImage = element.querySelector('img.studyImage');
        studyImage.src = data[id].thumbnail;
        // viewer link
        let iid = data[id].image.id;
        let link = `${ BASE_URL }/webclient/img_detail/${ iid }/`;
        element.querySelector('a.viewerLink').href = link;
      }
    }
  });
}

function renderStudyKeys() {
  let html = FILTER_KEYS
      .map(key => {
        if (key.label && key.value) {
          return `<option value="${ key.value }">${ key.label }</option>`
        }
        return `<option value="${ key }">${ key }</option>`
      })
      .join("\n");
  document.getElementById('studyKeys').innerHTML = html;
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


// Load MAPR config
fetch(GALLERY_INDEX + 'idr/mapr/config/')
  .then(response => response.json())
  .then(data => {
    mapr_settings = data;

    let html = FILTER_MAPR_KEYS.map(key => {
      let config = mapr_settings[key];
      if (config) {
        return `<option value="mapr_${ key }">${ config.label }</option>`;
      } else {
        return "";
      }
    }).join("\n");
    document.getElementById('maprKeys').innerHTML = html;
  });