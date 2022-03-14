"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

//   Copyright (C) 2019-2020 University of Dundee & Open Microscopy Environment.
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
var StudiesModel = function StudiesModel() {
  "use strict";

  this.base_url = BASE_URL;
  this.studies = [];
  this.images = {};
  return this;
};

StudiesModel.prototype.getStudyById = function getStudyById(typeId) {
  // E.g. 'project-1', or 'screen-2'
  var objType = typeId.split('-')[0];
  var id = typeId.split('-')[1];

  for (var i = 0; i < this.studies.length; i++) {
    var study = this.studies[i];

    if (study['@id'] == id && study['@type'].split('#')[1].toLowerCase() == objType) {
      return study;
    }
  }
};

StudiesModel.prototype.getStudiesNames = function getStudiesNames(filterQuery) {
  var names = this.studies.map(function (s) {
    return s.Name;
  });

  if (filterQuery) {
    names = names.filter(function (name) {
      return name.toLowerCase().indexOf(filterQuery) > -1;
    });
  }

  names.sort(function (a, b) {
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
  });
  return names;
};

StudiesModel.prototype.getStudiesGroups = function getStudiesGroups(filterQuery) {
  var names = [];
  this.studies.forEach(function (study) {
    var groupName = study['omero:details'].group.Name;

    if (names.indexOf(groupName) === -1) {
      names.push(groupName);
    }
  });

  if (filterQuery) {
    names = names.filter(function (name) {
      return name.toLowerCase().indexOf(filterQuery) > -1;
    });
  }

  names.sort(function (a, b) {
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
  });
  return names;
};

StudiesModel.prototype.getStudyValue = function getStudyValue(study, key) {
  if (!study.mapValues) return;

  for (var i = 0; i < study.mapValues.length; i++) {
    var kv = study.mapValues[i];

    if (kv[0] === key) {
      return kv[1];
    }
  }
};

StudiesModel.prototype.getStudyValues = function getStudyValues(study, key) {
  if (!study.mapValues) {
    return [];
  }

  var matches = [];

  for (var i = 0; i < study.mapValues.length; i++) {
    var kv = study.mapValues[i];

    if (kv[0] === key) {
      matches.push(kv[1]);
    }
  }

  return matches;
};

StudiesModel.prototype.getKeyValueAutoComplete = function getKeyValueAutoComplete(key, inputText) {
  var _this = this;

  inputText = inputText.toLowerCase(); // Get values for key from each study

  var values = [];
  this.studies.forEach(function (study) {
    var v = _this.getStudyValues(study, key);

    for (var i = 0; i < v.length; i++) {
      values.push(v[i]);
    }
  }); // We want values that match inputText
  // Except for "Publication Authors", where we want words
  // Create dict of {lowercaseValue: origCaseValue}

  var matchCounts = values.reduce(function (prev, value) {
    var matches = [];

    if (key == "Publication Authors") {
      // Split surnames, ignoring AN initials.
      var names = value.split(/,| and | & /).map(function (n) {
        // Want the surname from e.g. 'Jan Ellenberg' or 'Held M' or 'Øyvind Ødegård-Fougner'
        var words = n.split(" ").filter(function (w) {
          return w.match(/[a-z]/g);
        });
        if (words && words.length == 1) return words[0]; // Surname only

        return words && words.length > 1 ? words.slice(1).join(" ") : '';
      }).filter(function (w) {
        return w.length > 0;
      });
      matches = names.filter(function (name) {
        return name.toLowerCase().indexOf(inputText) > -1;
      });
    } else if (value.toLowerCase().indexOf(inputText) > -1) {
      matches.push(value);
    }

    matches.forEach(function (match) {
      if (!prev[match.toLowerCase()]) {
        // key is lowercase, value is original case
        prev[match.toLowerCase()] = {
          value: match,
          count: 0
        };
      } // also keep count of matches


      prev[match.toLowerCase()].count++;
    });
    return prev;
  }, {}); // Make into list and sort by:
  // match at start of phrase > match at start of word > other match

  var matchList = [];

  for (key in matchCounts) {
    var matchScore = 1;

    if (key.indexOf(inputText) == 0) {
      // best match if our text STARTS WITH inputText
      matchScore = 3;
    } else if (key.indexOf(" " + inputText) > -1) {
      // next best if a WORD starts with inputText
      matchScore = 2;
    } // Make a list of sort score, orig text (NOT lowercase keys) and count


    matchList.push([matchScore, matchCounts[key].value, matchCounts[key].count]);
  } // Sort by the matchScore (hightest first)


  matchList.sort(function (a, b) {
    if (a[0] < b[0]) return 1;
    if (a[0] > b[0]) return -1; // equal score. Sort by value (lowest first)

    if (a[1].toLowerCase() > b[1].toLowerCase()) return 1;
    return -1;
  }); // Return the matches

  return matchList.map(function (m) {
    // Auto-complete uses {label: 'X (n)', value: 'X'}
    return {
      label: "".concat(m[1], " (").concat(m[2], ")"),
      value: m[1]
    };
  }).filter(function (m) {
    return m.value.length > 0;
  });
};

