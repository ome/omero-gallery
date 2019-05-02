

// Model for loading Projects, Screens and their Map Annotations
let model = new StudiesModel();

function renderStudyKeys() {
  let html = FILTER_KEYS
      .map(key => `<option value="${ key }">${ key }</option>`)
      .join("\n");
  document.getElementById('studyKeys').innerHTML = html;
  document.getElementById('maprConfig').value = "Publication Authors";
}
renderStudyKeys();


// FIRST, populate forms from query string
function populateInputsFromSearch() {
  let search = window.location.search.substr(1);
  let query = '';
  var searchParams = search.split('&');
  for (var i = 0; i < searchParams.length; i++) {
    var paramSplit = searchParams[i].split('=');
    if (paramSplit[0] === 'query') {
        query = paramSplit[1].replace(/%20/g, " ");
    }
  }
  if (query) {
    let configId = query.split(":")[0];
    let value = query.split(":")[1];
    if (configId && value) {
      document.getElementById("maprConfig").value = configId;
      document.getElementById("maprQuery").value = value;
    }
  }
}
populateInputsFromSearch();


function study_thumbnail_url(obj_type, obj_id) {
  let key = `${obj_type}-${obj_id}`;
  if (THUMB_IDS[key]) {
    return `http://idr.openmicroscopy.org/webgateway/render_thumbnail/${THUMB_IDS[key]}/`;
  }
  // return `/gallery/study_thumbnail/${ obj_type }/${ obj_id }/`;
  return '';
}


// ------------ Handle MAPR searching or filtering --------------------- 

function filterStudiesByMapr(value) {
  let configId = document.getElementById("maprConfig").value.replace("mapr_", "");
  let url = `http://idr.openmicroscopy.org/mapr/api/${ configId }/?value=${ value }`;
  // Cache-buster. See https://trello.com/c/GpXEHzjV/519-cors-access-control-allow-origin-cached
  url += '&_=' + Math.random();
  $.getJSON(url, (data) => {
    // filter studies by 'screens' and 'projects'
    let filteredIds = data.screens.map(s => `screen-${ s.id }`)
        .concat(data.projects.map(p => `project-${ p.id }`));
    let filterFunc = study => {
      let studyId = study['@type'].split('#')[1].toLowerCase() + '-' + study['@id'];
      return filteredIds.indexOf(studyId) > -1;
    }

    render(filterFunc);
  })
}

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
        let url = `http://idr.openmicroscopy.org/mapr/api/autocomplete/${ configId }/`;
        let case_sensitive = false;

        $.ajax({
            dataType: "json",
            type : 'GET',
            url: url,
            data: {
                value: case_sensitive ? request.term : request.term.toLowerCase(),
                query: true,
                case_sensitive: case_sensitive,
                "_": Math.random()     // cache-buster
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
        $(this).val(ui.item.value);
        filterAndRender();

        return false;
    }
}).data("ui-autocomplete")._renderItem = function( ul, item ) {
    return $( "<li>" )
        .append( "<a>" + item.label + "</a>" )
        .appendTo( ul );
}


// ------------ Render -------------------------

function filterAndRender() {
  let configId = document.getElementById("maprConfig").value;
  let value = document.getElementById("maprQuery").value;
  if (!value) {
    render();
    return;
  }
  if (configId.indexOf('mapr_') != 0) {
    // filter studies by Key-Value pairs
    let filterFunc = study => {
      let show = false;
      study.mapValues.forEach(kv => {
        if (kv[0] === configId && kv[1].toLowerCase().indexOf(value.toLowerCase()) > -1) {
          show = true;
        }
      });
      return show;
    }
    render(filterFunc);
  } else {
    filterStudiesByMapr(value);
  }
}

function render(filterFunc) {
  document.getElementById('studies').innerHTML = "";

  if (!filterFunc) return;

  let configId = document.getElementById("maprConfig").value;
  let filterKey;
  if (!(configId.indexOf('mapr_') === 0)) {
    filterKey = configId;
  }
  let studiesToRender = model.studies;
  if (filterFunc) {
    studiesToRender = model.studies.filter(filterFunc);
  }

  let filterMessage = "";
  if (studiesToRender.length < studies.length) {
    filterMessage = `Showing ${ studiesToRender.length } of ${ studies.length} studies`;
  }
  document.getElementById('filterCount').innerHTML = filterMessage;

  // By default, we link to the study itself in IDR...
  let linkFunc = (studyData) => {
    let type = studyData['@type'].split('#')[1].toLowerCase();
    return `http://idr.openmicroscopy.org/webclient/?show=${ type }-${ studyData['@id'] }`;
  }

  //...but if we're filtering by MAPR
  if (configId.indexOf('mapr_') == 0 && studiesToRender.length < model.studies.length) {
    linkFunc = (studyData) => {
      let type = studyData['@type'].split('#')[1].toLowerCase();
      let maprKey = configId.replace('mapr_', '');
      let maprValue = document.getElementById('maprQuery').value;
      return `/mapr/${ maprKey }/?value=${ maprValue }&show=${ type }-${ studyData['@id'] }`;
    }
  }

  studiesToRender.forEach(s => renderStudy(s, filterKey, linkFunc));
}


function renderStudy(studyData, filterKey, linkFunc) {
  // Add Project or Screen to the page
  // If filterKey, try to render the Key: Value
  let titleRe = /Publication Title\n(.+)[\n]?/
  // let descRe = /Experiment Description\n(.+)[\n]?/
  let desc = studyData.Description;
  let match = titleRe.exec(desc);
  let title = match ? match[1] : '';
  let type = studyData['@type'].split('#')[1].toLowerCase();
  let studyLink = linkFunc(studyData);
  let studyThumbUrl = study_thumbnail_url(type, studyData['@id']);
  // save for later
  studyData.title = title;

  if (title.length >0) {
     desc = desc.split(title)[1];
   }
  // First line is e.g. "Screen Description". Show NEXT line only.
  let studyDesc = desc.split('\n').filter(l => l.length > 0)[1];

  let idrId = studyData.Name.split('-')[0];  // idr0001

  let html = `
  <div class="row study">
    <a target="_blank" href="${ studyLink }">
      <div class="small-3 medium-3 large-3 columns" style="padding: 0">
        <img class="thumbnail" src="${ studyThumbUrl }" />
      </div>
      <div class="small-9 medium-9 large-9 columns">
        <p title="${ studyDesc }">
          <span style='color:#1976d2'>${ idrId }</span>:
          ${ title }
        </p>
      </div>
    </a>
  </div>`

  var div = document.createElement( "div" );
  div.innerHTML = html;
  div.className = "small-12 medium-6 large-4 columns";
  document.getElementById('studies').appendChild(div);
}

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
model.loadStudies(filter_by_type, filterAndRender);


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

    populateInputsFromSearch();
  });
