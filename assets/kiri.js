// jshint esversion:6

var commit1;
var commit2;

var commits_list = window.commit_array;

var old_view;
var current_view;

model_opacity_slider = null;

panZoom_instance = null;
lastEventListener = null;
lastEmbed = null;

current_selected_page = 0;
previous_selected_page = -1;


sch_current_zoom = null;
sch_old_zoom = null;
sch_current_pan = null;

pcb_current_zoom = null;
pcb_old_zoom = null;
pcb_current_pan = null;

// Variables updated by Kiri
selected_view = "schematic";

is_fullscreen = false;

// =======================================
// HANDLE SHORTCUTS
// =======================================

function set_commits_list(commits) {
    commits_list = commits
}

function commit_click(hash) {
    hash_idx = 0;
    commit1_idx = 0;
    commit2_idx = 0;
    for (let i = 0; i < gitgraph._graph.commits.length; i++) {
        if (gitgraph._graph.commits[i].hash == hash) {
            hash_idx = i;
        }
        if (gitgraph._graph.commits[i].hash == commit1) {
            commit1_idx = i;
        }
        if (gitgraph._graph.commits[i].hash == commit2) {
            commit2_idx = i;
        }
    }

    if (hash_idx <= commit2_idx) {
        commit2 = hash;
    } else if (hash_idx >= commit1_idx) {
        commit1 = hash;
    } else if (hash_idx - commit2_idx < commit1_idx - hash_idx) {
        commit2 = hash;
    } else {
        commit1 = hash;
    }

    for (let i = 0; i < gitgraph._graph.commits.length; i++) {
        if (gitgraph._graph.commits[i].hash == commit1) {
            gitgraph._graph.commits[i].style.message.color = "#0FF";
            gitgraph._graph.commits[i].style.dot.color = "#0FF";
        } else if (gitgraph._graph.commits[i].hash == commit2) {
            gitgraph._graph.commits[i].style.message.color = "#F00";
            gitgraph._graph.commits[i].style.dot.color = "#F00";
        } else {
            gitgraph._graph.commits[i].style.message.color = "#fff";
            gitgraph._graph.commits[i].style.dot.color = "";
        }
    }
    gitgraph._graph.next()


    update_commits()
}

var converter = new showdown.Converter();
function show_commit_details(text) {
    // convert plaintext to HTML
    console.log(`Commits text raw:\n${text}`)
    // text = text.replace(/(?:\r\n|\r|\n)/g, '<br>');
    // console.log(`Commits text HTML:\n${text}`)

    var html_msg = converter.makeHtml(text);

    // fill and display div
    var elem = document.getElementById('commit_message')
    elem.style.display = 'block';
    elem.innerHTML = html_msg;

    // set position of box next to mouse
    var e = window.event
    x = e.clientX,
        y = e.clientY;
    elem.style.top = (y) + 'px';
    elem.style.left = (x) + 'px';
}

function hide_commit_details() {
    document.getElementById('commit_message').style.display = 'none';
}

function select_next_2_commits() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i + 1);
        }
    }

    // When second commit reaches the end, moves the first commit forward (if possible)
    if (next_selected_commits[1] >= commits.length) {
        next_selected_commits[1] = commits.length - 1;
        if (next_selected_commits[0] <= commits.length - 2) {
            next_selected_commits[0] = selected_commits[0] + 1;
        }
    }
    else {
        // By default does not change the first commit
        next_selected_commits[0] = selected_commits[0];
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= next_selected_commits[1]) {
        next_selected_commits[0] = next_selected_commits[1] - 1;
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= commits.length - 2) {
        next_selected_commits[0] = commits.length - 2;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_next_commit() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i + 1);
        }
    }

    // Fix bottom boundary
    if (next_selected_commits[1] >= commits.length - 1) {
        next_selected_commits[1] = commits.length - 1;
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= commits.length - 2) {
        next_selected_commits[0] = commits.length - 2;
    }

    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_previows_2_commits() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i - 1);
        }
    }

    // By default does not change the first commit
    next_selected_commits[0] = selected_commits[0];

    // When commits are touching, move first backwards (if possible)
    if (next_selected_commits[1] == next_selected_commits[0]) {
        if (next_selected_commits[0] > 0) {
            next_selected_commits[0] = next_selected_commits[0] - 1;
        }
    }

    // Fix top boundary
    if (next_selected_commits[0] < 0) {
        next_selected_commits[0] = 0;
    }

    // Fix top boundary
    if (next_selected_commits[1] <= 1) {
        next_selected_commits[1] = 1;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_previows_commit() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i - 1);
        }
    }

    // Fix top boundary
    if (next_selected_commits[0] <= 0) {
        next_selected_commits[0] = 0;
    }

    // Fix top boundary
    if (next_selected_commits[1] <= 1) {
        next_selected_commits[1] = 1;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function reset_commits_selection() {
    commits = $("#commits_form input:checkbox[name='commit']");
    selected_commits = [];
    for (i = 0; i < commits.length; i++) {
        $("#commits_form input:checkbox[name='commit']")[i].checked = false;
    }
    for (i = 0; i < 2; i++) {
        $("#commits_form input:checkbox[name='commit']")[i].checked = true;
    }

    update_commits();
}

function toggle_sch_pcb_view() {
    old_view = current_view;
    current_view = $('#view_mode input[name="view_mode"]:checked').val();
    console.log(`toggle_sch_pcb_view(): ${old_view} -> ${current_view}`);
    if (current_view == "show_sch") {
        show_pcb();
    } else if (current_view == "show_pcb") {
        show_3d();
    } else if (current_view == "show_3d") {
        show_sch();
    }
    update_commits();
}

function select_next_sch_or_pcb(cycle = false) {
    if (document.getElementById("show_sch").checked) {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));

        new_index = selected_page + 1;
        if (new_index >= pages.length) {
            if (cycle) {
                new_index = 0;
            }
            else {
                new_index = pages.length - 1;
            }
        }

        pages[new_index].checked = true;

        update_page();
    }
    else {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));

        new_index = selected_layer + 1;
        if (new_index >= layers.length) {
            if (cycle) {
                new_index = 0;
            }
            else {
                new_index = layers.length - 1;
            }
        }

        layers[new_index].checked = true;

        update_layer();
    }
}

