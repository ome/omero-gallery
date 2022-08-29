const AND_CLAUSE_HTML = `
<div class="and_clause">
  <div class="or_clause">
    <div class="or no_expand">OR</div>
    <div class="search_key">
        <label for="keyFields">Attribute</label>
        <select id="keyFields" class="form-control keyFields">
        </select>
    </div>
    <div class="search_condition">
        <label for="condition">Operator</label>
        <select id="condition" class="form-control condition">
          <option value="equals">equals</option>
          <option value="not_equals">not equals</option>
          <option value="contains">contains</option>
          <option value="not_contains">not contains</option>
        </select>
    </div>
    <div class="search_value" style="position: relative">
        <label for="valueFields">Value</label>
        <input type="text" class="form-control valueFields" id="valueFields" placeholder="type the attribute value">
    </div>
    <div class="no_expand">
        <button type="button" class="remove_row btn btn-sm btn-outline-danger">
          X
        </button>
    </div>
  </div>
  <button type="button" class="addOR" href="#" title="Add OR condition to the group">
    add 'OR'...
  </button>
</div>`;

const FORM_FOOTER_HTML = `
<div>
<button id="addAND" type="button" class="no-border" title="Add an 'AND' clause to the query">
  add AND...
</button>
<label class="form-check-label" for="case_sensitive">
  Case sensitive:
  <input class="form-check-input" type="checkbox" value="" id="case_sensitive" />
</label>
<button type="submit">Search</button>
</div>
`;

// <?xml version="1.0" encoding="iso-8859-1"?>
// <!-- Generator: Adobe Illustrator 18.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
// <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
const FILTER_ICON_SVG = `
<svg width="16px" height="16px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 210.68 210.68" style="enable-background:new 0 0 210.68 210.68;" xml:space="preserve">
<path d="M205.613,30.693c0-10.405-10.746-18.149-32.854-23.676C154.659,2.492,130.716,0,105.34,0
	C79.965,0,56.021,2.492,37.921,7.017C15.813,12.544,5.066,20.288,5.066,30.693c0,3.85,1.476,7.335,4.45,10.479l68.245,82.777v79.23
	c0,2.595,1.341,5.005,3.546,6.373c1.207,0.749,2.578,1.127,3.954,1.127c1.138,0,2.278-0.259,3.331-0.78l40.075-19.863
	c2.55-1.264,4.165-3.863,4.169-6.71l0.077-59.372l68.254-82.787C204.139,38.024,205.613,34.542,205.613,30.693z M44.94,20.767
	C61.467,17.048,82.917,15,105.34,15s43.874,2.048,60.399,5.767c18.25,4.107,23.38,8.521,24.607,9.926
	c-1.228,1.405-6.357,5.819-24.607,9.926c-16.525,3.719-37.977,5.767-60.399,5.767S61.467,44.338,44.94,40.62
	c-18.249-4.107-23.38-8.521-24.607-9.926C21.56,29.288,26.691,24.874,44.94,20.767z M119.631,116.486
	c-1.105,1.341-1.711,3.023-1.713,4.761l-0.075,57.413l-25.081,12.432v-69.835c0-1.741-0.605-3.428-1.713-4.771L40.306,54.938
	C58.1,59.1,81.058,61.387,105.34,61.387c24.283,0,47.24-2.287,65.034-6.449L119.631,116.486z"/>
</svg>`;

class OmeroSearchForm {
  constructor(formId, SEARCH_ENGINE_URL, resultsId) {
    this.SEARCH_ENGINE_URL = SEARCH_ENGINE_URL;
    this.resources_data = {};
    this.query_mode = "searchterms";
    this.cached_key_values = {};

    // build form
    this.formId = formId;
    this.$form = $(`#${formId}`);
    this.$form.html(`<div class="clauses"></div>`);
    this.$form.append($(FORM_FOOTER_HTML));

    // If resultsId, create results element...
    if (resultsId) {
      this.$results = $(`#${resultsId}`);
    }

    this.buttonHandlers();
    this.pubsub = $({});

    // TODO: wait for loadResources()
    // then build form...
    (async function () {
      await this.loadResources();
      this.addAnd();
      this.trigger("ready");
    }.bind(this)());
  }