StudiesModel.prototype.loadStudies = function loadStudies(callback) {
  var _this2 = this;

  // Load Projects AND Screens, sort them and render...
  Promise.all([fetch(this.base_url + "api/v0/m/projects/?childCount=true"), fetch(this.base_url + "api/v0/m/screens/?childCount=true")]).then(function (responses) {
    return Promise.all(responses.map(function (res) {
      return res.json();
    }));
  }).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        projects = _ref2[0],
        screens = _ref2[1];

    _this2.studies = projects.data;
    _this2.studies = _this2.studies.concat(screens.data); // ignore empty studies with no images

    _this2.studies = _this2.studies.filter(function (study) {
      return study['omero:childCount'] > 0;
    }); // sort by name, reverse

    _this2.studies.sort(function (a, b) {
      var nameA = a.Name.toUpperCase();
      var nameB = b.Name.toUpperCase();

      if (nameA < nameB) {
        return 1;
      }

      if (nameA > nameB) {
        return -1;
      } // names must be equal


      return 0;
    }); // load Map Anns for Studies...


    _this2.loadStudiesMapAnnotations(callback);
  })["catch"](function (err) {
    console.error(err);
  });
};

StudiesModel.prototype.loadStudiesThumbnails = function loadStudiesThumbnails(ids, callback) {
  var _this3 = this;

  var url = GALLERY_INDEX + "gallery-api/thumbnails/"; // remove duplicates

  ids = _toConsumableArray(new Set(ids)); // find any thumbnails we already have in hand...

  var found = {};
  var toFind = [];
  ids.forEach(function (id) {
    var study = _this3.getStudyById(id);

    if (study && study.image && study.thumbnail) {
      found[id] = {
        image: study.image,
        thumbnail: study.thumbnail
      };
    } else {
      toFind.push(id);
    }
  });

  if (Object.keys(found).length > 0) {
    callback(found);
  }

  toFind = toFind.map(function (id) {
    return id.replace('-', '=');
  });
  var batchSize = 10;

  while (toFind.length > 0) {
    var data = toFind.slice(0, batchSize).join("&");
    fetch(url + '?' + data).then(function (response) {
      return response.json();
    }).then(function (data) {
      for (var studyId in data) {
        var study = _this3.getStudyById(studyId);

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
};

StudiesModel.prototype.loadStudiesMapAnnotations = function loadStudiesMapAnnotations(callback) {
  var _this4 = this;

  var url = this.base_url + "webclient/api/annotations/?type=map";
  var data = this.studies.map(function (study) {
    return "".concat(study['@type'].split('#')[1].toLowerCase(), "=").concat(study['@id']);
  }).join("&");
  url += '&' + data;
  fetch(url).then(function (response) {
    return response.json();
  }).then(function (data) {
    // populate the studies array...
    // dict of {'project-1' : key-values}
    var annsByParentId = {};
    data.annotations.forEach(function (ann) {
      var key = ann.link.parent["class"]; // 'ProjectI'

      key = key.substr(0, key.length - 1).toLowerCase();
      key += '-' + ann.link.parent.id; // project-1

      if (!annsByParentId[key]) {
        annsByParentId[key] = [];
      }

      annsByParentId[key] = annsByParentId[key].concat(ann.values);
    }); // Add mapValues to studies...

    _this4.studies = _this4.studies.map(function (study) {
      // Also set 'type':'screen', 'objId': 'screen-123'
      study.type = study['@type'].split('#')[1].toLowerCase();
      study.id = study['@id'];
      study.objId = "".concat(study.type, "-").concat(study['@id']);
      var values = annsByParentId[study.objId];

      if (values) {
        study.mapValues = values;

        var releaseDate = _this4.getStudyValue(study, 'Release Date');

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
    }

    ;
  });
};

StudiesModel.prototype.filterStudiesByMapQuery = function filterStudiesByMapQuery(query) {
  if (query.startsWith("FIRST") || query.startsWith("LAST")) {
    // E.g. query is 'FIRST10:date' sort by 'date' and return first 10
    var limit = parseInt(query.replace('FIRST', '').replace('LAST', ''));
    var attr = query.split(':')[1];
    var desc = query.startsWith("FIRST") ? -1 : 1; // first filter studies, remove those that don't have 'attr'

    var sorted = this.studies.filter(function (study) {
      return study[attr] !== undefined;
    }).sort(function (a, b) {
      var aVal = a[attr];
      var bVal = b[attr]; // If string, use lowercase

      aVal = aVal.toLowerCase ? aVal.toLowerCase() : aVal;
      bVal = bVal.toLowerCase ? bVal.toLowerCase() : bVal;
      return aVal < bVal ? desc : aVal > bVal ? -desc : 0;
    });
    return sorted.slice(0, limit);
  }

  var matches = this.studies.filter(function (study) {
    // If no key-values loaded, filter out
    if (!study.mapValues) {
      return false;
    }

    var match = false; // first split query by AND and OR

    var ors = query.split(' OR ');
    ors.forEach(function (term) {
      var allAnds = true;
      var ands = term.split(' AND ');
      ands.forEach(function (mustMatch) {
        var queryKeyValue = mustMatch.split(":");
        var valueMatch = false; // check all key-values (may be duplicate keys) for value that matches

        for (var i = 0; i < study.mapValues.length; i++) {
          var kv = study.mapValues[i];

          if (kv[0] === queryKeyValue[0]) {
            var value = queryKeyValue[1].trim();

            if (value.substr(0, 4) === 'NOT ') {
              value = value.replace('NOT ', '');

              if (kv[1].toLowerCase().indexOf(value.toLowerCase()) == -1) {
                valueMatch = true;
              }
            } else if (kv[1].toLowerCase().indexOf(value.toLowerCase()) > -1) {
              valueMatch = true;
            }
          }
        } // if not found, then our AND term fails


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
};

StudiesModel.prototype.loadImage = function loadImage(obj_type, obj_id, callback) {
  var _this5 = this;

  // Get a sample image ID for 'screen' or 'project'
  var key = "".concat(obj_type, "-").concat(obj_id); // check cache

  if (this.images[key]) {
    callback(this.images[key]);
    return;
  }

  var limit = 20;

  if (obj_type == 'screen') {
    var url = "".concat(this.base_url, "api/v0/m/screens/").concat(obj_id, "/plates/");
    url += '?limit=1'; // just get first plate

    fetch(url).then(function (response) {
      return response.json();
    }).then(function (data) {
      obj = data.data[0]; // Jump into the 'middle' of plate to make sure Wells have images
      // NB: Some plates don't have Well at each Row/Column spot. Well_count < Rows * Cols * 0.5

      var offset = Math.max(0, parseInt(obj.Rows * obj.Columns * 0.25) - limit);
      var url = "".concat(_this5.base_url, "api/v0/m/plates/").concat(obj['@id'], "/wells/?limit=").concat(limit, "&offset=").concat(offset);
      return fetch(url);
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      var wellSample;

      for (var w = 0; w < data.data.length; w++) {
        if (data.data[w].WellSamples) {
          wellSample = data.data[w].WellSamples[0];
        }
      }

      if (!wellSample) {
        console.log('No WellSamples in first Wells!', data);
        return;
      }

      _this5.images[key] = wellSample.Image;
      callback(_this5.images[key]);
      return;
    });
  } else if (obj_type == 'project') {
    var _url = "".concat(this.base_url, "api/v0/m/projects/").concat(obj_id, "/datasets/");

    _url += '?limit=1'; // just get first plate

    fetch(_url).then(function (response) {
      return response.json();
    }).then(function (data) {
      obj = data.data[0];

      if (!obj) {
        // No Dataset in Project: ' + obj_id;
        return;
      }

      var url = "".concat(_this5.base_url, "api/v0/m/datasets/").concat(obj['@id'], "/images/?limit=1");
      return fetch(url);
    }) // Handle undefined if no Datasets in Project...
    .then(function (response) {
      return response ? response.json() : {};
    }).then(function (data) {
      if (data && data.data && data.data[0]) {
        var image = data.data[0];
        _this5.images[key] = image;
        callback(_this5.images[key]);
      }
    })["catch"](function (error) {
      console.error("Error loading Image for Project: " + obj_id, error);
    });
  }
};

StudiesModel.prototype.getStudyImage = function getStudyImage(obj_type, obj_id, callback) {
  var _this6 = this;

  // Get a sample image ID for 'screen' or 'project'
  var key = "".concat(obj_type, "-").concat(obj_id); // check cache

  if (this.images[key]) {
    callback(this.images[key]);
    return;
  }

  var url = "".concat(GALLERY_INDEX, "gallery-api/").concat(obj_type, "s/").concat(obj_id, "/images/?limit=1");
  fetch(url).then(function (response) {
    return response.json();
  }).then(function (data) {
    var images = data.data;

    if (images.length > 0) {
      _this6.images[key] = images[0];
    }

    callback(_this6.images[key]);
    return;
  });
};

function toTitleCase(text) {
  if (!text || text.length == 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

var getStudyShortName = function getStudyShortName(study) {
  var shortName = "".concat(toTitleCase(study.type), ": ").concat(study.id);

  if (STUDY_SHORT_NAME) {
    for (var i = 0; i < STUDY_SHORT_NAME.length; i++) {
      var key = STUDY_SHORT_NAME[i]['key'];
      var value = void 0;
      var newShortName = void 0;

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
        var re = new RegExp(STUDY_SHORT_NAME[i]['regex']);
        var template = STUDY_SHORT_NAME[i]['template'];
        newShortName = value.replace(re, template);
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
}; // startsWith polyfill for IE


if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (search, pos) {
    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
} // Object.assign polyfill for IE


if (typeof Object.assign !== 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      // .length of function is 2
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