function select_preview_sch_or_pcb(cycle = false) {
    if (current_view == "show_sch") {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));

        new_index = selected_page - 1;
        if (new_index < 0) {
            if (cycle) {
                new_index = pages.length - 1;
            }
            else {
                new_index = 0;
            }
        }

        pages[new_index].checked = true;

        update_page();
        update_sheets_list(commit1, commit2);

    } else if (current_view == "show_pcb") {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));

        new_index = selected_layer - 1;
        if (new_index < 0) {
            if (cycle) {
                new_index = layers.length - 1;
            }
            else {
                new_index = 0;
            }
        }

        layers[new_index].checked = true;

        update_layer();
    }
}

function svg_fit_center() {
    panZoom_instance.resetZoom();
    panZoom_instance.center();
}

function svg_zoom_in() {
    panZoom_instance.zoomIn();
}

function svg_zoom_out() {
    panZoom_instance.zoomOut();
}

function manual_pan(direction) {
    const step = 50;

    switch (direction) {
        case "up":
            panZoom_instance.panBy({ x: 0, y: step });
            break;
        case "down":
            panZoom_instance.panBy({ x: 0, y: -step });
            break;
        case "left":
            panZoom_instance.panBy({ x: step, y: 0 });
            break;
        case "right":
            panZoom_instance.panBy({ x: -step, y: 0 });
            break;
    }
}

// Commits
Mousetrap.bind(['ctrl+down', 'ctrl+]', 'command+down', 'command+]'], function () { select_next_2_commits() });
Mousetrap.bind(['down', ']'], function () { select_next_commit() });

Mousetrap.bind(['ctrl+up', 'ctrl+[', 'command+up', 'command+['], function () { select_previows_2_commits() });
Mousetrap.bind(['up', '['], function () { select_previows_commit() });

Mousetrap.bind(['r', 'R'], function () { reset_commits_selection() });

// View
Mousetrap.bind(['s', 'S'], function () { toggle_sch_pcb_view() });

Mousetrap.bind(['right'], function () { select_next_sch_or_pcb() });
Mousetrap.bind(['left'], function () { select_preview_sch_or_pcb() });

Mousetrap.bind(['ctrl+right', 'command+right'], function () { select_next_sch_or_pcb(true) });
Mousetrap.bind(['ctrl+left', 'command+left'], function () { select_preview_sch_or_pcb(true) });

// SVG PAN
Mousetrap.bind('alt+up', function () { manual_pan("up") });
Mousetrap.bind('alt+down', function () { manual_pan("down") });
Mousetrap.bind('alt+left', function () { manual_pan("left") });
Mousetrap.bind('alt+right', function () { manual_pan("right") });

// SVG ZOOM
Mousetrap.bind('0', function () { svg_fit_center() });
Mousetrap.bind(['+', '='], function () { svg_zoom_in() });
Mousetrap.bind('-', function () { svg_zoom_out() });

// Misc
Mousetrap.bind(['f', 'F'], function () { toogle_fullscreen() });
Mousetrap.bind(['i', 'I'], function () { show_info_popup() });

// =======================================
// =======================================

// For images related with each commit, it is good to have the same image cached with the same specially when serving throug the internet
// For those images, it uses the commit hash as the timestamp
function url_timestamp(timestamp_id = "") {
    if (timestamp_id) {
        return "?t=" + timestamp_id;
    }
    else {
        return "?t=" + new Date().getTime();
    }
}

function if_url_exists(url, callback) {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.setRequestHeader('Accept', '*/*');
    request.onprogress = function (event) {
        let status = event.target.status;
        let statusFirstNumber = (status).toString()[0];
        switch (statusFirstNumber) {
            case '2':
                request.abort();
                return callback(true);
            default:
                request.abort();
                return callback(false);
        }
    };
    request.send('');
}

