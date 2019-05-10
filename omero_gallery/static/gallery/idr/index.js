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

$("#maprQuery").autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function( request, response ) {

        // if configId is not from mapr, we filter on mapValues...
        let configId = document.getElementById("maprConfig").value;
        if (configId.indexOf('mapr_') != 0) {

          let matches = model.getKeyValueAutoComplete(configId, request.term);
          response(matches);
          return;
        }

        // If empty, don't handle mapr...
        if (request.term.length === 0) {
          return;
        }

        // Auto-complete to filter by mapr...
        configId = configId.replace('mapr_', '');
        let url = `${ BASE_URL }/mapr/api/autocomplete/${ configId }/`;
        let case_sensitive = false;

        $.ajax({
            dataType: "json",
            type : 'GET',
            url: url,
            data: {
                value: case_sensitive ? request.term : request.term.toLowerCase(),
                query: true,
                case_sensitive: case_sensitive,
                '_': Math.random,    // cache-buster
            },
            success: function(data) {
                if (data.length > 0) {
                    response( $.map( data, function(item) {
                        return item;
                    }));
                } else {
                   response([{ label: 'No results found.', value: -1 }]);
                }
            },
            error: function(data) {
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
  // If filterKey, try to render the Key: Value
  let titleRe = /Publication Title\n(.+)[\n]?/
  // let descRe = /Experiment Description\n(.+)[\n]?/
  let desc = studyData.Description;
  let match = titleRe.exec(desc);
  let title = match ? match[1] : '';
  let type = studyData['@type'].split('#')[1].toLowerCase();
  let studyLink = linkFunc(studyData);
  // save for later
  studyData.title = title;

  if (title.length >0) {
     desc = desc.split(title)[1];
   }
  // First line is e.g. "Screen Description". Show NEXT line only.
  let studyDesc = desc.split('\n').filter(l => l.length > 0)[1];

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

  document.querySelectorAll('div.study').forEach(element => {
    // Load image ID for study, then update DOM to load thumbnail
    let obj_id = element.dataset.obj_id;
    let obj_type = element.dataset.obj_type;
    if (!obj_id || !obj_type) return;

    model.loadImage(obj_type, obj_id, (image) => {
      let iid = image['@id'];
      // Render thumbnail by default
      let thumbUrl = `${ BASE_URL }/webgateway/render_thumbnail/${ iid }/`;
      // If we know the image is not Big, can render whole plane
      if (image.Pixels && image.Pixels.SizeX * image.Pixels.SizeY < 10000000) {
        thumbUrl = `${ BASE_URL }/webgateway/render_image/${ iid }/`;
      }
      // Find all studies matching the study ID and set src on image
      let studyImage = element.querySelector('img.studyImage');
      studyImage.src = thumbUrl;

      // viewer link
      let link = `${ BASE_URL }/webclient/img_detail/${ iid }/`;
      element.querySelector('a.viewerLink').href = link;
    });
  });
}

function renderStudyKeys() {
  let html = FILTER_KEYS
      .map(key => `<option value="${ key }">${ key }</option>`)
      .join("\n");
  document.getElementById('studyKeys').innerHTML = html;
  document.getElementById('maprConfig').value = "Publication Authors";
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