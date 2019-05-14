

var StudiesModel = function() {

  "use strict"

  this.base_url = BASE_URL;

  this.studies = [];

  this.images = {}

  return this;
}

StudiesModel.prototype.getStudiesNames = function getStudiesNames(filterQuery) {
  let names = this.studies.map(s => s.Name);
  if (filterQuery) {
    names = names.filter(name => name.toLowerCase().indexOf(filterQuery) > -1);
  }
  return names;
}

StudiesModel.prototype.getStudyValue = function getStudyValue(study, key) {
  if (!study.mapValues) return;
  for (let i=0; i<study.mapValues.length; i++){
    let kv = study.mapValues[i];
    if (kv[0] === key) {
      return kv[1];
    }
  }
}

StudiesModel.prototype.getStudyValues = function getStudyValues(study, key) {
  if (!study.mapValues) return;
  let matches = [];
  for (let i=0; i<study.mapValues.length; i++){
    let kv = study.mapValues[i];
    if (kv[0] === key) {
      matches.push(kv[1]);
    }
  }
  return matches;
}

StudiesModel.prototype.getKeyValueAutoComplete = function getKeyValueAutoComplete(key, inputText) {
  inputText = inputText.toLowerCase();
  // Get values for key from each study
  let values = []
  this.studies.forEach(study => {
    let v = this.getStudyValues(study, key);
    for (let i=0; i<v.length; i++) {
      values.push(v[i]);
    }
    return "";
  });
  // We want values that match inputText
  // Except for "Publication Authors", where we want words
  // Create dict of {lowercaseValue: origCaseValue}
  let matchCounts = values.reduce((prev, value) => {
    let matches = [];
    if (key == "Publication Authors") {
      // Split surnames, ignoring AN initials.
      let names = value.match(/\b([A-Z][a-z]\w+)\b/g) || [];
      matches = names.filter(name => name.toLowerCase().indexOf(inputText) > -1);
    } else if (value.toLowerCase().indexOf(inputText) > -1) {
      matches.push(value);
    }
    matches.forEach(match => {
      if (!prev[match.toLowerCase()]) {
        // key is lowercase, value is original case
        prev[match.toLowerCase()] = {value: match, count: 0};
      }
      // also keep count of matches
      prev[match.toLowerCase()].count++;
    });

    return prev;
  }, {});

  // Make into list and sort by:
  // match at start of phrase > match at start of word > other match
  let matchList = [];
  for (key in matchCounts) {
    let matchScore = 1;
    if (key.indexOf(inputText) == 0) {
      // best match if our text STARTS WITH inputText
      matchScore = 3;
    } else if (key.indexOf(" " + inputText) > -1) {
      // next best if a WORD starts with inputText
      matchScore = 2;
    }
    // Make a list of sort score, orig text (NOT lowercase keys) and count
    matchList.push([matchScore,
                    matchCounts[key].value,
                    matchCounts[key].count]);
  }

  // Sort by the matchScore
  matchList.sort(function(a, b) {
    return (a[0] < b[0] ? 1 :
      a[0] > b[0] ? -1 : 0)
  });

  // Return the matches
  return matchList
    .map(m => {
      // Auto-complete uses {label: 'X (n)', value: 'X'}
      return {label: `${ m[1] } (${ m[2] })`, value: m[1]}
    })
    .filter(m => m.value.length > 0);
}


StudiesModel.prototype.loadStudies = function loadStudies(callback) {

  // Load Projects AND Screens, sort them and render...
  Promise.all([
    fetch(this.base_url + "/api/v0/m/projects/"),
    fetch(this.base_url + "/api/v0/m/screens/"),
  ]).then(responses =>
      Promise.all(responses.map(res => res.json()))
  ).then(([projects, screens]) => {
      this.studies = projects.data;
      this.studies = this.studies.concat(screens.data);

      // sort by name, reverse
      this.studies.sort(function(a, b) {
        var nameA = a.Name.toUpperCase();
        var nameB = b.Name.toUpperCase();
        if (nameA < nameB) {
          return 1;
        }
        if (nameA > nameB) {
          return -1;
        }

        // names must be equal
        return 0;
      });

      // load Map Anns for Studies...
      this.loadStudiesMapAnnotations(callback);

  }).catch((err) => {
    console.error(err);
  });
}