function update_commits() {

    // Remove tooltips so they dont get stuck
    $('[data-toggle="tooltip"]').tooltip("hide");

    console.log("================================================================================");

    // TODO: implement this correctly
    // var commits = $("#commits_form input:checkbox[name='commit']");
    // var hashes = [];

    // for (var i = 0; i < commits.length; i++) {
    //     if (commits[i].checked) {
    //         var value = commits[i].value;
    //         hashes.push(value);
    //     }
    // }

    // // It needs 2 items selected to do something
    // if (hashes.length < 2) {
    //     return;
    // }

    // // Update selected commits
    // commit1 = hashes[0].replace(/\s+/g, '');
    // commit2 = hashes[1].replace(/\s+/g, '');

    console.log("commit1:", commit1);
    console.log("commit2:", commit2);


    // 1. Update commit_legend_links
    // 2. Update commit_legend
    // 3. Update current_diff_view


    // Update commit_legend_links

    var old_commit1 = document.getElementById("commit1_hash").value;
    var old_commit2 = document.getElementById("commit2_hash").value;

    var kicad_pro_path_1 = document.getElementById("commit1_kicad_pro_path").value;
    var kicad_pro_path_2 = document.getElementById("commit2_kicad_pro_path").value;

    document.getElementById("commit1_kicad_pro_path").value = kicad_pro_path_1.replace(old_commit1, commit1);
    document.getElementById("commit2_kicad_pro_path").value = kicad_pro_path_2.replace(old_commit2, commit2);

    // Update commit_legend

    document.getElementById("commit1_hash").value = commit1;
    document.getElementById("commit2_hash").value = commit2;

    document.getElementById("commit1_legend_hash").innerHTML = commit1;
    document.getElementById("commit2_legend_hash").innerHTML = commit2;

    // Update current_diff_view

    old_view = current_view;
    current_view = $('#view_mode input[name="view_mode"]:checked').val();

    if (current_view == "show_sch") {
        update_page();
    } else if (current_view == "show_pcb") {
        update_layer();
    } else if (current_view == "show_3d") {
        update_3d();
    }
}

function loadFile(filePath) {

    console.log("filePath:", filePath);

    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', filePath, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function update_3d() {
    console.log("-----------------------------------------");
    console.log(`Update 3D: ${old_view} -> ${current_view}`)

    model_1 = `../${commit1}/_KIRI_/3d_model/main.gltf`;
    model_2 = `../${commit2}/_KIRI_/3d_model/main.gltf`;
    if (current_view != old_view) {
        removeEmbed();
        lastEmbed = createNewEmbed3d(model_1, model_2)
    }
    else {
        document.getElementById("diff-model-1").setAttribute("src", model_1);
        document.getElementById("diff-model-2").setAttribute("src", model_2);
        document.getElementById("diff-model-1").setAttribute("alt", `${commit1} glTF model missing`);
        document.getElementById("diff-model-2").setAttribute("alt", `${commit2} glTF model missing`);

        if_url_exists(model_1, function (exists) {
            if (exists == true) {
                document.getElementById("diff-model-1").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-model-1").parentElement.style.display = "none";
            }
        });

        if_url_exists(model_2, function (exists) {
            if (exists == true) {
                document.getElementById("diff-model-2").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-model-2").parentElement.style.display = "none";
            }
        });
    }
}

function update_page() {
    console.log("-----------------------------------------");

    // Runs only when updating commits
    update_sheets_list(commit1, commit2);

    var pages = $("#pages_list input:radio[name='pages']");
    var selected_page;
    var page_name;

    // if a different page was in use before, revert the selection to it
    // TODO: maybe I have to use a list instead...
    if (previous_selected_page > -1) {
        pages[previous_selected_page].checked = true;
        previous_selected_page = -1;
    }

    // try to get the first page
    try {
        selected_page = pages.index(pages.filter(':checked'));
        page_name = pages[selected_page].id;
        current_selected_page = selected_page;

        // if there is no page selected, select the first one
        // TODO: instead of the first item by default, a better solution would change to the next inferior index
        // and keep decrementing until reaching a valid index
    } catch (error) {
        previous_selected_page = current_selected_page;
        pages[0].checked = true;
        selected_page = pages.index(pages.filter(':checked'));
        page_name = pages[selected_page].id;
    }

    var page_filename = pages[selected_page].value.replace(".kicad_sch", "").replace(".sch", "");

    if (commit1 == "") {
        commit1 = document.getElementById("diff-xlink-1-sch").href.baseVal.split("/")[1];
    }
    if (commit2 == "") {
        commit2 = document.getElementById("diff-xlink-2-sch").href.baseVal.split("/")[1];
    }

    var image_path_1 = "../" + commit1 + "/_KIRI_/sch/" + page_filename + ".svg";
    var image_path_2 = "../" + commit2 + "/_KIRI_/sch/" + page_filename + ".svg";

    console.log("[SCH] page_filename =", page_filename);
    console.log("[SCH]  image_path_1 =", image_path_1);
    console.log("[SCH]  image_path_2 =", image_path_2);

    var image_path_timestamp_1 = image_path_1 + url_timestamp(commit1);
    var image_path_timestamp_2 = image_path_2 + url_timestamp(commit2);

    if (current_view != old_view) {
        removeEmbed();
        lastEmbed = createNewEmbed(image_path_timestamp_1, image_path_timestamp_2);
    }
    else {
        document.getElementById("diff-xlink-1").href.baseVal = image_path_timestamp_1;
        document.getElementById("diff-xlink-2").href.baseVal = image_path_timestamp_2;

        document.getElementById("diff-xlink-1").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_1);
        document.getElementById("diff-xlink-2").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_2);

        if_url_exists(image_path_timestamp_1, function (exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-1").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-1").parentElement.style.display = "none";
            }
        });

        if_url_exists(image_path_timestamp_2, function (exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-2").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-2").parentElement.style.display = "none";
            }
        });
    }

    update_fullscreen_label();
}

