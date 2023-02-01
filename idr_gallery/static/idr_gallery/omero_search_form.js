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
          <option value="contains">contains</option>
          <option value="equals">equals</option>
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

const NAME_KEY = "name";
// display this on the keyFields <select> in place of "name" key
const NAME_IDR_NUMBER = "Name (IDR number)";

const DISPLAY_TYPES = {
  image: "image",
  project: "experiment",
  screen: "screen",
  "experiments/screens": "experiments/screen",
};

// projects or screens might match Name or Description.
function mapNames(rsp, type, key, searchTerm, operator) {
  // rsp is a list of [ {id, name, description}, ]
  searchTerm = searchTerm.toLowerCase();

  // use_description not enabled yet (see below)
  // if (key == "description") {
  //   // results from resources/all/names/?use_description=true will include searches by name
  //   // need to check they really match description.
  //   rsp = rsp.filter((resultObj) => {
  //     return resultObj.description.toLowerCase().includes(searchTerm);
  //   });
  // }
  // Need to filter out containers without images
  rsp = rsp.filter((resultObj) => {
    return !(resultObj.no_images === 0);
  });

  return rsp.map((resultObj) => {
    let name = resultObj.name;
    let desc = resultObj.description;
    let attribute = key;
    // If we searched for Any, show all results.
    // "Attribute" form field will be filled (Name or Desc) if user picks item
    if (attribute == "Any") {
      attribute = name.toLowerCase().includes(searchTerm)
        ? NAME_KEY
        : "description";
    }
    let value = name;
    if (attribute == "description") {
      // truncate Description around matching word...
      let start = desc.toLowerCase().indexOf(searchTerm);
      let targetLength = 80;
      let padding = (targetLength - searchTerm.length) / 2;
      if (start - padding < 0) {
        start = 0;
      } else {
        start = start - padding;
      }
      let truncated = desc.substr(start, targetLength);
      if (start > 0) {
        truncated = "..." + truncated;
      }
      if (start + targetLength < desc.length) {
        truncated = truncated + "...";
      }
      value = desc;
      name = truncated;
    }

    return {
      key: attribute,
      label: `${attribute} <span style="color:#bbb">${operator}</span> <b>${name}</b> <span style="color:#bbb">(1 ${DISPLAY_TYPES[type]})</span>`,
      value,
      count: 1,
      dtype: type,
    };
  });
}

function autocompleteSort(queryVal, knownKeys = []) {
  // returns a sort function based on the current query Value
  // knownKeys is list of common keys e.g. ["Gene Symbol", "Antibody"] etc.

  queryVal = queryVal.toLowerCase();
  // const KNOWN_KEYS = [].concat(...Object.values(this.resources_data));
  return (a, b) => {
    // if exact match, show first
    let aMatch = queryVal == a.Value.toLowerCase();
    let bMatch = queryVal == b.Value.toLowerCase();
    if (aMatch != bMatch) {
      return aMatch ? -1 : 1;
    }
    // show all known Keys before unknown
    let aKnown = knownKeys.includes(a.Key);
    let bKnown = knownKeys.includes(b.Key);
    if (aKnown != bKnown) {
      return aKnown ? -1 : 1;
    }
    // Show highest counts first
    return a.count > b.count ? -1 : a.count < b.count ? 1 : 0;
  };
}

