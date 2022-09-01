// ------ AUTO-COMPLETE -------------------

let KNOWN_KEYS = {};

// immediately load keys from search engine. Used for autocomplete sorting
url = `${BASE_URL}searchengine/api/v1/resources/all/keys/?mode=searchterms`;
$.getJSON(url, function (data) {
  KNOWN_KEYS = data;
});

document.getElementById("maprConfig").onchange = (event) => {
  document.getElementById("maprQuery").value = "";
  let value = event.target.value.replace("mapr_", "");
  let placeholder = `Type to filter values...`;
  // hide any previous search-engine results
  $("#searchResultsContainer").hide();
  if (mapr_settings[value]) {
    placeholder = `Type ${mapr_settings[value]["default"][0]}...`;
  } else if (value == "any") {
    placeholder = "Search for anything...";
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
      if (configId == "any") {
        return false;
      }
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${event.target.value}`;
    }
  });
}

function autoCompleteDisplayResults(queryVal, data) {
  // For showing the searchengine results in a panel
  let queryRegex = new RegExp(queryVal, "ig"); // ignore-case, global

  // Also show 'instant' filtering of studies
  let studiesHtml = getMatchingStudiesHtml(queryVal);

  // Search-engine results...
  let results = [...data.data];
  results.sort(autocompleteSort(queryVal));
  let imagesHtml = results
    .map((result) => {
      // TODO: define how to encode query in search URL to support AND/OR clauses
      let cell_tissue = SUPER_CATEGORY ? SUPER_CATEGORY.id + "/" : "";
      let result_url = `${GALLERY_HOME}${cell_tissue}search/?key=${encodeURI(
        result.Key
      )}&value=${encodeURI(result.Value)}&operator=equals`;
      return `<div>
                  <a target="_blank"
                    href="${result_url}">
                    ${
                      result["Number of images"]
                    } Images <span style="color:#bbb">matched</span> <span class="black">${
        result.Key
      }:</span> ${result.Value.replace(queryRegex, "<mark>$&</mark>")}
                  </a></div>
                  `;
    })
    .join("\n");

  if (studiesHtml.length == 0 && imagesHtml == 0) {
    document.getElementById("imageSearchResults").innerHTML =
      "No matches found";
  } else {
    let html = `<div class="searchScroll scrollBarVisible">${imagesHtml}</div>`;
    document.getElementById("imageSearchResults").innerHTML = html;
  }
  // hide studies panel if not needed
  if (studiesHtml.length > 0) {
    $("#studySearchResults").show();
  } else {
    $("#studySearchResults").hide();
  }
  document.getElementById("studySearchResults").innerHTML = studiesHtml;

  $("#searchResultsContainer").show();
}

function autocompleteSort(queryVal) {
  queryVal = queryVal.toLowerCase();
  // returns a sort function based on the current query Value
  return (a, b) => {
    // if exact match, show first
    let aMatch = queryVal == a.Value.toLowerCase();
    let bMatch = queryVal == b.Value.toLowerCase();
    if (aMatch != bMatch) {
      return aMatch ? -1 : 1;
    }
    // show all known Keys before unknown
    let aKnown = KNOWN_KEYS?.image?.includes(a.Key);
    let bKnown = KNOWN_KEYS?.image?.includes(b.Key);
    if (aKnown != bKnown) {
      return aKnown ? -1 : 1;
    }
    // Show highest Image counts first
    let aCount = a["Number of images"];
    let bCount = b["Number of images"];
    return aCount > bCount ? -1 : aCount < bCount ? 1 : 0;
  };
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
        url = `${BASE_URL}searchengine/api/v1/resources/image/searchvalues/`;
        requestData = { value: request.term };
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
          let queryVal = $("#maprQuery").val().trim();
          let results = [];
          if (configId === "any") {
            autoCompleteDisplayResults(queryVal, data);
          } else {
            results = data;
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
      return false;
    },
    focus: function (event, ui) {},
    select: function (event, ui) {
      if (ui.item.value == -1) {
        // Ignore 'No results found'
        return false;
      }
      let configId = document.getElementById("maprConfig").value;
      if (configId == "any") {
        // 'any' auto-complete actions handled elsewhere
        return false;
      }
      // show temp message in case loading search page is slow
      $(this).val("loading search results...");
      // Load search page...
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${ui.item.value}`;
      return false;
    },
  })
  .data("ui-autocomplete")._renderItem = function (ul, item) {
  return $("<li>")
    .append("<a>" + item.label + "</a>")
    .appendTo(ul);
};

function getMatchingStudiesHtml(text) {
  if (text.length == 0) {
    return "";
  }

  let results = model.filterStudiesAnyText(text);
  let html = results
    .map((studyText) => {
      let [study, matchingStrings] = studyText;

      let regexes = text
        .trim()
        .split(" ")
        .map((token) => new RegExp(token, "i"));
      function markup(string) {
        const marked = regexes.reduce(
          (prev, regex) => prev.replace(regex, "<mark>$&</mark>"),
          string
        );
        // truncate to include <mark> and text either side
        let start = marked.indexOf("<mark>");
        let end = marked.lastIndexOf("</mark>");
        let length = end - start;
        let targetLength = 80;
        let padding = (targetLength - length) / 2;
        if (start - padding < 0) {
          start = 0;
        } else {
          start = start - padding;
        }
        let truncated = marked.substr(start, targetLength);
        if (start > 0) {
          truncated = "..." + truncated;
        }
        if (start + targetLength < marked.length) {
          truncated = truncated + "...";
        }
        return truncated;
      }
      let idrId = study.Name.split("-")[0];
      let container = study.Name.split("/").pop();

      let imgCount = imageCount(idrId, container);
      let matchingString = matchingStrings
        .map((kvp) => `<b>${markup(kvp[0])}</b>: ${markup(kvp[1])}`)
        .join("<br>");

      return `<a target="_blank" href="${BASE_URL}webclient/?show=${study.objId}">
      <div class="matchingStudy">
        <div>
          Study ${idrId} <span class="imgCount">(${imgCount})</span>
        </div>
        <div class="matchingString">
          ${matchingString}
        </div>
      </div></a>`;
    })
    .join("\n");

  if (results.length == 0) {
    html = "";
  } else {
    html = `<div class="searchScroll scrollBarVisible">${html}</div>`;
  }

  return html;
}