function update_sheets_list(commit1, commit2) {

    // Get current selected page name
    var pages = $("#pages_list input:radio[name='pages']");
    var selected_page = pages.index(pages.filter(':checked'));

    // Save the current selected page, if any
    try {
        selected_sheet = pages[selected_page].id;
    }
    catch (err) {
        selected_page = "";
        console.log("There isn't a sheet selected");
    }

    // Data format: ID|LAYER

    data1 = loadFile("../" + commit1 + "/_KIRI_/sch_sheets" + url_timestamp(commit1)).split("\n").filter((a) => a);
    data2 = loadFile("../" + commit2 + "/_KIRI_/sch_sheets" + url_timestamp(commit2)).split("\n").filter((a) => a);

    var sheets = [];

    for (const d of data1) {
        sheet = d.split("|")[0];
        sheets.push(sheet);
    }

    for (const d of data2) {
        sheet = d.split("|")[0];
        if (!sheets.includes(sheet)) {
            sheets.push(sheet);
        }
    }

    // sheets.sort();
    // sheets = Array.from(new Set(sheets.sort()));
    sheets = Array.from(new Set(sheets));

    console.log("[SCH]  Sheets =", sheets.length);
    console.log("sheets", sheets);

    var new_sheets_list = [];
    var form_inputs_html;

    for (const sheet of sheets) {
        var input_html = `
        <input id="${sheet}" data-toggle="tooltip" title="${sheet}" type="radio" value="${sheet}" name="pages" onchange="update_page()">
            <label for="${sheet}" data-toggle="tooltip" title="${sheet}" id="label-${sheet}" class="rounded text-sm-left list-group-item radio-box" onclick="update_page_onclick()" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span data-toggle="tooltip" title="${sheet}" style="margin-left:0.5em; margin-right:0.1em;" class="iconify" data-icon="gridicons:pages" data-inline="false"></span>
                ${sheet}
            </label>
        </label>
        `;

        new_sheets_list.push(sheet);

        form_inputs_html = form_inputs_html + input_html;
    }

    // Get the current list of pages
    pages = $("#pages_list input:radio[name='pages']");
    const current_sheets_list = Array.from(pages).map((opt) => opt.id);

    // Return if the current list is equal to the new list
    console.log("current_sheets_list = ", current_sheets_list);
    console.log("new_sheets_list = ", new_sheets_list);
    if (current_sheets_list.toString() === new_sheets_list.toString()) {
        console.log("Keep the same list of sheets");
        return;
    }

    // Update list of pages
    sheets_element = document.getElementById("pages_list_form");
    sheets_element.innerHTML = form_inputs_html.replace("undefined", "");

    // rerun tooltips since they are getting ugly.
    $('[data-toggle="tooltip"]').tooltip({ html: true });
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({ boundary: 'body' });

    const optionLabels = Array.from(pages).map((opt) => opt.id);

    const hasOption = optionLabels.includes(selected_sheet);
    if (hasOption) {
        // Keep previews selection active
        $("#pages_list input:radio[name='pages'][value='" + selected_sheet + "']").prop('checked', true);
    }
    else {
        // If old selection does not exist, maybe the list is now shorter, then select the last item...
        pages[optionLabels.length - 1].checked = true;
    }

    // If nothing is selected still, select the first item
    if (!pages.filter(':checked').length) {
        pages[0].checked = true;
    }
}

function layer_color(layer_id) {

    var color;

    console.log(">>> layer_id", layer_id);

    const F_Cu = 0;
    const In1_Cu = 1;
    const In2_Cu = 2;
    const In3_Cu = 3;
    const In4_Cu = 4;
    const B_Cu = 31;
    const B_Adhes = 32;
    const F_Adhes = 33;
    const B_Paste = 34;
    const F_Paste = 35;
    const B_SilkS = 36;
    const F_SilkS = 37;
    const B_Mask = 38;
    const F_Mask = 39;
    const Dwgs_User = 40;
    const Cmts_User = 41;
    const Eco1_User = 42;
    const Eco2_User = 43;
    const Edge_Cuts = 44;
    const Margin = 45;
    const B_CrtYd = 46;
    const F_CrtYd = 47;
    const B_Fab = 48;
    const F_Fab = 49;

    switch (layer_id) {
        case B_Adhes: color = "#3545A8"; break;
        case B_CrtYd: color = "#D3D04B"; break;
        case B_Cu: color = "#359632"; break;
        case B_Fab: color = "#858585"; break;
        case B_Mask: color = "#943197"; break;
        case B_Paste: color = "#969696"; break;
        case B_SilkS: color = "#481649"; break;
        case Cmts_User: color = "#7AC0F4"; break;
        case Dwgs_User: color = "#0364D3"; break;
        case Eco1_User: color = "#008500"; break;
        case Eco2_User: color = "#008500"; break;
        case Edge_Cuts: color = "#C9C83B"; break;
        case F_Adhes: color = "#A74AA8"; break;
        case F_CrtYd: color = "#A7A7A7"; break;
        case F_Cu: color = "#952927"; break;
        case F_Fab: color = "#C2C200"; break;
        case F_Mask: color = "#943197"; break;
        case F_Paste: color = "#3DC9C9"; break;
        case F_SilkS: color = "#339697"; break;
        case In1_Cu: color = "#C2C200"; break;
        case In2_Cu: color = "#C200C2"; break;
        case In3_Cu: color = "#C20000"; break;
        case In4_Cu: color = "#0000C2"; break;
        case Margin: color = "#D357D2"; break;
        default: color = "#DBDBDB";
    }

    return color;
}

function pad(num, size) {
    num = num.toString();
    while (num.length < size) {
        num = "0" + num;
    }
    return num;
}

