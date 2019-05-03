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
  render();
}

// ------ AUTO-COMPLETE -------------------

$("#maprQuery").autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function( request, response ) {

        // Empty - clear filter
        if (request.term.length === 0) {
          render();
          return;
        }

        // if configId is not from mapr, we filter on mapValues...
        let configId = document.getElementById("maprConfig").value;
        if (configId.indexOf('mapr_') != 0) {

          let matches = model.getKeyValueAutoComplete(configId, request.term);
          response(matches);

          // filter studies by Key-Value pairs
          let filterFunc = study => {
            let show = false;
            study.mapValues.forEach(kv => {
              if (kv[0] === configId && kv[1].toLowerCase().indexOf(request.term.toLowerCase()) > -1) {
                show = true;
              }
            });
            return show;
          }
          render(filterFunc);
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
  CATEGORY_QUERIES.forEach(cat => {
    let query = cat.query;

    // Find matching studies
    let matches = model.studies.filter(study => {
      let match = false;
      // first split query by AND and OR
      let ors = query.split(' OR ');
      ors.forEach(term => {
        let allAnds = true;
        let ands = term.split(' AND ');
        ands.forEach(mustMatch => {
          let queryKeyValue = mustMatch.split(":");
          let valueMatch = false;
          // check all key-values (may be duplicate keys) for value that matches
          for (let i=0; i<study.mapValues.length; i++){
            let kv = study.mapValues[i];
            if (kv[0] === queryKeyValue[0] && kv[1].indexOf(queryKeyValue[1]) > -1) {
              valueMatch = true;
            }
          }
          // if not found, then our AND term fails
          if (!valueMatch) {
            allAnds = false;
          }
        });
        if (allAnds) {
          match = true;
        }
      });
      return match;
    });

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
  let studyThumbUrl = studyThumbnailUrl(type, studyData['@id']);
  // save for later
  studyData.title = title;

  if (title.length >0) {
     desc = desc.split(title)[1];
   }
  // First line is e.g. "Screen Description". Show NEXT line only.
  let studyDesc = desc.split('\n').filter(l => l.length > 0)[1];

  let idrId = studyData.Name.split('-')[0];  // idr0001
  let authors = model.getStudyValue(studyData, "Publication Authors") || "";
  let imgId = THUMB_IDS[`${type}-${studyData['@id']}`];

  let html = `
    <a target="_blank" href="${ studyLink }">
      <div class="studyBackground" style="padding: 0">
        <img class="studyImage" src="${ studyThumbUrl }" />
      </div>
      <div class="studyText">
        <p title="${ studyDesc }">
          <span style='color:#1976d2'>${ idrId }</span>:
          ${ title }
        </p>
      </div>
      <div class="studyAuthors">
        ${ authors }
      </div>
    </a>
    <a class="viewerLink" title="Open image in viewer" target="_blank"
       href="${ BASE_URL }/webclient/img_detail/${ imgId }/">
      <i class="fas fa-eye"></i>
    </a>
    `

  var div = document.createElement( "div" );
  div.innerHTML = html;
  div.className = "row study ";
  document.getElementById(elementId).appendChild(div);
}

// --------- Render utils -----------
function studyThumbnailUrl(obj_type, obj_id) {
  let key = `${obj_type}-${obj_id}`;
  if (THUMB_IDS[key]) {
    return `${ BASE_URL }/webgateway/render_image/${THUMB_IDS[key]}/`;
  }
  // return `/gallery/study_thumbnail/${ obj_type }/${ obj_id }/`;
  return '';
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


function filter_by_type(studies) {

  let filtered = studies;
  if (IDR_TYPE && IDR_TYPE != "None") {
    // We hard-code filtering, but could use e.g. Tags on Studies to specify Cells/Tissue
    filtered = studies.filter(study => {
      let isTissue = TISSUE_STUDIES.indexOf(study.Name.substr(0, 7)) > -1;
      return IDR_TYPE === "tissue" ? isTissue : !isTissue;
    });
  }
  return filtered;
}

// Do the loading and render() when done...
model.loadStudies(filter_by_type, render);


// Load MAPR config
fetch('/gallery/idr/mapr/config/')
  .then(response => response.json())
  .then(data => {
    mapr_settings = data;

    let html = "";
    for (id in mapr_settings) {
      let config = mapr_settings[id];
      html = html + `<option value="mapr_${ id }">${ config.label }</option>`;
    }
    document.getElementById('maprKeys').innerHTML = html;
  });