  // pub/sub methods. see https://github.com/cowboy/jquery-tiny-pubsub
  on() {
    let o = this.pubsub;
    o.on.apply(o, arguments);
  }

  off() {
    let o = this.pubsub;
    o.off.apply(o, arguments);
  }

  trigger() {
    let o = this.pubsub;
    o.trigger.apply(o, arguments);
  }

  async loadResources(mode = "searchterms") {
    let url;
    if (mode == "advanced") {
      url = this.SEARCH_ENGINE_URL + "resources/all/keys/";
    } else {
      url = this.SEARCH_ENGINE_URL + "resources/all/keys/";
      url = url + "?mode=" + encodeURIComponent(mode);
    }
    this.resources_data = await fetch(url).then((response) => response.json());
    if (this.resources_data.error != undefined) {
      alert(this.resources_data.error);
    }

    return this.resources_data;
  }

  findResourceForKey(key) {
    // e.g. find if 'Antibody' key comes from 'image', 'project' etc
    for (let resource in this.resources_data) {
      if (this.resources_data[resource].includes(key)) {
        return resource;
      }
    }
    // Not found: e.g. this.resources_data only has common 'searchterms'
    // assume 'image'...
    return "image";
  }

  getCurrentQuery() {
    let form_id = this.formId;
    let and_conditions = [];
    let or_conditions = [];

    let queryandnodes = document.querySelectorAll(`#${form_id} .and_clause`);
    for (let i = 0; i < queryandnodes.length; i++) {
      let node = queryandnodes[i];
      // handle each OR...
      let ors = node.querySelectorAll(".or_clause");

      let or_dicts = [...ors].map((orNode) => {
        return {
          name: orNode.querySelector(".keyFields").value,
          value: orNode.querySelector(".valueFields").value,
          operator: orNode.querySelector(".condition").value,
          resource: this.findResourceForKey(
            orNode.querySelector(".keyFields").value
          ),
        };
      });
      if (or_dicts.length > 1) {
        or_conditions.push(or_dicts);
      } else {
        and_conditions.push(or_dicts[0]);
      }
    }

    let query_details = {};
    var query = {
      resource: "image",
      query_details: query_details,
    };

    query_details["and_filters"] = and_conditions;
    query_details["or_filters"] = or_conditions;
    query_details["case_sensitive"] =
      document.getElementById("case_sensitive").checked;
    query["mode"] = this.query_mode;
    return query;
  }

  getHumanReadableQuery() {
    // E.g. "Antibody equals seh1-fl antibody AND (Gene Symbol equals cdc42 OR Gene Symbol equals cdc25c)"
    let query = this.getCurrentQuery();
    // name, value, operator, resource
    let andQuery = query.query_details.and_filters.map(q => `${q.name} ${q.operator} ${q.value}`).join(" AND ");
    let orQueries = query.query_details.or_filters.map(ors => {
      return "(" + ors.map(q => `${q.name} ${q.operator} ${q.value}`).join(" OR ") + ")";
    });
    let results = [];
    if (andQuery.length > 0) {
      results.push(andQuery);
    }
    if (orQueries.length > 0) {
      results.push(orQueries);
    }
    return results.join(" AND ");
  }

  setAdvanced(advanced) {
    // show/hide advanced search buttons "AND" and "OR" for creating advanced searches
    if (advanced) {
      this.$form.removeClass("simpleForm");
    } else {
      this.$form.addClass("simpleForm");
    }
  }

  setKeyValues($orClause) {
    // Adds <option> to '.keyFields' for each item in pre-cached resources_data
    let $field = $(".keyFields", $orClause);
    let anyOption = `<option value="Any">Any</option>`;
    // only show 'image' attributes
    let imgKeys = this.resources_data.image;
    imgKeys.sort();
    let html = imgKeys.map((value) => `<option value="${value}">${value}</option>`).join("\n");
    $field.html(anyOption + html);
  }

