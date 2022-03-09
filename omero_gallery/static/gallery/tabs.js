
// Load tabs JSON from config.json file at INDEX_JSON_URL and use to create tabs html
// Then init the tabs with Foundation
$(function() {
    if (INDEX_JSON_URL) {
        $.getJSON(INDEX_JSON_URL, function (data) {            if (!data.tabs) return;

            let headersHtml = data.tabs.map((tab, index) => {
                return `<li class="tabs-title ${index === 0 ? 'is-active' : ''}">
                <a href="#panel${index}" ${index === 0 ? 'aria-selected="true"' : ''}>
                ${tab.title}
                </a></li>`
            }).join("\n");

            function videosHtml(videos) {
                if (!videos) return "";
                return videos.map(video => {
                    return `
                <div class="row horizontal">
                <div class="small-6 medium-6 large-6 columns" style="position: relative;">
                    <iframe id="youtube" width="100%" height="100%" src="https://www.youtube.com/embed/${video.id}"
                    title="YouTube video player" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                    </iframe>
                    <button title="Expand video" class="expandVideo"><i class="fas fa-angle-right"></i><i class="fas fa-angle-right"></i></button>
                </div>
                <div class="columns small-6 medium-6 large-6">
                    <h3>${video.title}</h3>
                    ${video.text}
                </div>
                </div>
            `
                }).join("\n");
            }

            let contentHtml = data.tabs.map((tab, index) => {
                return `<div class="tabs-panel ${index === 0 ? 'is-active' : ''}" id="panel${index}">
            ${tab.text}
            ${videosHtml(tab.videos)}
            </div>`
            }).join("\n");

            let html = `<ul class="tabs" data-tabs id="example-tabs">
            ${headersHtml}
        </ul>
        <div class="tabs-content" data-tabs-content="example-tabs">
            ${contentHtml}
        </div>`

            $("#tabs").html(html);
            new Foundation.Tabs($('#tabs .tabs'));
        });
    }
});