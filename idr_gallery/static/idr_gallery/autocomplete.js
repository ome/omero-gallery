// ------ AUTO-COMPLETE -------------------

document.getElementById("maprConfig").onchange = (event) => {
  document.getElementById("maprQuery").value = "";
  let value = event.target.value.replace("mapr_", "");
  let placeholder = `Type to filter values...`;
  if (mapr_settings[value]) {
    placeholder = `Type ${mapr_settings[value]["default"][0]}...`;
  }
  document.getElementById("maprQuery").placeholder = placeholder;
  // Show all autocomplete options...
  $("#maprQuery").focus();

  // render();
};

function showAutocomplete(event) {
  var configId = document.getElementById("maprConfig").value;
  var autoCompleteValue = event.target.value;

  if (configId.indexOf("mapr_") != 0) {
    // If not MAPR search, show all auto-complete results
    autoCompleteValue = "";
  }

  $("#maprQuery").autocomplete("search", autoCompleteValue);
}

document.getElementById("maprQuery").onfocus = function (event) {
  showAutocomplete(event);
};

document.getElementById("maprQuery").onclick = function (event) {
  showAutocomplete(event);
};

function showSpinner() {
  document.getElementById("spinner").style.visibility = "visible";
}
function hideSpinner() {
  document.getElementById("spinner").style.visibility = "hidden";
}

// This is used by the home page but NOT by the search page itself
function enableEnterGoesToResultsPage() {
  $("#maprQuery").keyup((event) => {
    if (event.which == 13) {
      let configId = document.getElementById("maprConfig").value;
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${event.target.value}`;
    }
  });
}

// Initial setup...
$("#maprQuery")
  .autocomplete({
    autoFocus: false,
    delay: 1000,
    source: function (request, response) {
      // if configId is not from mapr, we filter on mapValues...
      let configId = document.getElementById("maprConfig").value;

      if (configId.indexOf("mapr_") != 0 && configId != "any") {
        let matches;
        if (configId === "Name") {
          matches = model.getStudiesNames(request.term);
        } else if (configId === "Group") {
          matches = model.getStudiesGroups(request.term);
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
      configId = configId.replace("mapr_", "");
      let case_sensitive = false;

      let requestData = {
        case_sensitive: case_sensitive,
      };
      let url;
      if (configId === "any") {
        // Use searchengine...
        url = `https://idr-testing.openmicroscopy.org/searchengine/searchusingvaluesonly/`;
        requestData = { value: request.term, resource: "image" };
      } else {
        // Use mapr to find auto-complete matches
        url = `${BASE_URL}mapr/api/autocomplete/${configId}/`;
        requestData.value = case_sensitive
          ? request.term
          : request.term.toLowerCase();
        requestData.query = true; // use a 'like' HQL query
      }
      showSpinner();
      $.ajax({
        dataType: "json",
        type: "GET",
        url: url,
        data: requestData,
        success: function (data) {
          hideSpinner();
          console.log("data", data);
          let results = [];
          if (configId === "any") {
            let studies = getMatchingStudiesResults(request.term);
            let images = data.results.map((result) => {
              return {
                key: result.Attribute,
                label: `<b>${result.Value}</b> (${result.Attribute}) <span style="color:#bbb">${result["Number of images"]} images</span>`,
                value: `${result.Value}`,
              };
            });
            results = studies.concat(images);
          } else {
            results = data;
          }
          if (results.length === 0) {
            results = [{ label: "No results found.", value: -1 }];
          }
          response(results);
        },
        error: function (data) {
          hideSpinner();
          response([
            {
              label: "Loading auto-complete terms failed. Server may be busy.",
              value: -1,
            },
          ]);
        },
      });
    },
    minLength: 0,
    open: function () {},
    close: function () {
      // $(this).val('');
      return false;
    },
    focus: function (event, ui) {},
    select: function (event, ui) {
      if (ui.item.value == -1) {
        // Ignore 'No results found'
        return false;
      }
      // show temp message in case loading search page is slow
      $(this).val("loading search results...");
      // Load search page...
      let configId = document.getElementById("maprConfig").value;
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${ui.item.value}`;
      return false;
    },
  })
  .data("ui-autocomplete")._renderItem = function (ul, item) {
  console.log("item", item.label);
  return $("<li>")
    .append("<a>" + item.label + "</a>")
    .appendTo(ul);
};

function getMatchingStudiesResults(text) {
  let matches = model.filterStudiesAnyText(text);
  // matches are list of [study, ["key: value", "Description: this study is great"]]
  console.log("getMatchingStudiesResults", text, matches);

  let regexes = text.split(" ").map((token) => new RegExp(token, "i"));
  function markup(string) {
    let markedUp = regexes.reduce(
      (prev, regex) => prev.replace(regex, "<b>$&</b>"),
      string
    );
    // truncate around <b>...</b>
    let start = markedUp.indexOf("<b>") - 20;
    let end = markedUp.indexOf("</b>") + 20;
    return (
      (start > 0 ? "..." : "") +
      markedUp.slice(start, end) +
      (end < markedUp.length ? "..." : "")
    );
  }

  // return a list of STUDIES, not Values
  return matches.map((match) => {
    let study = match[0];
    let studyId = study.Name.split("-")[0];
    // find any key/value match other than 'Description'
    let kvps = match[1].filter((kv) => kv[0] != "Description");
    let matchingText = "";
    if (kvps.length > 0) {
      let kvp = kvps[0];
      matchingText = `(${kvp[0]}: ${markup(kvp[1])})`;
    } else {
      matchingText = `(${markup(study.Description)})`;
    }

    return `${study.Name} ${matchingText}`;
  });
}