function update_layers_list(commit1, commit2, selected_layer_idx, selected_layer_id) {
    var used_layers_1;
    var used_layers_2;

    var id;
    var layer;
    var dict = {};

    var id_pad;
    var layer_name;
    var color;
    var checked;

    var new_layers_list = [];
    var form_inputs_html;

    // Get current selected page name
    var layers = $("#layers_list input:radio[name='layers']");
    var selected_layer_element = layers.index(layers.filter(':checked'));

    // Save the current selected page, if any
    try {
        selected_layer = layers[selected_layer_element].id;
    }
    catch (err) {
        selected_layer = "";
        console.log("There isn't a layer selected");
    }

    // File = ../[COMMIT]/_KIRI_/pcb_layers
    // Format = ID|LAYER

    used_layers_1 = loadFile("../" + commit1 + "/_KIRI_/pcb_layers" + url_timestamp(commit1)).split("\n").filter((a) => a);
    used_layers_2 = loadFile("../" + commit2 + "/_KIRI_/pcb_layers" + url_timestamp(commit2)).split("\n").filter((a) => a);

    for (const line of used_layers_1) {
        id = line.split("|")[0];
        layer = line.split("|")[1]; //.replace(".", "_");
        dict[id] = [layer];
    }

    for (const line of used_layers_2) {
        id = line.split("|")[0];
        layer = line.split("|")[1]; //.replace(".", "_");

        // Add new key
        if (!dict.hasOwnProperty(id)) {
            dict[id] = [layer];
        }
        else {
            // Append if id key exists
            if (dict[id] != layer) {
                dict[id].push(layer);
            }
        }
    }

    console.log("[PCB] Layers =", Object.keys(dict).length);

    for (const [layer_id, layer_names] of Object.entries(dict)) {
        id = parseInt(layer_id);
        id_pad = pad(id, 2);
        layer_name = layer_names[0];
        color = layer_color(id);

        var input_html = `
        <!-- Generated Layer ${id} -->
        <input  id="layer-${id_pad}" value="layer-${layer_names}" type="radio" name="layers" onchange="update_layer()">
        <label for="layer-${id_pad}" id="label-layer-${id_pad}" data-toggle="tooltip" title="${id}, ${layer_names}" class="rounded text-sm-left list-group-item radio-box" onclick="update_layer_onclick()">
            <span style="margin-left:0.5em; margin-right:0.1em; color:${color}" class="iconify" data-icon="teenyicons-square-solid" data-inline="false"></span>
            ${layer_names}
        </label>
        `;

        new_layers_list.push(layer_names.toString());

        form_inputs_html = form_inputs_html + input_html;
    }

    // Get the current list of pages
    const current_layers_list = Array.from(layers).map((opt) => opt.value.replace("layer-", ""));

    // Return if the current list is equal to the new list
    console.log("current_layers_list = ", current_layers_list);
    console.log("new_layers_list = ", new_layers_list);
    if (current_layers_list.toString() === new_layers_list.toString()) {
        console.log("Keep the same list of layers");
        return;
    }

    // Update layers list
    layers_element = document.getElementById("layers_list_form");
    layers_element.innerHTML = form_inputs_html.replace("undefined", "");

    // Update html tooltips
    $('[data-toggle="tooltip"]').tooltip({ html: true });
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({ boundary: 'body' });

    // Enable back the selected layer
    const optionLabels = Array.from(layers).map((opt) => opt.id);

    const hasOption = optionLabels.includes(selected_layer);
    if (hasOption) {
        // Keep previews selection active
        $("#layers_list input:radio[name='layers'][value=" + selected_layer + "]").prop('checked', true);
    }
    else {
        // If old selection does not exist, maybe the list is now shorter, then select the last item...
        layers[optionLabels.length - 1].checked = true;
    }

    // restore previously selected index
    layers = $("#layers_list input:radio[name='layers']");
    if (selected_layer_idx >= 0) {
        layers[selected_layer_idx].checked = true;
    }

    // If nothing is selected still, select the first item
    if (!layers.filter(':checked').length) {
        layers[0].checked = true;
    }
}

function update_layer() {

    console.log("-----------------------------------------");

    var layers = $("#layers_list input:radio[name='layers']");
    var selected_layer;
    var layer_id;

    if (layers) {
        selected_layer = layers.index(layers.filter(':checked'));
        console.log(">>>> [selected_layer] = ", selected_layer);
        if (selected_layer >= 0) {
            layer_id = layers[selected_layer].id.split("-")[1];
            console.log(">>>> [label_id_IF] = ", layer_id);
        }
        else {
            try {
                layers[0].checked = true;
                selected_layer = layers.index(layers.filter(':checked'));
                layer_id = layers[selected_layer].id.split("-")[1];
                console.log(">>>> [label_id_ELSE] = ", layer_id);
            } catch (error) {
                console.log("[PCB] Images may not exist and Kicad layout may be missing.");
                show_sch();
                return;
            }
        }
    }
    else {
        console.log("[PCB] Images may not exist and Kicad layout may be missing.");
        show_sch();
        return;
    }

    if (commit1 == "") {
        commit1 = document.getElementById("diff-xlink-1-pcb").href.baseVal.split("/")[1];
    }
    if (commit2 == "") {
        commit2 = document.getElementById("diff-xlink-2-pcb").href.baseVal.split("/")[1];
    }

    update_layers_list(commit1, commit2, selected_layer, layer_id);

    var image_path_1 = "../" + commit1 + "/_KIRI_/pcb/layer" + "-" + layer_id + ".svg";
    var image_path_2 = "../" + commit2 + "/_KIRI_/pcb/layer" + "-" + layer_id + ".svg";

    console.log("[PCB]      layer_id =", layer_id);
    console.log("[PCB]  image_path_1 =", image_path_1);
    console.log("[PCB]  image_path_2 =", image_path_2);

    var image_path_timestamp_1 = image_path_1 + url_timestamp(commit1);
    var image_path_timestamp_2 = image_path_2 + url_timestamp(commit2);

    console.log(`update_layer(): ${old_view} -> ${current_view}`);

    if (current_view != old_view) {
        removeEmbed();
        lastEmbed = createNewEmbed(image_path_timestamp_1, image_path_timestamp_2);
    }
    else {
        document.getElementById("diff-xlink-1").href.baseVal = image_path_timestamp_1;
        document.getElementById("diff-xlink-2").href.baseVal = image_path_timestamp_2;

        document.getElementById("diff-xlink-1").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_1);
        document.getElementById("diff-xlink-2").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_2);

        if_url_exists(image_path_timestamp_1, function (exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-1").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-1").parentElement.style.display = "none";
            }
        });

        if_url_exists(image_path_timestamp_2, function (exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-2").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-2").parentElement.style.display = "none";
            }
        });
    }

    update_fullscreen_label();
}

