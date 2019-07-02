//   Copyright (C) 2019 University of Dundee & Open Microscopy Environment.
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

var StudiesModel = function() {

  "use strict"

  this.base_url = BASE_URL;

  this.studies = [];

  this.images = {}

  return this;
}

StudiesModel.prototype.getStudyById = function getStudyById(typeId) {
  // E.g. 'project-1', or 'screen-2'
  let objType = typeId.split('-')[0];
  let id = typeId.split('-')[1];
  for (let i=0; i<this.studies.length; i++) {
    let study = this.studies[i];
    if (study['@id'] == id && study['@type'].split('#')[1].toLowerCase() == objType) {
      return study;
    }
  }
}

StudiesModel.prototype.getStudiesNames = function getStudiesNames(filterQuery) {
  let names = this.studies.map(s => s.Name);
  if (filterQuery) {
    names = names.filter(name => name.toLowerCase().indexOf(filterQuery) > -1);
  }
  names.sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1: -1);
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
  if (!study.mapValues) {
    return [];
  }
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
  });
  // We want values that match inputText
  // Except for "Publication Authors", where we want words
  // Create dict of {lowercaseValue: origCaseValue}
  let matchCounts = values.reduce((prev, value) => {
    let matches = [];
    if (key == "Publication Authors") {
      // Split surnames, ignoring AN initials.
      let names = value.split(/,| and | & /)
        .map(n => {
          // Want the surname from e.g. 'Jan Ellenberg' or 'Held M' or 'Øyvind Ødegård-Fougner'
          let words = n.split(" ").filter(w => w.match(/[a-z]/g));
          if (words && words.length == 1) return words[0];  // Surname only
          return (words && words.length > 1) ? words.slice(1).join(" ") : '';
      }).filter(w => w.length > 0);
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

  // Sort by the matchScore (hightest first)
  matchList.sort(function(a, b) {
    if (a[0] < b[0]) return 1;
    if (a[0] > b[0]) return -1;
    // equal score. Sort by value (lowest first)
    if (a[1].toLowerCase() > b[1].toLowerCase()) return 1;
    return -1;
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
    fetch(this.base_url + "api/v0/m/projects/?childCount=true"),
    fetch(this.base_url + "api/v0/m/screens/?childCount=true"),
  ]).then(responses =>
      Promise.all(responses.map(res => res.json()))
  ).then(([projects, screens]) => {
      this.studies = projects.data;
      this.studies = this.studies.concat(screens.data);

      // ignore empty studies with no images
      this.studies = this.studies.filter(study => study['omero:childCount'] > 0);

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


StudiesModel.prototype.loadStudiesThumbnails = function loadStudiesThumbnails(ids, callback) {
  let url = GALLERY_INDEX + "gallery-api/thumbnails/";
  // remove duplicates
  ids = [...new Set(ids)];
  // find any thumbnails we already have in hand...
  let found = {};
  let toFind = [];
  ids.forEach(id => {
    let study = this.getStudyById(id);
    if (study && study.image && study.thumbnail) {
      found[id] = {image: study.image, thumbnail: study.thumbnail}
    } else {
      toFind.push(id);
    }
  });
  if (Object.keys(found).length > 0) {
    callback(found);
  }

  toFind = toFind.map(id => id.replace('-', '='));
  let batchSize = 10;
  while (toFind.length > 0) {
    let data = toFind.slice(0, batchSize).join("&");
    fetch(url + '?' + data)
      .then(response => response.json())
      .then(data => {
        for (let studyId in data) {
          let study = this.getStudyById(studyId);
          if (data[studyId]) {
            study.image = data[studyId].image;
            study.thumbnail = data[studyId].thumbnail;
          }
        }
        if (callback) {
          callback(data);
        }
      });
    toFind = toFind.slice(batchSize);
  }
}


StudiesModel.prototype.loadStudiesMapAnnotations = function loadStudiesMapAnnotations(callback) {
  let url = this.base_url + "webclient/api/annotations/?type=map";
  let data = this.studies
    .map(study => `${ study['@type'].split('#')[1].toLowerCase() }=${ study['@id'] }`)
    .join("&");
  url += '&' + data;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      // populate the studies array...
      // dict of {'project-1' : key-values}
      let annsByParentId = {};
      data.annotations.forEach(ann => {
        let key = ann.link.parent.class;  // 'ProjectI'
        key = key.substr(0, key.length-1).toLowerCase();
        key += '-' + ann.link.parent.id;  // project-1
        if (!annsByParentId[key]) {
          annsByParentId[key] = [];
        }
        annsByParentId[key] = annsByParentId[key].concat(ann.values);
      });
      // Add mapValues to studies...
      this.studies = this.studies.map(study => {
        // Also set 'type':'screen', 'objId': 'screen-123'
        study.type = study['@type'].split('#')[1].toLowerCase();
        study.id = study['@id'];
        study.objId = `${ study.type }-${ study['@id'] }`;
        let values = annsByParentId[study.objId];
        if (values) {
          study.mapValues = values;
          let releaseDate = this.getStudyValue(study, 'Release Date');
          if (releaseDate) {
            study.date = new Date(releaseDate);
            if (isNaN(study.date.getTime())) {
              study.date = undefined;
            }
          }
        }
        return study;
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
    let desc = query.startsWith("FIRST") ? -1 : 1;
    // first filter studies, remove those that don't have 'attr'
    let sorted = this.studies
      .filter(study => study[attr] !== undefined)
      .sort((a, b) => {
        let aVal = a[attr];
        let bVal = b[attr];
        // If string, use lowercase
        aVal = aVal.toLowerCase ? aVal.toLowerCase() : aVal;
        bVal = bVal.toLowerCase ? bVal.toLowerCase() : bVal;
        return aVal < bVal ? desc : aVal > bVal ? -desc : 0;
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
    let url = `${ this.base_url }api/v0/m/screens/${ obj_id }/plates/`;
    url += '?limit=1'   // just get first plate
    fetch(url)
      .then(response => response.json())
      .then(data => {
        obj = data.data[0];
        // Jump into the 'middle' of plate to make sure Wells have images
        // NB: Some plates don't have Well at each Row/Column spot. Well_count < Rows * Cols * 0.5
        let offset = Math.max(0, parseInt(obj.Rows * obj.Columns * 0.25) - limit);
        let url = `${ this.base_url }api/v0/m/plates/${ obj['@id'] }/wells/?limit=${limit}&offset=${offset}`;
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
    let url = `${ this.base_url }api/v0/m/projects/${ obj_id }/datasets/`;
    url += '?limit=1'   // just get first plate
    fetch(url)
      .then(response => response.json())
      .then(data => {
        obj = data.data[0];
        if (!obj) {
          // No Dataset in Project: ' + obj_id;
          return;
        }
        let url = `${ this.base_url }api/v0/m/datasets/${ obj['@id'] }/images/?limit=1`;
        return fetch(url)
      })
      // Handle undefined if no Datasets in Project...
      .then(response => response ? response.json() : {})
      .then(data => {
        if (data && data.data && data.data[0]) {
          let image = data.data[0];
          this.images[key] = image;
          callback(this.images[key]);
        }
      })
      .catch(error => {
        console.error("Error loading Image for Project: " + obj_id, error);
      });
  }
}



StudiesModel.prototype.getStudyImage = function getStudyImage(obj_type, obj_id, callback) {
  // Get a sample image ID for 'screen' or 'project'
  let key = `${obj_type}-${obj_id}`;

  // check cache
  if (this.images[key]) {
    callback(this.images[key]);
    return;
  }

  let url = `${ GALLERY_INDEX }gallery-api/${obj_type}s/${ obj_id }/images/?limit=1`
  fetch(url)
    .then(response => response.json())
    .then(data => {
      let images = data.data;
      if (images.length > 0) {
        this.images[key] = images[0]
      }
      callback(this.images[key]);
      return;
    })
  
}


function toTitleCase(text) {
  if (!text || text.length == 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}


let getStudyShortName = function (study) {
  let shortName = `${toTitleCase(study.type)}: ${study.id}`;
  if (STUDY_SHORT_NAME) {
    for (let i=0; i < STUDY_SHORT_NAME.length; i++) {
      let key = STUDY_SHORT_NAME[i]['key'];
      let value;
      let newShortName;
      if (key === 'Name' || key === 'Description') {
        value = study[key];
      }
      if (!value) {
        value = model.getStudyValue(study, key);
      }
      if (!value) {
        continue;
      }
      if (STUDY_SHORT_NAME[i]['regex'] && STUDY_SHORT_NAME[i]['template']) {
        let re = new RegExp(STUDY_SHORT_NAME[i]['regex']);
        let groups = re.exec(value);
        if (groups && groups.length > 1) {
          // template e.g. "{{1}}-{{2}}"
          let template = STUDY_SHORT_NAME[i]['template'];
          for (let g=0; g<groups.length; g++) {
            template = template.replace(`{{${g}}}`, groups[g]);
          }
          // strip out any unused {{2}} etc.
          newShortName = template.replace(/{{\d+}}/g, "");
        }
      } else {
        newShortName = value;
      }
      if (newShortName) {
        shortName = newShortName;
        break;
      }
    }
  }
  return shortName;
}

// startsWith polyfill for IE
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(search, pos) {
      return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
}

// Object.assign polyfill for IE
if (typeof Object.assign !== 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target === null || target === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource !== null && nextSource !== undefined) { 
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}
