"use strict";

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

function escapeRegExp(string) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

class StudiesModel {
  constructor() {
    this.base_url = BASE_URL;
    this.studies = [];
    this.images = {};
    this.pubSubObject = $({});
    return this;
  }

  subscribe() {
    this.pubSubObject.on.apply(this.pubSubObject, arguments);
  }

  unsubscribe() {
    this.pubSubObject.off.apply(this.pubSubObject, arguments);
  }

  publish() {
    this.pubSubObject.trigger.apply(this.pubSubObject, arguments);
  }

  getStudyById(typeId) {
    // E.g. 'project-1', or 'screen-2'
    var objType = typeId.split("-")[0];
    var id = typeId.split("-")[1];

    for (var i = 0; i < this.studies.length; i++) {
      var study = this.studies[i];

      if (
        study["@id"] == id &&
        study["@type"].split("#")[1].toLowerCase() == objType
      ) {
        return study;
      }
    }
  }

  getStudiesNames(filterQuery) {
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
  }

  getStudiesGroups(filterQuery) {
    var names = [];
    this.studies.forEach(function (study) {
      var groupName = study["omero:details"].group.Name;

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
  }

  getStudyValue(study, key) {
    if (!study.mapValues) return;

    for (var i = 0; i < study.mapValues.length; i++) {
      var kv = study.mapValues[i];

      if (kv[0] === key) {
        return kv[1];
      }
    }
  }

  getStudyTitle(study) {
    var title;

    for (var i = 0; i < TITLE_KEYS.length; i++) {
      title = model.getStudyValue(study, TITLE_KEYS[i]);
      if (title) {
        break;
      }
    }
    if (!title) {
      title = study.Name;
    }
    return title;
  }

  getStudyDescription(study, title) {
    if (!title) {
      title = this.getStudyTitle(study);
    }
    let desc = study.Description;
    let studyDesc = "";
    if (desc) {
      // If description contains title, use the text that follows
      if (title.length > 0 && desc.indexOf(title) > -1) {
        desc = desc.split(title)[1];
      }
      // Remove blank lines (and first 'Experiment Description' line)
      studyDesc = desc
        .split("\n")
        .filter(function (l) {
          return l.length > 0;
        })
        .filter(function (l) {
          return l !== "Experiment Description" && l !== "Screen Description";
        })
        .join("\n");

      if (studyDesc.indexOf("Version History") > 1) {
        studyDesc = studyDesc.split("Version History")[0];
      }
    }
    return studyDesc;
  }

  getStudyValues(study, key) {
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
  }

  getKeyValueAutoComplete(key, inputText) {
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
        var names = value
          .split(/,| and | & /)
          .map(function (n) {
            // Want the surname from e.g. 'Jan Ellenberg' or 'Held M' or 'Øyvind Ødegård-Fougner'
            var words = n.split(" ").filter(function (w) {
              return w.match(/[a-z]/g);
            });
            if (words && words.length == 1) return words[0]; // Surname only

            return words && words.length > 1 ? words.slice(1).join(" ") : "";
          })
          .filter(function (w) {
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
            count: 0,
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

      matchList.push([
        matchScore,
        matchCounts[key].value,
        matchCounts[key].count,
      ]);
    } // Sort by the matchScore (hightest first)

    matchList.sort(function (a, b) {
      if (a[0] < b[0]) return 1;
      if (a[0] > b[0]) return -1; // equal score. Sort by value (lowest first)

      if (a[1].toLowerCase() > b[1].toLowerCase()) return 1;
      return -1;
    }); // Return the matches

    return matchList
      .map(function (m) {
        // Auto-complete uses {label: 'X (n)', value: 'X'}
        return {
          label: "".concat(m[1], " (").concat(m[2], ")"),
          value: m[1],
        };
      })
      .filter(function (m) {
        return m.value.length > 0;
      });
  }

  async loadStudies() {
    // Load Projects AND Screens, sort them and render...
    await Promise.all([
      fetch(this.base_url + "api/v0/m/projects/?childCount=true"),
      fetch(this.base_url + "api/v0/m/screens/?childCount=true"),
    ])
      .then((responses) => Promise.all(responses.map((res) => res.json())))
      .then(([projects, screens]) => {
        this.studies = projects.data;
        this.studies = this.studies.concat(screens.data);

        // ignore empty studies with no images
        this.studies = this.studies.filter(
          (study) => study["omero:childCount"] > 0
        );

        // sort by name, reverse
        this.studies.sort(function (a, b) {
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
      })
      .catch((err) => {
        console.error(err);
      });

    // Load Map Annotations
    await this.loadStudiesMapAnnotations();

    // Generate StudyDescription (removes 'Publication Title' etc from project.Description)
    this.studies.forEach((study) => {
      study["StudyTitle"] = this.getStudyTitle(study);
      study["StudyDescription"] = this.getStudyDescription(study);
    });
  }

  loadStudiesThumbnails() {
    let url = GALLERY_INDEX + "gallery-api/thumbnails/";

    let toFind = this.studies.map((study) => study.objId.replace("-", "="));
    let batchSize = 10;
    while (toFind.length > 0) {
      let data = toFind.slice(0, batchSize).join("&");
      fetch(url + "?" + data)
        .then((response) => response.json())
        .then((data) => {
          for (let studyId in data) {
            let study = this.getStudyById(studyId);
            if (data[studyId]) {
              study.image = data[studyId].image;
              study.thumbnail = data[studyId].thumbnail;
            }
          }
          this.publish("thumbnails", data);
        });
      toFind = toFind.slice(batchSize);
    }
  }

  async loadStudiesMapAnnotations() {
    let url = this.base_url + "webclient/api/annotations/?type=map";
    let data = this.studies
      .map(
        (study) =>
          `${study["@type"].split("#")[1].toLowerCase()}=${study["@id"]}`
      )
      .join("&");
    url += "&" + data;
    await fetch(url)
      .then((response) => response.json())
      .then((data) => {
        // populate the studies array...
        // dict of {'project-1' : key-values}
        let annsByParentId = {};
        data.annotations.forEach((ann) => {
          let key = ann.link.parent.class; // 'ProjectI'
          key = key.substr(0, key.length - 1).toLowerCase();
          key += "-" + ann.link.parent.id; // project-1
          if (!annsByParentId[key]) {
            annsByParentId[key] = [];
          }
          annsByParentId[key] = annsByParentId[key].concat(ann.values);
        });
        // Add mapValues to studies...
        this.studies = this.studies.map((study) => {
          // Also set 'type':'screen', 'objId': 'screen-123'
          study.type = study["@type"].split("#")[1].toLowerCase();
          study.id = study["@id"];
          study.objId = `${study.type}-${study["@id"]}`;
          let values = annsByParentId[study.objId];
          if (values) {
            study.mapValues = values;
            let releaseDate = this.getStudyValue(study, "Release Date");
            if (releaseDate) {
              study.date = new Date(releaseDate);
              if (isNaN(study.date.getTime())) {
                study.date = undefined;
              }
            }
          }
          return study;
        });
      });
  }

  filterStudiesAnyText(text) {
    // Search for studies with text in their keys, values, name or description.
    // Returns a list of matching studies. Each study is returned along with kvps that match text
    // [study, [{key: value}, {Description: this study is great}]]

    // We don't split words to provide 'AND' functionality (since it's not supported for Images)
    // let regexes = text.split(" ").map((token) => new RegExp(token, "i"));
    let regex = new RegExp(escapeRegExp(text), "i");

    return this.studies
      .map((study) => {
        // we want ALL the search tokens to match at least somewhere in kvp or Description
        let keyValuePairs = [];
        if (study.mapValues) {
          keyValuePairs = [...study.mapValues];

          // Don't want to find "annotation.csv" KVPs
          keyValuePairs = keyValuePairs.filter(
            (kvp) => !kvp[1].includes("annotation.csv")
          );

          keyValuePairs.push(["Name", study.Name]);
        }
        keyValuePairs.push(["Description", study.StudyDescription]);
        let match = keyValuePairs.some((kvp) => regex.test(kvp[1]));
        if (!match) return;

        // return [study, "key: value string showing matching text"]
        let matches = keyValuePairs.filter((kvp) => regex.test(kvp[1]));
        return [study, matches];
      })
      .filter(Boolean);
  }

  filterStudiesByMapQuery(query) {
    if (query.startsWith("FIRST") || query.startsWith("LAST")) {
      // E.g. query is 'FIRST10:date' sort by 'date' and return first 10
      var limit = parseInt(query.replace("FIRST", "").replace("LAST", ""));
      var attr = query.split(":")[1];
      var desc = query.startsWith("FIRST") ? -1 : 1; // first filter studies, remove those that don't have 'attr'

      var sorted = this.studies
        .filter(function (study) {
          return study[attr] !== undefined;
        })
        .sort(function (a, b) {
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

      var ors = query.split(" OR ");
      ors.forEach(function (term) {
        var allAnds = true;
        var ands = term.split(" AND ");
        ands.forEach(function (mustMatch) {
          var queryKeyValue = mustMatch.split(":");
          var valueMatch = false; // check all key-values (may be duplicate keys) for value that matches

          for (var i = 0; i < study.mapValues.length; i++) {
            var kv = study.mapValues[i];

            if (kv[0] === queryKeyValue[0]) {
              var value = queryKeyValue[1].trim();

              if (value.substr(0, 4) === "NOT ") {
                value = value.replace("NOT ", "");

                if (kv[1].toLowerCase().indexOf(value.toLowerCase()) == -1) {
                  valueMatch = true;
                }
              } else if (
                kv[1].toLowerCase().indexOf(value.toLowerCase()) > -1
              ) {
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

  loadImage(obj_type, obj_id, callback) {
    // Get a sample image ID for 'screen' or 'project'
    let key = `${obj_type}-${obj_id}`;

    // check cache
    if (this.images[key]) {
      callback(this.images[key]);
      return;
    }

    let url = `${GALLERY_INDEX}gallery-api/${obj_type}s/${obj_id}/images/?limit=1`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        let images = data.data;
        if (images.length > 0) {
          this.images[key] = images[0];
        }
        callback(this.images[key]);
        return;
      });
  }

  loadStudyStats = function (url, callback) {
    let self = this;
    $.get(url, function (data) {
      let tsvRows = data.split("\n");
      let columns;
      // read tsv => dicts
      let rowsAsObj = tsvRows
        .map(function (row, count) {
          let values = row.split("\t");
          if (count == 0) {
            columns = values;
            return;
          }
          if (values.length === 0) return;
          let row_data = {};
          for (let c = 0; c < values.length; c++) {
            if (c < columns.length) {
              row_data[columns[c]] = values[c];
            }
          }
          return row_data;
        })
        .filter(Boolean);

      // Group rows by Study
      let stats = {};
      rowsAsObj.forEach((row) => {
        let studyName = row["Study"];
        if (!studyName) return;
        let studyId = studyName.split("-")[0];
        if (!stats[studyId]) {
          stats[studyId] = [];
        }
        stats[studyId].push(row);
      });

      self.studyStats = stats;

      if (callback) {
        callback(stats);
      }
    }).fail(function () {
      console.log("Failed to load studies.tsv");
      if (callback) {
        callback();
      }
    });
  };
}

function animateValue(obj, start, end, duration) {
  // https://css-tricks.com/animating-number-counters/
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    let progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // If we want easing...
    // progress = Math.sin(Math.PI * progress / 2);
    let number = Math.floor(progress * (end - start) + start);
    obj.innerHTML = new Intl.NumberFormat().format(number);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function toTitleCase(text) {
  if (!text || text.length == 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

var getStudyShortName = function getStudyShortName(study) {
  var shortName = "".concat(toTitleCase(study.type), ": ").concat(study.id);

  if (STUDY_SHORT_NAME) {
    for (var i = 0; i < STUDY_SHORT_NAME.length; i++) {
      var key = STUDY_SHORT_NAME[i]["key"];
      var value = void 0;
      var newShortName = void 0;

      if (key === "Name" || key === "Description") {
        value = study[key];
      }

      if (!value) {
        value = model.getStudyValue(study, key);
      }

      if (!value) {
        continue;
      }

      if (STUDY_SHORT_NAME[i]["regex"] && STUDY_SHORT_NAME[i]["template"]) {
        var re = new RegExp(STUDY_SHORT_NAME[i]["regex"]);
        var template = STUDY_SHORT_NAME[i]["template"];
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

if (typeof Object.assign !== "function") {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      // .length of function is 2
      "use strict";

      if (target === null || target === undefined) {
        throw new TypeError("Cannot convert undefined or null to object");
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
    configurable: true,
  });
}

function getStudyTitle(model, study) {
  let title;
  for (let i = 0; i < TITLE_KEYS.length; i++) {
    title = model.getStudyValue(study, TITLE_KEYS[i]);
    if (title) {
      break;
    }
  }
  if (!title) {
    title = study.Name;
  }
  return title;
}

const escapeHTML = (str) =>
  str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[tag] || tag)
  );
