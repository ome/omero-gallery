
// ------ AUTO-COMPLETE -------------------

document.getElementById('maprConfig').onchange = (event) => {
    document.getElementById('maprQuery').value = '';
    let value = event.target.value.replace('mapr_', '');
    let placeholder = `Type to filter values...`;
    if (mapr_settings[value]) {
        placeholder = `Type ${mapr_settings[value]['default'][0]}...`;
    }
    document.getElementById('maprQuery').placeholder = placeholder;
    // Show all autocomplete options...
    $("#maprQuery").focus();

    // render();
}

function showAutocomplete(event) {
    var configId = document.getElementById("maprConfig").value;
    var autoCompleteValue = event.target.value;

    if (configId.indexOf('mapr_') != 0) {
        // If not MAPR search, show all auto-complete results
        autoCompleteValue = '';
    }

    $("#maprQuery").autocomplete("search", autoCompleteValue);
}

document.getElementById('maprQuery').onfocus = function (event) {
    showAutocomplete(event);
};

document.getElementById('maprQuery').onclick = function (event) {
    showAutocomplete(event);
};

function showSpinner() {
    document.getElementById('spinner').style.visibility = 'visible';
}
function hideSpinner() {
    document.getElementById('spinner').style.visibility = 'hidden';
}

// Initial setup...
$("#maprQuery")
    .keyup(event => {
        if (event.which == 13) {
            let configId = document.getElementById("maprConfig").value;
            console.log(`${GALLERY_HOME}search/?query=${configId}:${event.target.value}`)
            // document.location.href = `${GALLERY_HOME}search/?query=${configId}:${event.target.value}`;
        }
    })
    .autocomplete({
        autoFocus: false,
        delay: 1000,
        source: function (request, response) {

            // if configId is not from mapr, we filter on mapValues...
            let configId = document.getElementById("maprConfig").value;
            if (configId.indexOf('mapr_') != 0) {

                let matches;
                if (configId === 'Name') {
                    matches = model.getStudiesNames(request.term);
                } else if (configId === 'Group') {
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
            configId = configId.replace('mapr_', '');
            let case_sensitive = false;

            let requestData = {
                case_sensitive: case_sensitive,
            }
            let url;
            if (request.term.length === 0) {
                // Try to list all top-level values.
                // This works for 'wild-card' configs where number of values is small e.g. Organism
                // But will return empty list for e.g. Gene
                url = `${BASE_URL}mapr/api/${configId}/`;
                requestData.orphaned = true
            } else {
                // Find auto-complete matches
                url = `${BASE_URL}mapr/api/autocomplete/${configId}/`;
                requestData.value = case_sensitive ? request.term : request.term.toLowerCase();
                requestData.query = true;   // use a 'like' HQL query
            }
            showSpinner();
            $.ajax({
                dataType: "json",
                type: 'GET',
                url: url,
                data: requestData,
                success: function (data) {
                    hideSpinner();
                    if (request.term.length === 0) {
                        // Top-level terms in 'maps'
                        if (data.maps && data.maps.length > 0) {
                            let terms = data.maps.map(m => m.id);
                            terms.sort();
                            response(terms);
                        }
                    }
                    else if (data.length > 0) {
                        response($.map(data, function (item) {
                            return item;
                        }));
                    } else {
                        response([{ label: 'No results found.', value: -1 }]);
                    }
                },
                error: function (data) {
                    hideSpinner();
                    response([{ label: 'Loading auto-complete terms failed. Server may be busy.', value: -1 }]);
                }
            });
        },
        minLength: 0,
        open: function () { },
        close: function () {
            // $(this).val('');
            return false;
        },
        focus: function (event, ui) { },
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
        }
    }).data("ui-autocomplete")._renderItem = function (ul, item) {
        return $("<li>")
            .append("<a>" + item.label + "</a>")
            .appendTo(ul);
    } 