// loaded below
let mapr_settings = {};

// queries are split first by ' OR ' clauses. Each may have an AND
const CATEGORIES = [
  {"label": "Time-lapse", "query": "Study Type:time OR Study Type:5D OR Study Type:3D-tracking"},
  {"label": "Light sheet", "query": "Study Type:light sheet"},
  {"label": "Protein localization", "query": "Study Type:protein localization"},
  {"label": "Histology", "query": "Study Type:histology"},
  {"label": "Yeast", "query": "Organism:Saccharomyces cerevisiae OR Organism:Schizosaccharomyces pombe"},
  {"label": "Human Cell Screen", "query": "Organism:Homo sapiens AND Study Type:high content screen"},
]

const THUMB_IDS = {'project-701': 5025553, 'project-504': 4495405, 'project-754': 5514116, 'project-753': 5514054, 'project-752': 5514379,
           'project-552': 4007821, 'project-505': 4991000, 'project-503': 4496813, 'project-405': 3509516, 'project-502': 4007804,
           'project-501': 3899001, 'project-402': 3429220, 'project-404': 3430746, 'project-401': 3490890, 'project-353': 3414088,
           'project-352': 3414075, 'project-351': 3414020, 'screen-1654': 3002517, 'screen-1653': 2959817, 'screen-1901': 3261920,
           'screen-2001': 3414101, 'screen-1952': 1895788, 'project-201': 3125701, 'screen-1651': 2868079, 'project-151': 2858200,
           'screen-1652': 2892586, 'screen-1801': 3126552, 'screen-1751': 3191232, 'project-301': 3261651, 'screen-1851': 3260452,
           'project-52': 1885617, 'screen-2051': 4996332, 'project-51': 1884807, 'screen-1204': 1874776, 'screen-1203': 1851808,
           'project-101': 1919065, 'screen-1151': 1674502, 'screen-1251': 2042278, 'screen-1201': 1816624, 'screen-1302': 2858452,
           'screen-1101': 1483352, 'screen-1202': 1811248, 'screen-1603': 2857882, 'screen-1251': 2042278, 'screen-1602': 2958952,
           'screen-1601': 2857796, 'screen-1551': 2855969, 'screen-1501': 2849751, 'screen-1351': 1921252, 'screen-803': 1313418,
           'screen-251': 171248, 'screen-206': 106450, 'screen-154': 35446, 'screen-201': 95412, 'screen-253': 352577,
           'screen-751': 928389, 'screen-597': 933573, 'screen-202': 692151, 'screen-51': 13852, 'screen-102':179694, 'screen-3': 1463}

const FILTER_KEYS = ["Imaging Method", "Organism", "Publication Authors", "Publication Title",
                     "Screen Technology Type", "Screen Type", "Study Type"]


// Model for loading Projects, Screens and their Map Annotations
let model = new StudiesModel();


function studyThumbnailUrl(obj_type, obj_id) {
  let key = `${obj_type}-${obj_id}`;
  if (THUMB_IDS[key]) {
    return `http://idr.openmicroscopy.org/webgateway/render_image/${THUMB_IDS[key]}/`;
  }
  // return `/gallery/study_thumbnail/${ obj_type }/${ obj_id }/`;
  return '';
}


// ----- event handling --------

document.getElementById('maprConfig').onchange = (event) => {
  document.getElementById('maprQuery').value = '';
  let value = event.target.value.replace('mapr_', '');
  let placeholder = mapr_settings[value] ? mapr_settings[value].default[0] : value;
  document.getElementById('maprQuery').placeholder = placeholder;
  render();
}

function getStudyValue(study, key) {
  if (!study.mapValues) return;
  for (let i=0; i<study.mapValues.length; i++){
    let kv = study.mapValues[i];
    if (kv[0] === key) {
      return kv[1];
    }
  }
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

          let matches = getKeyValueAutoComplete(studies, configId, request.term);
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
  console.log('render', model.studies);
  CATEGORIES.forEach(cat => {
    let query = cat.query;
    // console.log('category', cat);

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

    matches.forEach(study => renderStudy(study, cat.label));
  });
}


function renderStudy(studyData, elementId) {
  // By default, we link to the study itself in IDR...
  let linkFunc = (studyData) => {
    let type = studyData['@type'].split('#')[1].toLowerCase();
    return `http://idr.openmicroscopy.org/webclient/?show=${ type }-${ studyData['@id'] }`;
  }
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
  let authors = getStudyValue(studyData, "Publication Authors") || "";
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
       href="http://idr.openmicroscopy.org/webclient/img_detail/${ imgId }/">
      <i class="fas fa-eye"></i>
    </a>
    `

  var div = document.createElement( "div" );
  div.innerHTML = html;
  div.className = "row study ";
  document.getElementById(elementId).appendChild(div);
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
    let tissueStudies = ['idr0018', 'idr0032', 'idr0042', 'idr0043', 'idr0054']
    filtered = studies.filter(study => {
      let isTissue = tissueStudies.indexOf(study.Name.substr(0, 7)) > -1;
      return IDR_TYPE === "tissue" ? isTissue : !isTissue;
    });
  }
  return filtered;
}


console.log('created StudiesModel');
model.loadStudies(render);

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