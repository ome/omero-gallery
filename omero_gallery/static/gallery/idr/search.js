

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


function studyThumbnailUrl(obj_type, obj_id) {
  let key = `${obj_type}-${obj_id}`;
  if (THUMB_IDS[key]) {
    return `${ BASE_URL }/webgateway/render_image/${THUMB_IDS[key]}/`;
  }
  // return `/gallery/study_thumbnail/${ obj_type }/${ obj_id }/`;
  return '';
}


// ------------ Handle MAPR searching or filtering --------------------- 

function filterStudiesByMapr(value) {
  let configId = document.getElementById("maprConfig").value.replace("mapr_", "");
  let url = `${ BASE_URL }/mapr/api/${ configId }/?value=${ value }`;
  // Cache-buster. See https://trello.com/c/GpXEHzjV/519-cors-access-control-allow-origin-cached
  url += '&_=' + Math.random();
  $.getJSON(url, (data) => {
    // filter studies by 'screens' and 'projects'
    let imageCounts = {};
    data.screens.forEach(s => {imageCounts[`screen-${ s.id }`] = s.extra.counter});
    data.projects.forEach(s => {imageCounts[`project-${ s.id }`] = s.extra.counter});

    let filterFunc = study => {
      let studyId = study['@type'].split('#')[1].toLowerCase() + '-' + study['@id'];
      return imageCounts.hasOwnProperty(studyId);
    }

    let maprData = model.studies.filter(filterFunc).map(study => {
      let studyId = study['@type'].split('#')[1].toLowerCase() + '-' + study['@id'];
      let studyData = Object.assign({}, study);
      studyData.imageCount = imageCounts[studyId];
      return studyData;
    });

    renderMapr(maprData);
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

function renderMapr(maprData) {
  document.getElementById('studies').innerHTML = "";

  let configId = document.getElementById("maprConfig").value;
  let linkFunc = (studyData) => {
    let type = studyData['@type'].split('#')[1].toLowerCase();
    let maprKey = configId.replace('mapr_', '');
    let maprValue = document.getElementById('maprQuery').value;
    return `/mapr/${ maprKey }/?value=${ maprValue }&show=${ type }-${ studyData['@id'] }`;
  }
  htmlFunc = maprHtml;

  let totalCount = maprData.reduce((count, data) => count + data.imageCount, 0);
  let filterMessage = `Found ${ totalCount } images in ${ maprData.length} studies`;
  document.getElementById('filterCount').innerHTML = filterMessage;

  maprData.forEach(s => renderStudy(s, 'studies', linkFunc, htmlFunc));

  // load images for each study...
  document.querySelectorAll(".maprText").forEach(element => {
    // load children in MAPR jsTree query to get images
    let studyId = element.id;
    let objId = studyId.split("-")[1];
    let objType = studyId.split("-")[0];
    let childType = objType === "project" ? "datasets" : "plates";
    let configId = document.getElementById("maprConfig").value.replace('mapr_', '');
    let maprValue = document.getElementById('maprQuery').value;
    let url = `${ BASE_URL }/mapr/api/${ configId }/${ childType }/?value=${ maprValue }&id=${ objId }`;
    url += '&_=' + Math.random();
    fetch(url)
      .then(response => response.json())
      .then(data => {
        let firstChild = data[childType][0];
        let imagesUrl = `${ BASE_URL }/mapr/api/${ configId }/images/?value=${ maprValue }&id=${ firstChild.id }&node=${ firstChild.extra.node }`;
        imagesUrl += '&_=' + Math.random();
        return fetch(imagesUrl);
      })
      .then(response => response.json())
      .then(data => {
        let html = data.images.slice(0, 4).map(i => `
          <a href="${ BASE_URL }/webclient/img_detail/${ i.id }/" target="_blank">
            <img class="thumbnail" src="${ BASE_URL }/webgateway/render_thumbnail/${ i.id }/">
          </a>`).join("");
        // Find the container and add images html
        $("#"+element.id).append(html);
      });
  });
}

function render(filterFunc) {
  document.getElementById('studies').innerHTML = "";

  if (!filterFunc) {
    document.getElementById('filterCount').innerHTML = "";
    return;
  }

  let studiesToRender = model.studies;
  if (filterFunc) {
    studiesToRender = model.studies.filter(filterFunc);
  }

  let filterMessage = "";
  if (studiesToRender.length < model.studies.length) {
    filterMessage = `Showing ${ studiesToRender.length } of ${ model.studies.length} studies`;
  }
  document.getElementById('filterCount').innerHTML = filterMessage;

  // By default, we link to the study itself in IDR...
  let linkFunc = (studyData) => {
    let type = studyData['@type'].split('#')[1].toLowerCase();
    return `${ BASE_URL }/webclient/?show=${ type }-${ studyData['@id'] }`;
  }
  let htmlFunc = studyHtml;

  studiesToRender.forEach(s => renderStudy(s, 'studies', linkFunc, htmlFunc));
}


function renderStudy(studyData, elementId, linkFunc, htmlFunc) {

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

  let html = htmlFunc({studyLink, studyThumbUrl, studyDesc, idrId, title, authors, BASE_URL, imgId, type}, studyData);

  var div = document.createElement( "div" );
  div.innerHTML = html;
  div.className = "row study ";
  document.getElementById(elementId).appendChild(div);
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