// =======================================
// SVG Controls
// =======================================

function select_initial_commits() {
    var commits = gitgraph._graph.commits;

    if (commits.length >= 2) {
        commit1 = commits[commits.length - 1].hash;
        commit2 = commits[commits.length - 2].hash;
    }
    else if (commits.length == 1) {
        commit1 = commits[commits.length - 1].hash;
    }
    // simulate click to highlight them
    commit_click(commit1);
    commit_click(commit2);
}

function get_selected_commits() {
    var commits = [];
    var hashes = [];
    for (var i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            var value = $("#commits_form input:checkbox[name='commit']")[i].value;
            hashes.push(value);
        }
    }

    // It needs 2 items selected to do something
    if (hashes.length < 2) {
        return;
    }

    var commit1 = hashes[0].replace(/\s+/g, '');
    var commit2 = hashes[1].replace(/\s+/g, '');

    return [commit1, commit2];
}


// Interpret tooltois as html
$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip({ html: true });
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({ boundary: 'body' });
});

// Limit commits list with 2 checked commits at most
$(document).ready(function () {
    $("#commits_form input:checkbox[name='commit']").change(function () {
        var max_allowed = 2;
        var count = $("input[name='commit']:checked").length;
        if (count > max_allowed) {
            $(this).prop("checked", "");
        }
    });
});

function ready() {
    check_server_status();
    select_initial_commits();

    update_3d_camera();

    update_commits();

    if (selected_view == "schematic") {
        // show_sch();
        update_page();
    }
    else {
        // show_pcb();
        update_layer();
    }
}

window.onload = function () {
    console.log("function onload");
};

window.addEventListener('DOMContentLoaded', ready);

// =======================================
// Toggle Schematic/Layout
// =======================================

function show_sch() {
    old_view = current_view;
    current_view = "show_sch";
    // Show schematic stuff
    document.getElementById("show_sch_lbl").classList.add('active');
    document.getElementById("show_sch").checked = true;
    document.getElementById("pages_list").style.display = "inline";
    document.getElementById("sch_title").style.display = "inline";

    // Hide layout stuff
    document.getElementById("show_pcb_lbl").classList.remove('active');
    document.getElementById("show_pcb").checked = false;
    document.getElementById("layers_list").style.display = "none";
    document.getElementById("pcb_title").style.display = "none";

    // Hide 3D stuff
    document.getElementById("show_3d_lbl").classList.remove('active');
    document.getElementById("show_3d").checked = false;
    document.getElementById("3d_title").style.display = "none";

    update_page();
}

function show_pcb() {
    old_view = current_view;
    current_view = "show_pcb";
    // Show layout stuff
    document.getElementById("show_pcb_lbl").classList.add('active');
    document.getElementById("show_pcb").checked = true;
    document.getElementById("layers_list").style.display = "inline";
    document.getElementById("pcb_title").style.display = "inline";

    // Hide schematic stuff
    document.getElementById("show_sch_lbl").classList.remove('active');
    document.getElementById("show_sch").checked = false;
    document.getElementById("pages_list").style.display = "none";
    document.getElementById("sch_title").style.display = "none";

    // Hide 3D stuff
    document.getElementById("show_3d_lbl").classList.remove('active');
    document.getElementById("show_3d").checked = false;
    document.getElementById("3d_title").style.display = "none";

    update_layer();
}

function show_3d() {
    old_view = current_view;
    current_view = "show_3d";
    // Show 3D stuff
    document.getElementById("show_3d_lbl").classList.add('active');
    document.getElementById("show_3d").checked = true;
    document.getElementById("3d_title").style.display = "inline";

    // Hide layout stuff
    document.getElementById("show_pcb_lbl").classList.remove('active');
    document.getElementById("show_pcb").checked = false;
    document.getElementById("layers_list").style.display = "none";
    document.getElementById("pcb_title").style.display = "none";

    // Hide schematic stuff
    document.getElementById("show_sch_lbl").classList.remove('active');
    document.getElementById("show_sch").checked = false;
    document.getElementById("pages_list").style.display = "none";
    document.getElementById("sch_title").style.display = "none";

    update_3d();
}



// #===========================

var server_status = 1;
var old_server_status = -1;

