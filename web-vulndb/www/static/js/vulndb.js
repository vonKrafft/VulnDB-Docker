// Copyright (c) 2019 vonKrafft <contact@vonkrafft.fr>
// 
// This file is part of VulnDB.
// 
// This file may be used under the terms of the GNU General Public License
// version 3.0 as published by the Free Software Foundation and appearing in
// the file LICENSE included in the packaging of this file. Please review the
// following information to ensure the GNU General Public License version 3.0
// requirements will be met: http://www.gnu.org/copyleft/gpl.html.
// 
// This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
// WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

var elasticsearch = document.location.protocol + '//' + document.location.host + '/api';

// PING
function ping() {
    $.ajax({
        url: elasticsearch + '/',
        method: 'HEAD',
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        console.log('All is well');
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster is down!');
        $('#error .modal-body').text('Elasticsearch cluster is down!');
        $('#error').modal();
    });
}

// SEARCH
function search(query, callback) {
    $.ajax({
        url: elasticsearch + '/_search',
        method: 'POST',
        data: JSON.stringify(query),
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// CREATE
function create(srcdata, callback) {
    $.ajax({
        url: elasticsearch + '/',
        method: 'POST',
        data: JSON.stringify(srcdata),
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// UPDATE
function update(id, srcdata, callback) {
    $.ajax({
        url: elasticsearch + '/' + id,
        method: 'POST',
        data: JSON.stringify(srcdata),
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// DELETE
function remove(id, callback) {
    $.ajax({
        url: elasticsearch + '/' + id,
        method: 'DELETE',
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// IMPORT
function upload(srcdata, callback) {
    $.ajax({
        url: elasticsearch + '/_import',
        method: 'POST',
        data: JSON.stringify(srcdata),
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// STATS
function stats(callback) {
    $.ajax({
        url: elasticsearch + '/_stats',
        method: 'GET',
        dataType : 'json',
        contentType: 'application/json'
    })
    .done(function( data ) {
        callback(data);
    })
    .fail(function( data ) {
        console.error('Elasticsearch cluster does not responding!');
        console.log(data);
    });
}

// REFRESH LIST
function refresh(page = 1) {
    let query;
    if ($('#search').val() != '') {
        query = {
            "language": $('#language').val(),
            "search_terms": {
                "title": $('#search').val(),
                "description": $('#search').val(),
                "consequences": $('#search').val(),
                "recommendations": $('#search').val()
            }
        };
    } else {
        query = {
            "language": $('#language').val(),
            "search_terms": {}
        };
    }
    let menu = {};
    search(query, function (data) {
        $('#item-pool').html('');
        $.each(data.hits, function(id, item) {
            let itemID = '#item-pool #' + id;
            let content = {
                title:           sanitize(item.title),
                owasp:           sanitize(item.owasp),
                description:     sanitize(item.description),
                consequences:    sanitize(item.consequences),
                recommendations: sanitize(item.recommendations),
            }
            // Create item
            $('#item-pool').append('<div id="' + id + '" class="card mb-3"><div class="card-body"> \
                <div class="card-title d-flex w-100 justify-content-between"> \
                    <h5 class="mb-1"><span class="title"></span> <button class="btn btn-sm btn-outline-secondary">edit</button></h5> \
                    <small class="text-secondary owasp"></small> \
                </div> \
                <div class="card-text position-relative"> \
                    <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                    <div class="pre-wrap" title="description"></div> \
                </div> \
                <div class="card-text position-relative"> \
                    <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                    <div class="pre-wrap" title="consequences"></div> \
                </div> \
                <div class="card-text position-relative"> \
                    <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                    <div class="pre-wrap" title="recommendations"></div> \
                </div> \
            </div></div>');
            // Highlight
            if ($('#search').val() != '') {
                content.title = highlight(content.title, $('#search').val());
                content.description = highlight(content.description, $('#search').val());
                content.consequences = highlight(content.consequences, $('#search').val());
                content.recommendations = highlight(content.recommendations, $('#search').val());
            }
            // HTML formating
            let converter = new showdown.Converter({extensions: ['targetblank']});
            content.description = converter.makeHtml(markdown(content.description));
            content.consequences = converter.makeHtml(markdown(content.consequences));
            content.recommendations = converter.makeHtml(markdown(content.recommendations));
            // Fill item
            $(itemID + ' .card-title > h5 > .title').html(content.title);
            $(itemID + ' .card-title > small').html(content.owasp);
            $(itemID + ' [title="description"]').html(content.description);
            $(itemID + ' [title="consequences"]').html(content.consequences);
            $(itemID + ' [title="recommendations"]').html(content.recommendations);
            $(itemID + ' .card-title > h5 > .btn').attr('data-id', id);
            $(itemID + ' .card-title > h5 > .btn').attr('data-title', item.title);
            $(itemID + ' .card-title > h5 > .btn').attr('data-owasp', item.owasp);
            $(itemID + ' .card-title > h5 > .btn').attr('data-description', item.description);
            $(itemID + ' .card-title > h5 > .btn').attr('data-consequences', item.consequences);
            $(itemID + ' .card-title > h5 > .btn').attr('data-recommendations', item.recommendations);
            $(itemID + ' .card-title > h5 > .btn').attr('data-language', item.language);
            // Menu
            let key = content.owasp.length > 0 ? content.owasp : 'Other';
            if ( ! (key in menu)) menu[key] = {};
            menu[key][id] = content.title;
        });
        $('#stats').val(data.matches + '/' + data.total + ' template' + (data.matches > 1 ? 's' : '') + ' (' + data.filesize + ')');
        $('#menu').html('<ul class="nav flex-column"></ul>');
        for (var owasp in menu) {
            let owasp_id = sanitize(owasp).replace(/^(A[0-9]+):([0-9]+).*/, '$1-$2');
            $('#menu > .nav').append('<li id="' + owasp_id + '" class="nav-item"> \
                <b class="nav-link"><i class="fa fa-angle-double-right"></i> ' + owasp + '</b> \
                <ul class="nav flex-column"></ul> \
            </li>');
            for (var id in menu[owasp]) {
                $('#menu > .nav > #' + owasp_id + ' > .nav').append('<li class="nav-item"> \
                    <a class="nav-link" href="#' + sanitize(id) + '"><i class="fa fa-angle-right"></i> ' + menu[owasp][id] + '</a> \
                </li>');
            }
        }
    });
}

function sanitize(string) {
    let text = $('<div />').text(string).html();
    /* do not escape inside code */
    text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
        function (wholeMatch, m1, m2, m3) {
            m3 = m3.replace(/&lt;/g, '<');
            m3 = m3.replace(/&gt;/g, '>');
            return m1 + m2 + m3 + m2;
        }
    );
    return text;
}

function highlight(string, search) {
    return string.replace(new RegExp('(' + search + ')', 'gi'), '<mark>$1</mark>');
}

function markdown(string) {
    string = string.replace(/(([A-Z])\2\2)/g, '<abbr title="need to be replaced">$1</abbr>'); // XXX need to be replaced
    string = string.replace(/ ([:;!?])/g, '&#8239;$1');                                       // non-breaking space
    return string;
}

function notify(message, type = 'light', duration = 5000) {
    $('#notification').text(message);
    $('#notification').addClass('alert-' + type).removeClass('d-none');
    setTimeout(function () {
        $('#notification').removeClass('alert-' + type).addClass('d-none');
    }, parseInt(duration));
}

// *****************************************************************
// INIT
// *****************************************************************
ping();
refresh();

// Smooth scroll
$(document).delegate('.nav-link', 'click', function (e) {
    e.preventDefault();
    let target = $(this.hash).offset().top - 71;
    console.log(target);
    $('html,body').animate({scrollTop: target}, 'slow');
    return false;
});

// Follow nav
$(document).scroll(function() {
    $('.nav-link').removeClass('active');
    $.each($('.nav-link'), function() {
        if (this.hash) {
            if (($(this.hash).offset().top - $(window).scrollTop()) < ($(window).height() / 2)) {
                $('.nav-link').removeClass('active');
                $(this).addClass('active');
            }
        }
    });
});

// *****************************************************************
// SEARCH
// *****************************************************************
var search_timer = null;
$('#search').on('keyup', function () {
    if (search_timer) clearTimeout(search_timer);
    search_timer = setTimeout(refresh, 200);
    $('#search-eraser').toggle(Boolean($('#search').val()));
});
$('#language').on('change', function () {
    if (search_timer) clearTimeout(search_timer);
    search_timer = setTimeout(refresh, 200);
    $('#search-eraser').toggle(Boolean($('#search').val()));
});
$('#search-eraser').on('click', function () {
    if (search_timer) clearTimeout(search_timer);
    search_timer = setTimeout(refresh, 200);
    $('#search').val('');
    $('#search-eraser').toggle(Boolean($('#search').val()));
});

// *****************************************************************
// OWASP
// *****************************************************************
let owasp2017 = [
    'A1:2017 - Injection',
    'A2:2017 - Broken Authentication',
    'A3:2017 - Sensitive Data Exposure',
    'A4:2017 - XML External Entities (XXE)',
    'A5:2017 - Broken Access Control',
    'A6:2017 - Security Misconfiguration',
    'A7:2017 - Cross-Site Scripting (XSS)',
    'A8:2017 - Insecure Deserialization',
    'A9:2017 - Using Components with Known Vulnerabilities',
    'A10:2017 - Insufficient Logging &amp; Monitoring',
];

for (let i = 0; i < owasp2017.length; i++) {
    $('#add-item [name="owasp"]').append('<option value="' + owasp2017[i] + '">' + owasp2017[i] + '</option>');
    $('#edit-item [name="owasp"]').append('<option value="' + owasp2017[i] + '">' + owasp2017[i] + '</option>');
}

// *****************************************************************
// ADD
// *****************************************************************
$('#add-item-btn').on('click', function () {
    create({
        title: $('#add-item [name="title"]').val(),
        owasp: $('#add-item [name="owasp"]').val(),
        description: $('#add-item [name="description"]').val(),
        consequences: $('#add-item [name="consequences"]').val(),
        recommendations: $('#add-item [name="recommendations"]').val(),
        language: $('#add-item [name="language"]:checked') ? $('#add-item [name="language"]:checked').val() : 'FR'
    }, function (data) {
        if (data.result == 'created') {
            notify('Item successfully created!', 'success');
        } else {
            notify('An error occurred, try again later.', 'danger');
            console.log(data.responseText);
        }
        $('#add-item [name="title"]').val('');
        $('#add-item [name="owasp"]').val('');
        $('#add-item [name="description"]').val('');
        $('#add-item [name="consequences"]').val('');
        $('#add-item [name="recommendations"]').val('');
    });
    setTimeout(function () {
        $('#search').val('');
        refresh();
    }, 1000);
});

// *****************************************************************
// EDIT
// *****************************************************************
$('#edit-item-btn').on('click', function () {
    $('#edit-item').prop('aria-edited', false);
    update($('#edit-item [name="id"]').val(), {
        title: $('#edit-item [name="title"]').val(),
        owasp: $('#edit-item [name="owasp"]').val(),
        description: $('#edit-item [name="description"]').val(),
        consequences: $('#edit-item [name="consequences"]').val(),
        recommendations: $('#edit-item [name="recommendations"]').val(),
        language: $('#edit-item [name="language"]:checked').val()
    }, function (data) {
        if (data.result == 'updated') {
            notify('Item successfully updated!', 'success');
        } else {
            notify('An error occurred, try again later.', 'danger');
            console.log(data.responseText);
        }
    });
    setTimeout(function () {
        refresh();
    }, 1000);
});

// *****************************************************************
// DELETE
// *****************************************************************
$('#delete-item-btn').on('click', function () {
    if ($('#delete-item-confirm').val() != 'DELETE') {
        $('#delete-item-confirm').addClass('is-invalid');
    } else {
        $('#delete-item-confirm').val('');
        remove($('#edit-item [name="id"]').val(), function (data) {
            $('#edit-item').prop('aria-edited', false);
            $('#edit-item').modal('hide');
            if (data.result == 'deleted') {
                notify('Item successfully deleted!', 'success');
            } else {
                notify('An error occurred, try again later.', 'danger');
                console.log(data.responseText);
            }
        });
        setTimeout(function () {
            $('#search').val('');
            refresh();
        }, 1000);
    }
});

// *****************************************************************
// IMPORT
// *****************************************************************
$('#import-btn').on('click', function () {
    try {
        upload(JSON.parse($('#import [name="json"]').val()), function (data) {
            if (data.result == 'imported') {
                notify('Items successfully imported!', 'success');
            } else {
                notify('An error occurred, try again later.', 'danger');
                console.log(data.responseText);
            }
            $('#import [name="json"]').val('')
        });
    } catch(e) {
        notify('Invalid JSON', 'warning');
    }
    setTimeout(function () {
        $('#search').val('');
        refresh();
    }, 1000);
});

// *****************************************************************
// EDIT MODAL
// *****************************************************************
$(document.body).on('click', '#item-pool .card-title >  h5 > .btn', function () {
    $('#edit-item [name="title"]').val($(this).attr('data-title'));
    $('#edit-item [name="owasp"]').val($(this).attr('data-owasp'));
    $('#edit-item [name="description"]').val($(this).attr('data-description'));
    $('#edit-item [name="consequences"]').val($(this).attr('data-consequences'));
    $('#edit-item [name="recommendations"]').val($(this).attr('data-recommendations'));
    $('#edit-item [name="language"][value="FR"]').prop('checked', 'FR' == $(this).attr('data-language'));
    $('#edit-item [name="language"][value="EN"]').prop('checked', 'EN' == $(this).attr('data-language'));
    $('#edit-item [name="id"]').val($(this).attr('data-id'));
    $('#edit-item').modal('show');
});

$('#edit-item [name]').on('change', function () {
    $('#edit-item').prop('aria-edited', true);
});

$('#edit-item').on('hide.bs.modal', function (e) {
    if ($('#edit-item').prop('aria-edited') === true) {
        if ( ! confirm('Some data has been modified and has not been saved.\nAre you sure you want to close the editing window?')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
    }
    $('#edit-item [name="title"]').val('');
    $('#edit-item [name="owasp"]').val('');
    $('#edit-item [name="description"]').val('');
    $('#edit-item [name="consequences"]').val('');
    $('#edit-item [name="recommendations"]').val('');
    $('#edit-item [name="id"]').val('');
    $('#delete-item-confirm').removeClass('is-invalid').val('');
    $('#edit-item').prop('aria-edited', false);
});

// *****************************************************************
// STATS
// *****************************************************************
$('#owasp-stats').on('show.bs.modal', function (e) {
    stats(function (data) {
        let counter = {fr: 0, en: 0, total: function () { return this.fr + this.en; }};
        // title
        $('#owasp-stats h5').html(data.total + ' template' + (data.total > 1 ? 's' : '') + ' <small>(' + data.filesize + ')</small>');
        // histogram
        $.each($('#owasp-stats .bar'), function() { $(this).css('line-height', 0); $(this).attr('data-original-title', ''); });
        for (let i = 0; i < owasp2017.length; i++) {
            let owasp_id = sanitize(owasp2017[i]).replace(/^(A[0-9]+):([0-9]+).*/, '$1-$2');
            if (data.stats.hasOwnProperty(owasp2017[i])) {
                let tfr = parseInt(data.stats[owasp2017[i]]['FR']);
                $('#owasp-stats .histogram #h-' + owasp_id + ' > dd > .bar-fr').css('line-height', tfr + 'em');
                $('#owasp-stats .histogram #h-' + owasp_id + ' > dd > .bar-fr').attr('data-original-title', tfr + ' template' + (tfr>1?'s':''));
                let ten = parseInt(data.stats[owasp2017[i]]['EN']);
                $('#owasp-stats .histogram #h-' + owasp_id + ' > dd > .bar-en').css('line-height', ten + 'em');
                $('#owasp-stats .histogram #h-' + owasp_id + ' > dd > .bar-en').attr('data-original-title', ten + ' template' + (ten>1?'s':''));
            }
        }
        // table
        $('#owasp-stats section').html('<div class="row"><div class="col-6"></div><div class="col"><b>FR</b></div><div class="col"><b>EN</b></div><div class="col"><b>Total</b></div></div>');
        for (let i = 0; i < owasp2017.length; i++) {
            if (data.stats.hasOwnProperty(owasp2017[i])) {
                $('#owasp-stats section').append('<div class="row"> \
                    <div class="col-6"><b>' + owasp2017[i] + '</b></div> \
                    <div class="col">' + data.stats[owasp2017[i]]['FR']  + '</div> \
                    <div class="col">' + data.stats[owasp2017[i]]['EN']  + '</div> \
                    <div class="col">' + (parseInt(data.stats[owasp2017[i]]['FR']) + parseInt(data.stats[owasp2017[i]]['EN'])) + '</div> \
                </div>');
                counter.fr += parseInt(data.stats[owasp2017[i]]['FR']);
                counter.en += parseInt(data.stats[owasp2017[i]]['EN']);
            } else {
                $('#owasp-stats section').append('<div class="row"><div class="col-6"><b>' + owasp2017[i] + '</b></div><div class="col">0</div><div class="col">0</div><div class="col">0</div></div>');
            }
        }
        $('#owasp-stats section').append('<div class="row"><div class="col-6"><b>Total</b></div><div class="col">' + counter.fr + '</div><div class="col">' + counter.en  + '</div><div class="col">' + counter.total()  + '</div></div>');
    });
});

// *****************************************************************
// MISC
// *****************************************************************

$(document.body).on('click', '#item-pool .btn-copy', function () {
    let result = setClipboardText($(this).parent().find('.pre-wrap').html());
    $(this).tooltip({title: result, trigger: 'manuel'}).tooltip('show');
    setTimeout(function () {
        $('.btn-copy').tooltip('hide').tooltip('dispose');
    }, 1000);
});

function setClipboardText(text) {
    let id = "mycustom-clipboard-textarea-hidden-id";
    let existsTextarea = document.getElementById(id);

    function listener(e) {
        e.clipboardData.setData("text/html", text);
        e.clipboardData.setData("text/plain", text);
        e.preventDefault();
    }

    if (!existsTextarea) {
        var textarea = document.createElement("textarea");
        textarea.id = id;
        textarea.style.position = 'fixed';
        textarea.style.top = 0;
        textarea.style.left = 0;
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.padding = 0;
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        document.querySelector("body").appendChild(textarea);
        existsTextarea = document.getElementById(id);
    }

    text = text.replace(/<mark>([^<]+)<\/mark>/g, '$1');
    text = text.replace(/<abbr title="need to be replaced">([^<]+)<\/abbr>/g, '$1');
    text = text.replace(/<em>([^<]+)<\/em>/g, '<span style="background-color: yellow;">$1</span>');
    text = text.replace(/(([A-Z])\2\2)/g, '<span style="background-color: yellow;">$1</span>');
    //text = '<p>' + text.replace(/\n/g, '</p><p>') + '</p>';

    existsTextarea.value = text;
    existsTextarea.select();

    try {
        document.addEventListener("copy", listener);
        let status = document.execCommand('copy');
        document.removeEventListener("copy", listener);
        return status ? 'Copied to clipboard!' : 'Cannot copy text.';
    } catch (err) {
        return 'Unable to copy.';
    }
}

$(document).ready(function(){
    // Enable tooltip
    $('[data-hover="tooltip"]').tooltip();

    //Check to see if the window is top if not then display button
    $('.btn-scroll').fadeOut();
    $(window).scroll(function(){
        if ($(this).scrollTop() > 100) {
            $('.btn-scroll').fadeIn();
        } else {
            $('.btn-scroll').fadeOut();
        }
    });

    //Click event to scroll to top
    $('.btn-scroll').click(function(){
        $('html, body').animate({scrollTop : 0},800);
        return false;
    });

});