async function getAutoCompleteResults(key, query, knownKeys, operator) {
  let params = { value: query };
  if (key != "Any") {
    params.key = key;
  }
  params = new URLSearchParams(params).toString();
  let kvp_url = `${SEARCH_ENGINE_URL}resources/all/searchvalues/?` + params;
  let urls = [kvp_url];

  if (key == "Any" || key == "description" || key == NAME_KEY) {
    // Need to load data from 2 end-points
    let names_url = `${SEARCH_ENGINE_URL}resources/all/names/?value=${query}`;
    // NB: Don't show auto-complete for Description yet - issues with 'equals' search
    // if (key == "Any" || key == "description") {
    //   names_url += `&use_description=true`;
    // }
    urls.push(names_url);
  }

  const promises = urls.map((p) => fetch(p).then((rsp) => rsp.json()));
  const responses = await Promise.all(promises);

  const data = responses[0];

  // hideSpinner();
  let results;
  // combine 'screen', 'project' and 'image' results - can ignore 'well', 'plate' etc.
  let screenHits = data.screen.data.map((obj) => {
    return { ...obj, type: "screen", count: obj["Number of screens"] };
  });
  let projectHits = data.project.data.map((obj) => {
    return { ...obj, type: "project", count: obj["Number of projects"] };
  });
  // Need to combine 'screen' and 'project' results based on matching 'value', since any search
  // we perform with selected auto-complete item will search for 'containers'
  let projectScreenHits = {};
  projectHits.concat(screenHits).forEach((obj) => {
    let id = obj.Key + "=" + obj.Value;
    if (!projectScreenHits[id]) {
      projectScreenHits[id] = obj;
    } else {
      // we have duplicate result for project & screen - simply add counts
      console.log("Combining", obj, projectScreenHits[id]);
      projectScreenHits[id].count = projectScreenHits[id].count + obj.count;
      projectScreenHits[id].type = "experiments/screens";
    }
  });
  console.log("projectScreenHits", projectScreenHits);

  let imageHits = data.image.data.map((obj) => {
    return { ...obj, type: "image", count: obj["Number of images"] };
  });
  let data_results = [].concat(Object.values(projectScreenHits), imageHits);
  // sort to put exact and 'known' matches first
  data_results.sort(autocompleteSort(query, knownKeys));

  results = data_results.map((result) => {
    let type = result.type;
    let count = result.count;
    // if we're using 'contains' show e.g. >10 results
    let gt = operator == "contains" ? "&#8805; " : "";
    return {
      key: result.Key,
      label: `${result.Key} <span style="color:#bbb">${operator}</span> <b>${
        result.Value
      }</b> <span style="color:#bbb">(${gt}${count} ${DISPLAY_TYPES[type]}${
        count != 1 ? "s" : ""
      })</span>`,
      value: `${result.Value}`,
      dtype: type,
      count,
    };
  });
  // If we searched the 2nd Name/Description endpoint, concat the results...
  if (responses[1]) {
    const projectNameHits = mapNames(
      responses[1].project,
      "project",
      key,
      query,
      operator
    );
    const screenNameHits = mapNames(
      responses[1].screen,
      "screen",
      key,
      query,
      operator
    );
    const nameHits = projectNameHits.concat(screenNameHits);
    // TODO: sort nameHits...
    results = nameHits.concat(results);
  }

  // filter to remove annotation.csv KV pairs
  results = results.filter((item) => !item.value.includes("annotation.csv"));

  // Generate Summary of [{key: "name", count: 5, type: container, matches:[]} }
  let keyCounts = {};
  results.forEach((result) => {
    let key = result.key;
    if (!keyCounts[key]) {
      keyCounts[key] = {
        key: key,
        count: 0,
        type: result.dtype,
        matches: [],
      };
    }
    // result.dtype can be 'project', 'screen', 'experiments/screens'
    if (result.dtype == "project" || result.dtype == "screen") {
      if (!keyCounts[key].type.includes(result.dtype)) {
        keyCounts[key].type = "experiments/screens";
      }
    }
    keyCounts[key].count += result.count;
    keyCounts[key].matches.push(result);
  });
  let keyCountsList = Object.values(keyCounts);
  keyCountsList.sort((a, b) =>
    a.count < b.count ? 1 : a.count > b.count ? -1 : a.key > b.key ? 1 : -1
  );
  // NB: we only use the keyCounts[key] if key isn't "Any" below
  console.log("keyCountsList", keyCountsList);

  // truncate list
  let result_count = results.length;
  const max_shown = 100;
  if (result_count > max_shown) {
    results = results.slice(0, max_shown);
    results.push({
      key: -1,
      label: `...and ${result_count - max_shown} more matches not shown`,
      value: -1,
    });
  } else if (result_count == 0) {
    results = [{ label: "No results found.", value: -1 }];
  }

  // If not "Any", add an option to search for contains the currently typed query
  if (key != "Any" && keyCounts[key]) {
    let total = keyCounts[key].count;
    let type = keyCounts[key].type;
    // E.g. "Imaging Method contains light (16 experiments/screens)"
    // Or "Imaging Method contains SPIM (1 experiment)"
    const allOption = {
      key: key,
      label: `<span style="color:#bbb">${key} contains</span>
        <b>${query}</b> <span style="color:#bbb">(${total}
          ${DISPLAY_TYPES[type]}${total != 1 ? "s" : ""})</span>`,
      value: query,
      dtype: type,
      operator: "contains",
    };
    results.unshift(allOption);
  }

  return results;
}