function check_server_status() {
    var img;

    img = document.getElementById("server_status_img");

    if (!img) {
        img = document.body.appendChild(document.createElement("img"));
        img.setAttribute("id", "server_status_img");
        img.style.display = "none";
    }

    img.onload = function () {
        server_is_online();
    };

    img.onerror = function () {
        server_is_offline();
    };

    img.src = "favicon.ico" + url_timestamp();

    setTimeout(check_server_status, 5000);
}

function server_is_online() {
    server_status = 1;
    document.getElementById("server_offline").style.display = "none";
    if (server_status != old_server_status) {
        old_server_status = server_status;
        console.log("Server is Online");
    }
}

function server_is_offline() {
    server_status = 0;
    document.getElementById("server_offline").style.display = "block";
    if (server_status != old_server_status) {
        old_server_status = server_status;
        console.log("Server is Offline");
    }
}

function update_3d_camera() {
    obj1 = document.getElementById("diff-model-1")
    obj2 = document.getElementById("diff-model-2")
    if (obj1 && obj2) {
        obj2.setAttribute("field-of-view", obj1.getFieldOfView());
        obj2.setAttribute("camera-target", obj1.getCameraTarget())
        obj2.setAttribute("camera-orbit", obj1.getCameraOrbit());
        obj2.jumpCameraToGoal();
    }

    setTimeout(update_3d_camera, 50);
}

// ==================================================================

function createNewEmbed3d(src1, src2) {
    console.log("createNewEmbed3d...");

    var embed = document.createElement('div');
    embed.setAttribute('id', "div-svg");
    embed.setAttribute('style', "position: absolute; display: inline; width: inherit; min-width: inherit; max-width: inherit; height: inherit; min-height: inherit; max-height: inherit;");

    var svg_element = `
	    <model-viewer id="diff-model-1"
            alt="${commit1} glTF model missing"
	    	src="${src1}" shadow-intensity="1" camera-controls
            disable-zoom
	    	touch-action="pan-y"></model-viewer>
	    <model-viewer id="diff-model-2"
            alt="${commit2} glTF model missing"
	    	src="${src2}" shadow-intensity="1" 
            disable-zoom
	    	touch-action="pan-y"></model-viewer>
        <div class="slidercontainer">
            <p style="color: #f00">${commit2}</p>
            <input type="range" min="0" max="100" value="50" class="" id="model-opacity-slider">
            <p style="color: #0ff">${commit1}</p>
        </div>
        `;


    document.getElementById('diff-container').appendChild(embed);
    document.getElementById('div-svg').innerHTML = svg_element;
    console.log(">>> model-viewer: ", embed);

    if (panZoom_instance) {
        panZoom_instance.destroy();
        panZoom_instance = null;
    }

    // Update the current slider value (each time you drag the slider handle)
    model_opacity_slider = document.getElementById("model-opacity-slider");
    model_opacity_slider.oninput = function () {
        console.log(`diff-model-1 opacity: ${this.value}%`)
        document.getElementById("diff-model-1").style.opacity = this.value / 100;
    }

    return embed;
}

var output = document.getElementById("demo");


function createNewEmbed(src1, src2) {
    console.log("createNewEmbed...");

    var embed = document.createElement('div');
    embed.setAttribute('id', "div-svg");
    embed.setAttribute('style', "display: inline; width: inherit; min-width: inherit; max-width: inherit; height: inherit; min-height: inherit; max-height: inherit;");

    var svg_element = `
    <svg id="svg-id" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: inline; width: inherit; min-width: inherit; max-width: inherit; height: inherit; min-height: inherit; max-height: inherit;">
      <g class="my_svg-pan-zoom_viewport">
          <svg id="img-1" style="display: inline;">
              <defs>
                  <filter id="filter-1">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="1.0  0.0  0.0  0.0  0.0
                              0.0  1.0  0.0  1.0  0.0
                              0.0  0.0  1.0  1.0  0.0
                              0.0  0.0  0.0  1.0  0.0">
                  </filter>
              </defs>
              <image id="diff-xlink-1" x="0" y="0" height="100%" width="100%" filter="url(#filter-1)"
                  onerror="this.onerror=null; imgError(this);"
                  href="${src1}" xlink:href="${src1}"/>
          </svg>
          <svg id="img-2" style="display: inline;">
              <defs>
                  <filter id="filter-2">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="1.0  0.0  0.0  1.0  0.0
                              0.0  1.0  0.0  0.0  0.0
                              0.0  0.0  1.0  0.0  0.0
                              0.0  0.0  0.0  0.5  0.0">
                  </filter>
              </defs>
              <image id="diff-xlink-2" x="0" y="0" height="100%" width="100%" filter="url(#filter-2)"
                  onerror="this.onerror=null; imgError(this);"
                  href="${src2}" xlink:href="${src2}"/>
          </svg>
      </g>
    </svg>
    `;

    document.getElementById('diff-container').appendChild(embed);
    document.getElementById('div-svg').innerHTML = svg_element;
    console.log(">>> SVG: ", embed);

    svgpanzoom_selector = "#" + "svg-id";

    panZoom_instance = svgPanZoom(
        svgpanzoom_selector, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        center: true,
        minZoom: 1,
        maxZoom: 20,
        zoomScaleSensitivity: 0.1,
        fit: true, // cannot be used, bug? (this one must be here to change the default)
        contain: false,
        viewportSelector: '.my_svg-pan-zoom_viewport',
        eventsListenerElement: document.querySelector(svgpanzoom_selector),
        onUpdatedCTM: function () {
            if (current_view == "show_sch") {
                if (sch_current_zoom != sch_old_zoom) {
                    console.log(">> Restoring SCH pan and zoom");
                    panZoom_instance.zoom(sch_current_zoom);
                    panZoom_instance.pan(sch_current_pan);
                    sch_old_zoom = sch_current_zoom;
                }
            }
            else {
                if (pcb_current_zoom != pcb_old_zoom) {
                    console.log(">> Restoring PCB pan and zoom");
                    panZoom_instance.zoom(pcb_current_zoom);
                    panZoom_instance.pan(pcb_current_pan);
                    pcb_old_zoom = pcb_current_zoom;
                }
            }

        }
    });

    console.log("panZoom_instance:", panZoom_instance);

    embed.addEventListener('load', lastEventListener);

    document.getElementById('zoom-in').addEventListener('click', function (ev) {
        ev.preventDefault();
        panZoom_instance.zoomIn();
        panZoom_instance.center();
    });

    document.getElementById('zoom-out').addEventListener('click', function (ev) {
        ev.preventDefault();
        panZoom_instance.zoomOut();
        panZoom_instance.center();
    });

    document.getElementById('zoom-fit').addEventListener('click', function (ev) {
        ev.preventDefault();
        panZoom_instance.resetZoom();
        panZoom_instance.center();
    });

    return embed;
}

