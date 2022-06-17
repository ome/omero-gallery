// ------ AUTO-COMPLETE -------------------

const KNOWN_KEYS = {
  image: [
    "Antibody",
    "siRNA Pool Identifier",
    "PubChem CID",
    "Pathology Identifier",
    "Cell Line",
    "Antibody Identifier",
    "Organism Part",
    "InChIKey",
    "Gene Symbol",
    "Organism",
    "Protein",
    "Pathology",
    "Phenotype Term Accession",
    "Compound Name",
    "Gene Name",
    "siRNA Identifier",
    "Phenotype",
  ],
  project: [
    "Publication Authors",
    "Study Type",
    "License",
    "Publication Title",
    "Imaging Method",
    "Name (IDR number)",
  ],
  screen: ["Screen Technology Type", "Screen Type"],
};

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
      if (configId == "any") {
        return false;
      }
      document.location.href = `${GALLERY_HOME}search/?query=${configId}:${event.target.value}`;
    }
  });
}

// "instant" auto-complete for 'Any' key searches Studies and shows
// full-page results panel (the ajax search results for images are added to
// this from the $.autocomplete response below)
$("#maprQuery").on("keyup", function (event) {
  let configId = document.getElementById("maprConfig").value;
  if (configId != "any") {
    $("#searchResultsContainer").hide();
    return;
  }
  let input = event.target.value.trim();
  let studiesHtml = getMatchingStudiesHtml(input);
  document.getElementById("studySearchResults").innerHTML = studiesHtml;
  $("#searchResultsContainer").show();
});

function autocompleteSort(queryVal) {
  // returns a sort function based on the current query Value
  return (a, b) => {
    // if exact match, show first
    let aMatch = queryVal == a.Value;
    let bMatch = queryVal == b.Value;
    if (aMatch != bMatch) {
      return aMatch ? -1 : 1;
    }
    // show all known Keys before unknown
    let aKnown = KNOWN_KEYS.image.includes(a.Key);
    let bKnown = KNOWN_KEYS.image.includes(b.Key);
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
        // Use searchengine... #TODO: make configurable
        url = `https://idr-testing.openmicroscopy.org/searchengine/api/v1/resources/image/searchvalues/`;
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
          console.log("data", data);
          let queryVal = $("#maprQuery").val();
          let queryRegex = new RegExp(queryVal, "ig"); // ignore-case, global
          let results = [];
          if (configId === "any") {
            let results = [...data.data];
            results.sort(autocompleteSort(queryVal));
            let imagesHtml = results
              .map((result) => {
                return `<div>
                  <a target="_blank"
                    href="https://idr-testing.openmicroscopy.org/webclient/search/?search_query=${encodeURI(
                      result.Key
                    )}:${encodeURI(result.Value)}">
                    ${
                      result["Number of images"]
                    } Images <span style="color:#bbb">matched</span> ${
                  result.Key
                }: ${result.Value.replace(queryRegex, "<mark>$&</mark>")}
                  </a></div>
                  `;
              })
              .join("\n");
            let html = `<div class="searchScroll scrollBarVisible">${imagesHtml}</div>`;
            document.getElementById("imageSearchResults").innerHTML = html;
          } else {
            results = data;
          }
          // if (results.length === 0) {
          //   results = [{ label: "No results found.", value: -1 }];
          // }
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
  console.log("item", item.label);
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

      let regexes = text.split(" ").map((token) => new RegExp(token, "i"));
      function markup(string) {
        return regexes.reduce(
          (prev, regex) => prev.replace(regex, "<mark>$&</mark>"),
          string
        );
      }
      let idrId = study.Name.split("-")[0];
      let container = study.Name.split("/").pop();

      let imgCount = imageCount(idrId, container);
      let matchingString = "";
      let matchingDesc = matchingStrings.find((kvp) => kvp[0] == "Description");
      if (matchingDesc) {
        matchingString = markup(matchingDesc.join(": "));
      } else {
        matchingString = matchingStrings
          .map((kvp) => kvp.join(": "))
          .map(markup)
          .join("<br>");
      }

      return `<div>
        <a target="_blank" href="${BASE_URL}webclient/?show=${study.objId}">Study ${idrId}</a>
        (${imgCount})
        <span style="color:#bbb">matched</span> ${matchingString}
        </div>`;
    })
    .join("\n");

  if (results.length == 0) {
    html = "No studies found";
    // if (SUPER_CATEGORY) {
    //   if (SUPER_CATEGORY.id === "cell") {
    //     html += ` in Cell IDR. Try searching <a href="${GALLERY_INDEX}">all Studies in IDR</a>.`;
    //   } else if (SUPER_CATEGORY.id === "tissue") {
    //     html += ` in Tissue IDR. Try searching <a href="${GALLERY_INDEX}">all Studies in IDR</a>.`;
    //   }
    // } else {
    //   html += ". Try searching for Image attributes above."
    // }
  } else {
    html = `<div class="searchScroll scrollBarVisible">${html}</div>`;
  }

  return html;
}
