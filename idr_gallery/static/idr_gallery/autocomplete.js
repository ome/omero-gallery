// ------ AUTO-COMPLETE -------------------
// use this to highlight auto-complete items. Uses css from jQueryUI
let SELECT_CLASS = "ui-state-active";

let KNOWN_KEYS = {};

// immediately load keys from search engine. Used for autocomplete sorting
url = `${SEARCH_ENGINE_URL}resources/all/keys/?mode=searchterms`;
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
        // pick currently highlighted option
        let $picked = $(`#searchResultsContainer .${SELECT_CLASS} a`);
        // JS can't open a new tab (user needs to click a link)
        if ($picked.length > 0) {
          document.location.href = $picked.attr("href");
        }
        return;
      }
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${event.target.value}`;
    }
  });
}

function escapeRegExp(string) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function autoCompleteDisplayResults(queryVal, data) {
  // For showing the searchengine results in a panel
  let queryRegex = new RegExp(escapeRegExp(queryVal), "ig"); // ignore-case, global

  // Search-engine results...
  let results = [...data.data];

  // Also show 'instant' filtering of studies
  // If there are no search-engine Image results, we highlight first Study
  const highlightStudy = results.length === 0;
  let studiesHtml = getMatchingStudiesHtml(queryVal, highlightStudy);

  results.sort(autocompleteSort(queryVal));
  let imagesHtml = results
    .map((result, index) => {
      // TODO: define how to encode query in search URL to support AND/OR clauses
      let cell_tissue = SUPER_CATEGORY ? SUPER_CATEGORY.id + "/" : "";
      let params = new URLSearchParams();
      params.append("key", result.Key);
      params.append("value", result.Value);
      params.append("operator", "equals");
      let result_url = `${GALLERY_HOME}${cell_tissue}search/?${params.toString()}`;
      return `<div ${index == 0 && `class="${SELECT_CLASS}"`}>
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
      // Don't handle empty queries
      if (request.term.trim().length == 0) {
        response();
        return;
      }

      // Old filter-by-Study-Attribute, e.g. "Name"
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

      // Auto-complete to filter by mapr, or use search-engine for 'any' key...
      configId = configId.replace("mapr_", "");
      let case_sensitive = false;

      let requestData = {
        case_sensitive: case_sensitive,
      };
      let url;
      if (configId === "any") {
        // Use searchengine...
        url = `${SEARCH_ENGINE_URL}resources/image/searchvalues/`;
        requestData = { value: request.term };
      } else {
        // Use mapr to find auto-complete matches TODO: to be removed
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
          // check that input hasn't changed during the call
          if (configId === "any" && request.term.trim() == queryVal) {
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
    minLength: 1,
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
      // show spinner in case loading search page is slow
      showSpinner();

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

function getMatchingStudiesHtml(text, highlightStudy) {
  if (text.length == 0) {
    return "";
  }

  let results = model.filterStudiesAnyText(text);
  let html = results
    .map((studyText, index) => {
      let [study, matchingStrings] = studyText;

      let regex = new RegExp(escapeRegExp(text.trim()), "i");
      function markup(string) {
        let marked = string.replace(regex, "<mark>$&</mark>");
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

      // wrapper class for highlight - <a> child of wrapper is chosen on Enter
      return `<div class="${highlightStudy && index == 0 && SELECT_CLASS}">
      <a target="_blank" href="${BASE_URL}webclient/?show=${study.objId}">
      <div class="matchingStudy">
        <div>
          Study ${idrId} <span class="imgCount">(${imgCount})</span>
        </div>
        <div class="matchingString">
          ${matchingString}
        </div>
      </div></a></div>`;
    })
    .join("\n");

  if (results.length == 0) {
    html = "";
  } else {
    html = `<div class="searchScroll scrollBarVisible">${html}</div>`;
  }

  return html;
}