function removeEmbed() {
    console.log(">=============================================<");
    console.log("removeEmbed...");
    console.log(">> lastEmbed: ", lastEmbed);
    console.log(">> panZoom_instance: ", panZoom_instance);

    // Destroy svgpanzoom
    if (panZoom_instance) {
        if (old_view != "show_3d") {
            if (current_view == "show_pcb") {
                sch_current_zoom = panZoom_instance.getZoom();
                sch_current_pan = panZoom_instance.getPan();
                sch_old_zoom = null;
            } else if (current_view == "show_sch") {
                pcb_current_zoom = panZoom_instance.getZoom();
                pcb_current_pan = panZoom_instance.getPan();
                pcb_old_zoom = null;
            }
        }

        panZoom_instance.destroy();
        panZoom_instance = null;

        // Remove event listener
        lastEmbed.removeEventListener('load', lastEventListener);

        // Null last event listener
        lastEventListener = null;

        // Remove embed element
        document.getElementById('diff-container').removeChild(lastEmbed);

        // Null reference to embed
        lastEmbed = null;
    }
}

function update_fullscreen_label() {
    fullscreen_label = document.getElementById("fullscreen_label");

    commit1 = document.getElementById("commit1_hash").value;
    commit2 = document.getElementById("commit2_hash").value;

    if (current_view == "show_sch") {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));
        page_name = document.getElementById("label-" + pages[selected_page].id).innerHTML;
        view_item = "Page " + page_name;
    }
    else {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));
        layer_name = document.getElementById("label-" + layers[selected_layer].id).innerHTML;
        view_item = "Layer " + layer_name;
    }

    if (is_fullscreen) {
        if (fullscreen_label) {
            document.getElementById("commit1_fs").innerHTML = `(<a id="commit1_legend_hash">${commit1}</a>)`;
            document.getElementById("commit2_fs").innerHTML = `(<a id="commit2_legend_hash">${commit2}</a>)`;
            document.getElementById("view_item_fs").innerHTML = view_item;
        }
        else {
            label = `
                <div id="fullscreen_label" class="alert alert-dark border border-dark rounded-pill position-absolute top-10 start-50 translate-middle" style="background-color: #333;" role="alert">
                    <span id=commit1_legend_fs style="margin-left:0em; margin-right:0.2em; color: #00FFFF; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small class="text-sm text-light">
                        Newer
                        <span id="commit1_fs" class="text-monospace">(<a id="commit1_legend_hash">${commit1}</a>)</span>
                    </small>

                    <span style="display: inline; width: 3em;"></span>
                    <span id="commit2_legend_fs" style="display: inline; margin-left:1em; margin-right:0.2em; color: #880808; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small class="text-sm text-light">
                        Older
                        <span id="commit2_fs" class="text-monospace">(<a id="commit2_legend_hash">${commit2}</a>)</span>
                    </small>

                    <span style="display: inline; width: 3em;"></span>
                    <span id="commit3_legend_fs" style="margin-left:1em; margin-right:0.2em; color: #807F7F; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small class="text-sm text-light">
                        Unchanged
                    </small>

                    <small class="text-sm text-muted" style="margin-left:1em; margin-right:0.2em;">
                        |
                    </small>
                    <span style="display: inline; width: 3em;"></span>
                    <small id="view_item_fs" class="text-sm text-light" style="margin-left:1em; margin-right:0.2em;">
                        ${view_item}
                    </small>
                </div>
            `

            const element = $('#diff-container').get(0);
            element.insertAdjacentHTML("afterbegin", label);
        }
    }
}

function toogle_fullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        is_fullscreen = false;
        const box = document.getElementById('fullscreen_label');
        box.remove();

    } else {
        element = $('#diff-container').get(0);
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }

        is_fullscreen = true;
        update_fullscreen_label()
    }
}

function show_info_popup() {
    document.getElementById("info-btn").click();
}

// Remove focus whne info buttons is clicked with shortcut i
$('#shortcuts-modal').on('shown.bs.modal', function (e) {
    $('#info-btn').one('focus', function (e) { $(this).blur(); });
});