StudiesModel.prototype.loadStudiesMapAnnotations = function loadStudiesMapAnnotations(callback) {
  let url = this.base_url + "/webclient/api/annotations/?type=map";
  let data = this.studies
    .map(study => `${ study['@type'].split('#')[1].toLowerCase() }=${ study['@id'] }`)
    .join("&");
  url += '&' + data;
  // Cache-buster. See https://trello.com/c/GpXEHzjV/519-cors-access-control-allow-origin-cached
  url += '&_=' + Math.random();
  fetch(url)
    .then(response => response.json())
    .then(data => {
      // populate the studies array...
      // dict of {'project-1' : key-values}
      let annsByParentId = {};
      let datesByParentId = {};
      data.annotations.forEach(ann => {
        let key = ann.link.parent.class;  // 'ProjectI'
        key = key.substr(0, key.length-1).toLowerCase();
        key += '-' + ann.link.parent.id;  // project-1
        datesByParentId[key] = new Date(ann.date);
        if (!annsByParentId[key]) {
          annsByParentId[key] = [];
        }
        annsByParentId[key] = annsByParentId[key].concat(ann.values);
      });
      // Add mapValues to studies...
      this.studies = this.studies.map(study => {
        let key = `${ study['@type'].split('#')[1].toLowerCase() }-${ study['@id'] }`;
        if (datesByParentId[key]) {
          study.date = datesByParentId[key];
        }
        let values = annsByParentId[key];
        if (values) {
          study.mapValues = values;
          return study;
        }
      });

      if (callback) {
        callback();
      };
    })
}


StudiesModel.prototype.filterStudiesByMapQuery = function filterStudiesByMapQuery(query) {

  if (query.startsWith("FIRST") || query.startsWith("LAST")) {
    // E.g. query is 'FIRST10:date' sort by 'date' and return first 10
    let limit = parseInt(query.replace('FIRST', '').replace('LAST', ''));
    let attr = query.split(':')[1];
    let desc = query.startsWith("FIRST") ? 1 : -1;
    let sorted = this.studies.sort((a, b) => {
      return a[attr] < b[attr] ? desc : a[attr] > b[attr] ? -desc : 0;
    });
    return sorted.slice(0, limit);
  }

  let matches = this.studies.filter(study => {
    // If no key-values loaded, filter out
    if (!study.mapValues) {
      return false;
    }
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
          if (kv[0] === queryKeyValue[0]) {
            let value = queryKeyValue[1].trim();
            if (value.substr(0, 4) === 'NOT ') {
              value = value.replace('NOT ', '');
              if (kv[1].toLowerCase().indexOf(value.toLowerCase()) == -1) {
                valueMatch = true;
              }
            } else if (kv[1].toLowerCase().indexOf(value.toLowerCase()) > -1) {
              valueMatch = true;
            }
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
  return matches;
}


StudiesModel.prototype.loadImage = function loadImage(obj_type, obj_id, callback) {
  // Get a sample image ID for 'screen' or 'project'
  let key = `${obj_type}-${obj_id}`;

  // check cache
  if (this.images[key]) {
    callback(this.images[key]);
    return;
  }

  let limit = 20;
  if (obj_type == 'screen') {
    let url = `${ this.base_url }/api/v0/m/screens/${ obj_id }/plates/`;
    url += '?limit=1'   // just get first plate
    url += '&_=' + Math.random();
    fetch(url)
      .then(response => response.json())
      .then(data => {
        obj = data.data[0];
        // Jump into the 'middle' of plate to make sure Wells have images
        // NB: Some plates don't have Well at each Row/Column spot. Well_count < Rows * Cols * 0.5
        let offset = Math.max(0, parseInt(obj.Rows * obj.Columns * 0.25) - limit);
        let url = `${ this.base_url }/api/v0/m/plates/${ obj['@id'] }/wells/?limit=${limit}&offset=${offset}`;
        url += '&_=' + Math.random();
        return fetch(url)
      })
      .then(response => response.json())
      .then(data => {
        let wellSample;
        for (let w=0; w<data.data.length; w++) {
          if (data.data[w].WellSamples) {
            wellSample = data.data[w].WellSamples[0]
          }
        }
        if (!wellSample) {
          console.log('No WellSamples in first Wells!', data);
          return;
        }
        this.images[key] = wellSample.Image;
        callback(this.images[key]);
        return;
      })
  } else if (obj_type == 'project') {
    let url = `${ this.base_url }/api/v0/m/projects/${ obj_id }/datasets/`;
    url += '?limit=1'   // just get first plate
    url += '&_=' + Math.random();
    fetch(url)
      .then(response => response.json())
      .then(data => {
        obj = data.data[0];
        if (!obj) {
          console.log('No Dataset in Project!', data);
          return;
        }
        let url = `${ this.base_url }/api/v0/m/datasets/${ obj['@id'] }/images/?limit=1`;
        url += '&_=' + Math.random();
        return fetch(url)
      })
      .then(response => response.json())
      .then(data => {
        let image = data.data[0];
        this.images[key] = image;
        callback(this.images[key]);
        return;
      })
  }
}



StudiesModel.prototype.getImageId = function getImageId(obj_type, obj_id, callback) {
  // Get a sample image ID for 'screen' or 'project'
  let key = `${obj_type}-${obj_id}`;

  // check cache
  if (this.imageIds[key]) {
    callback(this.imageIds[key]);
    return;
  }

  let url = `${ GALLERY_INDEX }study_image/${obj_type}/${ obj_id }/`
  fetch(url)
    .then(response => response.json())
    .then(data => {
      this.imageIds[key] = data.id;
      callback(this.imageIds[key]);
      return;
    })
  
}