  autocompleteSort(queryVal) {
    // returns a sort function based on the current query Value
    // NB: same logic in autocompleteSort() function used on front page
    queryVal = queryVal.toLowerCase();
    const KNOWN_KEYS = this.resources_data;
    return (a, b) => {
      // if exact match, show first
      let aMatch = queryVal == a.Value.toLowerCase();
      let bMatch = queryVal == b.Value.toLowerCase();
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

  initAutoComplete($orClause) {
    let self = this;
    let $this = $(".valueFields", $orClause);
    // key is updated when user starts typing, also used to handle response and select
    let key;
    $this
      .autocomplete({
        autoFocus: false,
        delay: 1000,
        source: function (request, response) {
          // Need to know what Attribute is of adjacent <select>
          key = $(".keyFields", $orClause).val();
          console.log("key...", key);
          let url = `${SEARCH_ENGINE_URL}resources/image/searchvalues/?value=${encodeURI(
            request.term
          )}&resource=image`;
          if (key != "Any") {
            url = url += `&key=${encodeURI(key)}`;
          }
          // showSpinner();
          $.ajax({
            dataType: "json",
            type: "GET",
            url: url,
            success: function (data) {
              // hideSpinner();
              let results = [{ label: "No results found.", value: -1 }];
              if (data.data.length > 0) {
                // only try to show top 100 items...
                let max_shown = 100;
                let result_count = data.data.length;
                let data_results = data.data;
                // sort to put exact and 'known' matches first
                data_results.sort(self.autocompleteSort(request.term));
                results = data_results.slice(0, 100).map((result) => {
                  let showKey = key === "Any" ? `(${result.Key})` : "";
                  return {
                    key: result.Key,
                    label: `<b>${result.Value}</b> ${showKey} <span style="color:#bbb">${result["Number of images"]} images</span>`,
                    value: `${result.Value}`,
                  };
                });
                if (result_count > max_shown) {
                  results.push({
                    key: -1,
                    label: `...and ${
                      result_count - max_shown
                    } more matches not shown`,
                    value: -1,
                  });
                }
              }
              response(results);
            },
            error: function (data) {
              console.log("ERROR", data);
              // hideSpinner();
              response([{ label: "Failed to load", value: -1 }]);
            },
          });
        },
        minLength: 3,
        open: function () {},
        close: function () {
          // $(this).val('');
          return false;
        },
        focus: function (event, ui) {},
        select: function (event, ui) {
          console.log("select", ui.item, key == "Any");
          if (ui.item.value == -1) {
            // Ignore 'No results found'
            return false;
          }
          if (key == "Any") {
            // Use 'key' to update KeyField
            self.setKeyField($orClause, ui.item.key);
          }
          // We perform search with chosen value...
          setTimeout(() => {
            // wait for UI to update!
            self.formUpdated();
          }, 100);
          return true;
        },
      })
      .data("ui-autocomplete")._renderItem = function (ul, item) {
      return $("<li>")
        .append("<a style='font-size:14px; width:245px'>" + item.label + "</a>")
        .appendTo(ul);
    };
  }

  setKeyField($parent, key) {
    // Adds the Key as an <option> to the <select> if not there;
    let $select = $(".keyFields", $parent);
    if ($(`option[value='${key}']`, $select).length == 0) {
      $select.append($(`<option value="${key}">${key}</option>`));
    }
    $select.val(key);
  }

  displayHideRemoveButtons() {
    let $btns = $(".remove_row", this.$form);
    $btns.each(function (index, btn) {
      if ($btns.length == 1) {
        $(btn).css("visibility", "hidden");
      } else {
        $(btn).css("visibility", "visible");
      }
    });
  }

  setKeyValueQuery(query) {
    let { key, value } = query;
    // Clear form and create new...
    $(".clauses", this.$form).empty();
    this.addAnd(query);
  }

  setQuery(jsonQuery) {
    // set complete state of form - opposite of getCurrentQuery()
    
    const and_conditions = jsonQuery.query_details["and_filters"];
    const or_conditions = jsonQuery.query_details["or_filters"];
    const case_sensitive = jsonQuery.query_details["case_sensitive"]

    document.getElementById("case_sensitive").checked = case_sensitive;

    // Clear form and create new...
    $(".clauses", this.$form).empty();

    and_conditions.forEach(cond => {
      console.log("Adding AND", cond, this);
      this.addAnd(cond);
    });

    or_conditions.forEach(or_clauses => {
      
      let $clause = this.addAnd(or_clauses[0]);
      or_clauses.slice(1).forEach(or => {
        this.addOr($clause, or);
      });
    });
  }

  addAnd(query) {
    // query is e.g. {key: "Antibody", value: "foo"}
    let $andClause = $(AND_CLAUSE_HTML);
    $(".clauses", this.$form).append($andClause);

    // auto-complete (for the first row in the form)
    this.initAutoComplete($andClause);
    this.setKeyValues($andClause);

    console.log("addAnd", query);
    if (query?.name) {
      // add <option> if not there
      this.setKeyField($andClause, query.name);
    }
    if (query?.value) {
      $(".valueFields", $andClause).val(query.value);
    }
    if (query?.operator) {
      $(".condition", $andClause).val(query.operator);
    }

    this.displayHideRemoveButtons();
    return $andClause;
  }

  addOr($andClause, query) {
    let $orClause = $(".or_clause", $andClause).last().clone();
    // Clone the last '.or_clause' and insert it before the ".addOR" button
    $(".addOR", $andClause).before($orClause);
    // init auto-complete for ALL 'or' rows (re-init for existing rows)
    this.initAutoComplete($orClause);
    this.displayHideRemoveButtons();

    if (query?.key) {
      // add <option> if not there
      this.setKeyField($orClause, query.key);
    }
    if (query?.value) {
      $(".valueFields", $orClause).val(query.value);
    }
    if (query?.condition) {
      $(".condition", $orClause).val(query.condition);
    }
  }

  removeOr($orClause) {
    let $andClause = $orClause.closest(".and_clause");
    $orClause.remove();
    // Remove parent 'and_clause' if it has no other 'or_clause'
    if ($(".or_clause", $andClause).length === 0) {
      $andClause.remove();
    }
    this.displayHideRemoveButtons();
  }

  showSpinner() {
    $("#filterSpinner").show();
  }

  hideSpinner() {
    $("#filterSpinner").hide();
  }

  submitSearch() {
    let query = this.getCurrentQuery();
    let self = this;
    console.log(query);
    this.$results.empty();
    this.showSpinner();
    $.ajax({
      type: "POST",
      url: SEARCH_ENGINE_URL + "resources/submitquery_returnstudies/",
      contentType: "application/json;charset=UTF-8",
      dataType: "json",
      data: JSON.stringify(query),
      success: function (data) {
        self.hideSpinner();
        if (data["Error"] != "none") {
          alert(data["Error"]);
          return;
        }
        // publish results to subscribers
        self.trigger("results", data);
        // can display in table if specified
        if (self.$results) {
          self.displayResults(data);
        }
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        alert("Status: " + textStatus);
        alert("Error: " + errorThrown);
      },
    });
  }

  displayResults(data) {
    console.log("displayResults", data);
    // TODO: check how errors are handled
    // if (data.Error && data.Error != "none") {
    //     $("#dataTable").html(`<tr><td>${data.Error}</td></tr>`);
    //     return;
    // }

    let studyList = data.results.results;

    if (studyList.length == 0) {
      // TODO: improve display of message...
      alert("No results");
    }

    let thead = `<li class="studyRow resultsHeader">
      <div class="studyColumns">
        <div class="caret"></i></div>
        <div class="studyId">Study ID</div>
        <div class="count">Images</div>
        <div class="studyName">Title</div>
      </div>
    </li>`;

    let resultsList = studyList
      .map((row) => {
        let studyName = row["Name (IDR number)"];
        let title = row["title"];
        let tokens = studyName.split("-");
        let studyId = tokens[0] + studyName.slice(studyName.length - 1);
        let count = row["image count"];
        return `<li class="studyRow" data-name="${studyName}">
            <div class="studyColumns">
                <div class="caret"><i class="fa fa-caret-right"></i></div>
                <div class="studyId">${studyId}</div>
                <div class="count">${count}</div>
                <div class="studyName">${title}</div>
            </div>
            <div class="studyImages"><span class="loadingMsg">Loading images...</span></div>
        </li>`;
      })
      .join("\n");

    if (this.$results) {
      this.$results.html(thead + resultsList);
    }
  }

  displayImages(data, $studyRow) {
    const imageList = data.results.results;
    console.log("displayImages", imageList);
    let html = imageList
      .map((img) => {
        // Each humbnail links to image viewer. Hover menu links to viewer (eye) and webclient (i)
        return `<li class="studyThumb">
          <a target="_blank" href="${BASE_URL}webclient/img_detail/${img.id}">
            <img title="${img.name}" src="${BASE_URL}webclient/render_thumbnail/${img.id}/" loading="lazy" />
          </a>
          <ul class="imgLinks">
            <li title="Browse image metadata">
              <a target="_blank" href="${BASE_URL}webclient/?show=image-${img.id}"><i class="fas fa-info"></i></a>
            </li>
            <li title="Open Image in Viewer">
              <a target="_blank" href="${BASE_URL}webclient/img_detail/${img.id}"><i class="fas fa-eye"></i></a>
            </li>
          </ul>
        </li>`;
      })
      .join("");
    $(".studyImages", $studyRow).html(`<ul>${html}</ul>`);
  }

  formUpdated() {
    this.submitSearch();
    this.trigger("form_updated");
  }

  // Set-up event handlers on Buttons
  buttonHandlers() {
    $("#addAND").on("click", (event) => {
      event.preventDefault();
      this.addAnd();
    });

    this.$form.on("click", ".addOR", (event) => {
      event.preventDefault();
      let $andClause = $(event.target).closest(".and_clause");
      this.addOr($andClause);
    });

    this.$form.on("click", ".remove_row", (event) => {
      event.preventDefault();
      let $orClause = $(event.target).closest(".or_clause");
      this.removeOr($orClause);
    });

    this.$form.on("change", ".keyFields", (event) => {
      // clear the value field for this clause
      let $orClause = $(event.target).parents(".or_clause");
      $(".valueFields", $orClause).val("");
    });

    // change to 'equals' / 'contains' etc triggers search...
    this.$form.on("change", ".condition", (event) => {
      this.formUpdated();
    });

    $("button[type='submit']", this.$form).on("click", (event) => {
      event.preventDefault();
      this.formUpdated();
    });

    // click on a Study to load child images...
    if (this.$results) {
      $(this.$results).on("click", ".studyColumns", (event) => {
        console.log("studyRow click", event.target, event.target.nodeName);
        // ignore click on links...
        if (event.target.nodeName == "A") return;
        let $studyRow = $(event.target).parents(".studyRow");
        const studyName = $studyRow.data("name");
        console.log($studyRow, studyName);
        if (!studyName) {
          return; // e.g. clicked on header
        }
        $studyRow.toggleClass("expanded");

        // Load study images...
        let query = this.getCurrentQuery();
        let self = this;
        query.query_details.and_filters.push({
          name: "Name (IDR number)",
          value: studyName,
          operator: "equals",
          resource: "project", // NB: this works for screens too!
        });
        if ($studyRow.hasClass("expanded")) {
          $.ajax({
            type: "POST",
            url: SEARCH_ENGINE_URL + "resources/submitquery/",
            contentType: "application/json;charset=UTF-8",
            dataType: "json",
            data: JSON.stringify(query),
            success: function (data) {
              if (data["Error"] != "none") {
                alert(data["Error"]);
                return;
              }
              self.displayImages(data, $studyRow);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
              alert("Error: " + errorThrown);
            },
          });
        }
      });
    }
  }
}