const SPINNER_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="sync" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-sync fa-w-16 fa-spin fa-lg"><path fill="currentColor" d="M440.65 12.57l4 82.77A247.16 247.16 0 0 0 255.83 8C134.73 8 33.91 94.92 12.29 209.82A12 12 0 0 0 24.09 224h49.05a12 12 0 0 0 11.67-9.26 175.91 175.91 0 0 1 317-56.94l-101.46-4.86a12 12 0 0 0-12.57 12v47.41a12 12 0 0 0 12 12H500a12 12 0 0 0 12-12V12a12 12 0 0 0-12-12h-47.37a12 12 0 0 0-11.98 12.57zM255.83 432a175.61 175.61 0 0 1-146-77.8l101.8 4.87a12 12 0 0 0 12.57-12v-47.4a12 12 0 0 0-12-12H12a12 12 0 0 0-12 12V500a12 12 0 0 0 12 12h47.35a12 12 0 0 0 12-12.6l-4.15-82.57A247.17 247.17 0 0 0 255.83 504c121.11 0 221.93-86.92 243.55-201.82a12 12 0 0 0-11.8-14.18h-49.05a12 12 0 0 0-11.67 9.26A175.86 175.86 0 0 1 255.83 432z" class=""></path></svg>`;
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

    // disable default form submission behaviour
    // NB: Only needed on Safari
    this.$form.on("submit", (event) => {
      event.preventDefault();
    });

    // If resultsId, create results element...
    if (resultsId) {
      this.$results = $(`#${resultsId}`);
    }

    this.buttonHandlers();
    this.pubsub = $({});

    // TODO: wait for loadResources()
    // then build form...
    (async () => {
      await this.loadResources();
      this.addAnd();
      this.trigger("ready");
    })();
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
    // Remove key "Name (IDR number)", replace with "name"
    if (this.resources_data["project"].includes(NAME_IDR_NUMBER)) {
      this.resources_data["project"] = this.resources_data["project"].filter(
        (k) => k != NAME_IDR_NUMBER
      );
      this.resources_data["project"].push(NAME_KEY);
      this.resources_data["project"].sort();
    }

    return this.resources_data;
  }

  findResourceForKey(key) {
    // e.g. find if 'Antibody' key comes from 'image', 'project' etc
    for (let resource in this.resources_data) {
      if (this.resources_data[resource].includes(key)) {
        if (resource == "project" || resource == "screen") {
          resource = "container";
        }
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
    const maxLen = 50;
    let andQuery = query.query_details.and_filters
      .map(
        // show tooltip and truncate if value is too long
        (q) =>
          `<strong>${q.name}</strong>
          ${q.operator}
          <strong ${q.value.length > maxLen ? `title="${q.value}"` : ""}>
            ${q.value.slice(0, maxLen)}${q.value.length > maxLen ? "..." : ""}
          </strong>`
      )
      .join(" AND ");
    let orQueries = query.query_details.or_filters.map((ors) => {
      return (
        "(" +
        ors.map((q) => `${q.name} ${q.operator} ${q.value}`).join(" OR ") +
        ")"
      );
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
    // We combine 'project' and 'screen' into 'Study'
    let menu = {
      Study: this.resources_data.project.concat(this.resources_data.screen),
      Image: this.resources_data.image,
    };

    const getDisplayValue = (value) => {
      // UI shows "Name (IDR number)" instead of "name"
      if (value == NAME_KEY) {
        return NAME_IDR_NUMBER;
      }
      return value;
    };

    let html = Object.entries(menu)
      .map((resourceValues) => {
        let resource = resourceValues[0];
        let values = resourceValues[1];
        values.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
        const options = values
          .map(
            (value) =>
              `<option value="${value}">${getDisplayValue(value)}</option>`
          )
          .join("\n");
        return `<optgroup label="${resource}">${options}</optgroup>`;
      })
      .join("\n");
    $field.html(anyOption + html);
  }

  initAutoComplete($orClause) {
    let self = this;
    let $this = $(".valueFields", $orClause);
    const knownKeys = [].concat(...Object.values(this.resources_data));
    // key is updated when user starts typing, also used to handle response and select
    let key;
    $this
      .autocomplete({
        autoFocus: true,
        delay: 1000,
        source: async function (request, response) {
          // Need to know what Attribute is of adjacent <select>
          key = $(".keyFields", $orClause).val();
          let operator = $(".condition", $orClause).val();
          if (key != "Any") {
            // if we know the key, we will switch to 'equals' (except for the first 'contains' option)
            operator = "equals";
          }
          const query = request.term;
          const results = await getAutoCompleteResults(
            key,
            query,
            knownKeys,
            operator
          );
          response(results);
        },
        minLength: 1,
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
          if (key == "Any") {
            // Use 'key' to update KeyField
            self.setKeyField($orClause, ui.item.key, ui.item.dtype);
          } else {
            const operator =
              ui.item.operator == "contains" ? "contains" : "equals";
            self.setOperator($orClause, operator);
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
    $this.on("keyup", (event) => {
      if (!(event.which == 38 || event.which == 40)) {
        // on any keystroke (except up/down arrows),
        // hide auto-complete immediately to avoid selection of old results
        $this.autocomplete("close");
      }
    });
  }

  setKeyField($parent, key, resource) {
    // Adds the Key as an <option> to the <select> if not there;
    let $select = $(".keyFields", $parent);
    if ($(`option[value='${key}']`, $select).length == 0) {
      // update this.resources_data and re-render <select>
      if (resource == "container") {
        resource = "project";
      }
      this.resources_data[resource].push(key);
      this.setKeyValues($parent);
      $select = $(".keyFields", $parent);
    }
    $select.val(key);
  }

  setOperator($parent, operator) {
    // Adds the Key as an <option> to the <select> if not there;
    let $select = $(".condition", $parent);
    $select.val(operator);
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
    // Clear form and create new...
    $(".clauses", this.$form).empty();
    this.addAnd(query);
  }

  setQuery(jsonQuery) {
    // set complete state of form - opposite of getCurrentQuery()

    const and_conditions = jsonQuery.query_details["and_filters"];
    const or_conditions = jsonQuery.query_details["or_filters"];
    const case_sensitive = jsonQuery.query_details["case_sensitive"];

    document.getElementById("case_sensitive").checked = case_sensitive;

    // Clear form and create new...
    $(".clauses", this.$form).empty();

    and_conditions.forEach((cond) => {
      this.addAnd(cond);
    });

    or_conditions.forEach((or_clauses) => {
      let $clause = this.addAnd(or_clauses[0]);
      or_clauses.slice(1).forEach((or) => {
        this.addOr($clause, or);
      });
    });
  }

  addAnd(query) {
    // query is e.g. {key: "Antibody", value: "foo", operator?: "equals", resource: "image"}
    let $andClause = $(AND_CLAUSE_HTML);
    $(".clauses", this.$form).append($andClause);

    // auto-complete (for the first row in the form)
    this.initAutoComplete($andClause);
    this.setKeyValues($andClause);

    if (query?.key) {
      // add <option> if not there
      this.setKeyField($andClause, query.key, query.resource);
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

  modifyQueryCellTissue(query) {
    // If /cell or /tissue, SUPER_CATEGORY.id
    // NB: this uses global SUPER_CATEGORY variable
    if (SUPER_CATEGORY?.id) {
      let sampleType = SUPER_CATEGORY.id;
      query.query_details["or_filters"].push([
        {
          name: "Sample Type",
          value: sampleType,
          resource: "screen",
          operator: "equals",
        },
        {
          name: "Sample Type",
          value: sampleType,
          resource: "project",
          operator: "equals",
        },
      ]);
    }
    return query;
  }

  getPreviousSearchQuery() {
    // deep copy
    return JSON.parse(JSON.stringify(this.previousSearchQuery));
  }
  setPreviousSearchQuery(query) {
    this.previousSearchQuery = query;
  }

  validateQuery(query) {
    // If any keys are "Any", don't perform search...
    console.log("validating query...", query);
    let and_clauses = query?.query_details?.and_filters;
    let or_clauses = query?.query_details?.or_filters.flatMap((c) => c);

    let clauses = [];
    if (and_clauses) {
      clauses = clauses.concat(and_clauses);
    }
    if (or_clauses) {
      clauses = clauses.concat(or_clauses);
    }
    if (clauses.length == 0) {
      return false;
    }
    // Invalid if name is "Any"
    if (clauses.some((clause) => clause.name == "Any")) {
      console.log("Can't search for 'Any' key");
      return false;
    }
    // Invalid if value is empty
    if (clauses.some((clause) => clause.value.length === 0)) {
      console.log("Empty value field");
      return false;
    }
    return true;
  }

  submitSearch() {
    console.log("Submit search...");
    let query = this.getCurrentQuery();
    if (!this.validateQuery(query)) {
      console.log("Form not valid");
      return;
    }
    query = this.modifyQueryCellTissue(query);
    this.setPreviousSearchQuery(query);
    let self = this;
    this.$results.empty();
    this.showSpinner();
    $.ajax({
      type: "POST",
      url: SEARCH_ENGINE_URL + "resources/submitquery/containers/",
      contentType: "application/json;charset=UTF-8",
      dataType: "json",
      data: JSON.stringify(query),
      success: function (data) {
        self.hideSpinner();
        if (data["Error"] != "none") {
          alert(data["Error"]);
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
    let studyList = data.results?.results || [];

    let thead = `<li class="studyRow resultsHeader">
      <div class="studyColumns">
        <div class="caret"></i></div>
        <div title="Experiment or Screen ID" class="studyId">ID</div>
        <div class="count">Images</div>
        <div class="studyName">Publication Title</div>
      </div>
    </li>`;

    // sort by image count
    studyList.sort((a, b) => {
      return a["image count"] > b["image count"] ? -1 : 1;
    });

    function getValue(keyvals, key) {
      let kvp = keyvals.find((kv) => kv.key == key);
      return kvp?.value;
    }

    let resultsList = studyList
      .map((row) => {
        let studyName = row["name"];
        let keyVals = row["key_values"];
        let title =
          getValue(keyVals, "Publication Title") ||
          getValue(keyVals, "Study Title") ||
          studyName;
        let objId = row["id"];
        let objType = row["type"];
        let tokens = studyName.split("-");
        let studyId = tokens[0] + studyName.slice(studyName.length - 1);
        let count = row["image count"];
        return `<li class="studyRow" data-name="${studyName}">
            <div class="studyColumns">
                <div class="caret"><i class="fa fa-caret-right"></i></div>
                <div class="studyId">
                  <a href="${BASE_URL}webclient/?show=${objType}-${objId}" target="_blank">${studyId}</a></div>
                <div class="count">${count}</div>
                <div class="studyName" title="${title}">${title}</div>
            </div>
            <div class="studyImages">
              <ul></ul>
              <div class="studyImagesSpinner">
                ${SPINNER_SVG}
              <div>
            </span></div>
        </li>`;
      })
      .join("\n");

    if (this.$results) {
      this.$results.html(thead + resultsList);

      // Listen for scroll events to load paginated images...
      $(".studyImages", this.$results).on("scroll", (event) => {
        let $scroller = $(event.target);
        let contentHeight = $scroller.children().height();
        let scrollBottom = $scroller.scrollTop() + $scroller.height();
        let distanceToBottom = contentHeight - scrollBottom;
        if (distanceToBottom < 100) {
          // load more images...
          this.loadStudyImages($scroller.parents(".studyRow"));
        }
      });
    }
  }

  loadStudyImages($studyRow) {
    const studyName = $studyRow.data("name");
    if ($studyRow.hasClass("loading") || $studyRow.data("complete")) {
      return;
    }

    // Load study images, using previous query as basis
    let query = this.getPreviousSearchQuery();
    let self = this;
    query.query_details.and_filters.push({
      name: NAME_KEY,
      value: studyName,
      operator: "equals",
      resource: "container",
    });
    // if pagination data object exists, we are loading next pages...
    const pagination = $studyRow.data("pagination");
    if (pagination) {
      query.pagination = pagination;
    }
    $studyRow.addClass("loading", true); // shows spinner
    $.ajax({
      type: "POST",
      url: SEARCH_ENGINE_URL + "resources/submitquery/",
      contentType: "application/json;charset=UTF-8",
      dataType: "json",
      data: JSON.stringify(query),
      success: function (data) {
        let { total_pages, pagination } = data.results;
        let page = data.results.pagination.current_page;
        if (pagination && page < total_pages) {
          $studyRow.data("pagination", pagination);
        } else {
          $studyRow.data("complete", true);
        }
        self.displayImages(data, $studyRow);
        $studyRow.removeClass("loading");
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        alert("Error: " + errorThrown);
      },
    });
  }

  displayImages(data, $studyRow) {
    const imageList = data.results.results;
    const bookmark = data.results.bookmark;
    let html = imageList
      .map((img) => {
        // Each thumbnail links to image viewer. Hover menu links to viewer (eye) and webclient (i)
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

    // add to existing list...
    $(".studyImages>ul", $studyRow).append(html);
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
        // ignore click on links...
        if (event.target.nodeName == "A") return;
        let $studyRow = $(event.target).parents(".studyRow");
        const studyName = $studyRow.data("name");
        if (!studyName) {
          return; // e.g. clicked on header
        }
        $studyRow.toggleClass("expanded");

        if ($studyRow.hasClass("expanded")) {
          // Only load if not loaded before
          if ($(".studyImages li", $studyRow).length == 0) {
            this.loadStudyImages($studyRow);
          }
        }
      });
    }
  }
}
