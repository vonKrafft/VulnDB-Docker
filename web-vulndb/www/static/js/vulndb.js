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

var App = {
    url: document.location.protocol + '//' + document.location.host + '/api',
    Collections: {
        Owasp2017: new Backbone.Collection([
            { id: 'A1:2017',  name: 'Injection' },
            { id: 'A2:2017',  name: 'Broken Authentication' },
            { id: 'A3:2017',  name: 'Sensitive Data Exposure' },
            { id: 'A4:2017',  name: 'XML External Entities (XXE)' },
            { id: 'A5:2017',  name: 'Broken Access Control' },
            { id: 'A6:2017',  name: 'Security Misconfiguration' },
            { id: 'A7:2017',  name: 'Cross-Site Scripting (XSS)' },
            { id: 'A8:2017',  name: 'Insecure Deserialization' },
            { id: 'A9:2017',  name: 'Using Components with Known Vulnerabilities' },
            { id: 'A10:2017', name: 'Insufficient Logging & Monitoring' },
        ]),
    },
    Models: {},
    Views: {},
    Router: Backbone.Router.extend(),
    Formating: {
        converter: new showdown.Converter({extensions: ['targetblank']}),
        markdownToHtml: function ( markdown ) {
            markdown = this.highlight(this.sanitize(markdown), true);
            markdown = markdown.replace(/(([A-Z])\2\2)/g, '<abbr title="need to be replaced">$1</abbr>'); // XXX need to be replaced
            markdown = markdown.replace(/ ([:;!?])/g, '&#8239;$1');                                       // non-breaking space
            return this.converter.makeHtml(markdown);
        },
        highlight: function ( string, isEscaped = false ) {
            if ((! App.query) || (App.query.length == 0)) return string;
            if (isEscaped === false) string = _.escape(string);
            return string.replace(new RegExp('((?:' + decodeURIComponent(App.query || '').replace('.', '\\.') + ')+)', 'gi'), '<mark>$1</mark>');
        },
        sanitize: function ( string ) {
            var sanitized = $('<div />').text(string).html();
            /* do not escape inside code */
            sanitized = sanitized.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function (m, m1, m2, m3) {
                m3 = m3.replace(/&lt;/g, '<');
                m3 = m3.replace(/&gt;/g, '>');
                return m1 + m2 + m3 + m2;
            });
            return sanitized;
        },
    },
    Clipboard: {
        setText: function ( text ) {
            var id = "mycustom-clipboard-textarea-hidden-id";
            var existsTextarea = document.getElementById(id);

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
                var status = document.execCommand('copy');
                document.removeEventListener("copy", listener);
                return status ? 'Copied to clipboard!' : 'Cannot copy text.';
            } catch (err) {
                return 'Unable to copy.';
            }
        },
    },
    selectedItems: null,
    filteredItems: null,
};

Backbone.View.prototype.close = function () {
    this.removeChildren().remove();
    if (this.onClose) this.onClose();
    return this;
};

Backbone.View.prototype.addChild = function ( child ) {
    this.children = this.children || [];
    this.children.push(child);
    return child;
};

Backbone.View.prototype.removeChildren = function () {
    _.each(this.children || [], function ( child ) {
        if (child.close) child.close();
    });
    return this;
};

Backbone.View.prototype.refresh = function () {
    return this.removeChildren().render();
};

Backbone.View.prototype.html = function () {
    return this.render().el;
};

/***********************************************************************
 * App.Models.Template
 ***********************************************************************/

App.Models.Template = Backbone.Model.extend({
    idAttribute: 'id',
    defaults: {
        id              : '',
        title           : null,
        owasp           : null,
        description     : null,
        consequences    : null,
        recommendations : null,
        language        : 'FR',
    },
    urlRoot: function () { return App.url + '/template'; },
    initialize: function () {
        console.log('[App.Models.Template.initialize]');
    },
    isNew: function () {
        return this.id.length == 0;
    }
});

/***********************************************************************
 * App.Collections.Template
 ***********************************************************************/

App.Collections.Template = Backbone.Collection.extend({
    model: App.Models.Template,
    comparator: function ( item ) {
        return [
            (item.get('owasp') || '').replace(/A([1-9]):/, 'A0$1:').toLowerCase(),
            (item.get('title') || '').toLowerCase(),
        ];
    },
    url: function () { return App.url + '/template'; },
    initialize: function () {
        console.log('[App.Collections.Template.initialize]');
    },
    search: function ( query = '' ) {
        query = query.length < 2 ? '' : query;
        App.query = encodeURIComponent(query);
        var language = document.location.hash.split('/')[1].substr(0, 2) || 'FR';
        if (query.length > 0) {
            Backbone.history.navigate('home/' + language.toLowerCase() + '/' + App.query);
            var regex = new RegExp('.*' + query.replace('.', '\\.') + '.*', 'gi');
            return _.filter(this.where({language: language.toUpperCase()}), function ( model ) {
                return model.get('title').match(regex)
                    || model.get('description').match(regex)
                    || model.get('consequences').match(regex)
                    || model.get('recommendations').match(regex);
            });
        }
        return this.where({language: language.toUpperCase()});
    },
    createBatch: function ( options ) {
        return Backbone.sync( 'create', this, options );
    },
});

/***********************************************************************
 * App.Router
 ***********************************************************************/

App.Router = Backbone.Router.extend({
    routes: {
        '':                        'handleNone',
        'home/:language':          'handleHome',
        'home/:language/(:query)': 'handleHome',
        'view/:language/:id':      'handleView',
    },
    initialize: function () {
        console.log('[App.Router.initialize]');
        App.selectedItems = new App.Collections.Template();
        App.filteredItems = new App.Collections.Template();
        this.homeView = new App.Views.Home();
        this.navbarView = new App.Views.Navbar();

    },
    handleNone: function () {
        console.log('[App.Router.handleNone]');
        this.navigate('home/fr', { trigger: true })
    },
    handleHome: function ( language, query ) {
        console.log('[App.Router.handleHome]');
        this.homeView.refresh();
        this.navbarView.refresh();
        App.selectedItems.fetch({
            success: function ( collection, response ) {
                App.filteredItems = new App.Collections.Template(collection.search(query || ''));
                App.current.homeView.refresh();
            },
        });
    },
    handleView: function ( language, id ) {
        console.log('[App.Router.handleView] >>> ' + id);
        if (this.homeView.$el.find('#' + id).length) {
            var target = this.homeView.$el.find('#' + id).offset().top - 72;
            $('html,body').animate({scrollTop: target}, 'slow');
        } else {
            this.homeView.refresh();
            this.navbarView.refresh();
            App.selectedItems.fetch({
                success: function ( collection, response ) {
                    App.filteredItems = new App.Collections.Template(collection.search());
                    App.current.homeView.refresh();
                    var target = App.current.homeView.$el.find('#' + id).offset().top - 72;
                    $('html,body').animate({scrollTop: target}, 'slow');
                },
            });
        }
    },
});

/***********************************************************************
 * INIT
 ***********************************************************************/

$(document).ready(function () {
    App.current = new App.Router();
    Backbone.history.start();
});

// Scroll spy
$(document).scroll(function() {
    $('#menu .nav-link').removeClass('active');
    $.each($('#menu .nav-link'), function() {
        if (this.hash) {
            var id = _.last(this.hash.split('/'));
            if ($('#' + id).length) {
                if (($('#' + id).offset().top - $(window).scrollTop()) < $('#' + id).height() - 72) {
                    $('#menu .nav-link').removeClass('active');
                    $(this).addClass('active');
                }
            }
        }
    });
});

/***********************************************************************
 * App.Views.Home
 ***********************************************************************/

App.Views.Home = Backbone.View.extend({
    el: '#content',
    template: _.template(' \
        <aside id="menu" class="d-none d-lg-block position-fixed py-3"></aside> \
        <section class="row flex-row-reverse my-2"> \
            <div id="item-pool" class="col col-lg-9 py-3"></div> \
        </section> \
    '),
    render: function () {
        console.log('[App.Views.Home.render]');
        this.$el.html(this.template());
        this.navView = new App.Views.Nav();
        this.listView = new App.Views.List();
        this.$el.find('#menu').append(this.addChild(new App.Views.Search()).html());
        this.$el.find('#menu').append(this.addChild(this.navView).html());
        this.$el.find('#item-pool').append(this.addChild(this.listView).html());
        this.$el.find('#item-pool').append(this.addChild(new App.Views.Footer()).html());
        return this;
    },
    refresh: function () {
        if (this.$el.find('#item-pool').length) {
            this.navView.refresh();
            this.listView.refresh();
        } else {
            this.removeChildren().render();
        }
    },
});

/***********************************************************************
 * App.Views.Toast
 ***********************************************************************/

App.Views.Toast = Backbone.View.extend({
    template: _.template(' \
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="5000"> \
            <div class="toast-header text-white bg-<%- type %>"> \
                <strong class="mr-auto"><%- title %></strong> \
                <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast" aria-label="Close"> \
                    <span aria-hidden="true">&times;</span> \
                </button> \
            </div> \
            <div class="toast-body"><%- message %></div> \
        </div> \
    '),
    initialize: function ( attributes ) {
        this.attributes = attributes;
        this.toast = {
            type:    this.attributes.type || 'dark',
            title:   this.attributes.title || '',
            message: this.attributes.message || '',
        };
    },
    events: {
        'hidden.bs.toast .toast': 'close',
    },
    render: function () {
        console.log('[App.Views.Toast.render]');
        this.$el.html(this.template(this.toast));
        this.$el.find('.toast').toast('show');
        this.$el.find('.toast').on('hidden.bs.toast', function () { $(this).remove(); });
        $('body').append(this.el);
        return this;
    },
});

/***********************************************************************
 * App.Views.Navbar
 ***********************************************************************/

App.Views.Navbar = Backbone.View.extend({
    el: '#navbar-right',
    template: _.template(' \
        <a href="/api/export" class="btn nav-link" data-toggle="tooltip" title="Export" id="btn-export"><i class="fa fa-file-export"></i></a> \
        <button type="button" class="btn nav-link" data-toggle="tooltip" title="Import" id="btn-import"><i class="fa fa-file-import"></i></button> \
        <button type="button" class="btn nav-link" data-toggle="tooltip" title="Statistics" id="btn-statistics"><i class="fa fa-chart-bar"></i></button> \
        <button type="button" class="btn nav-link" data-toggle="tooltip" title="Add" id="btn-new"><i class="fa fa-plus-square"></i></button> \
    '),
    events: {
        'click #btn-import':     'handleImportClick',
        'click #btn-statistics': 'handleStatisticsClick',
        'click #btn-new':        'handleAddClick',
    },
    handleImportClick: function ( event ) {
        console.log('[App.Views.NavbarItem.handleImportClick]');
        new App.Views.ImportModal().render();
    },
    handleStatisticsClick: function ( event ) {
        console.log('[App.Views.NavbarItem.handleStatisticsClick]');
        new App.Views.StatisticsModal({
            collection: App.selectedItems,
        }).render();
    },
    handleAddClick: function ( event ) {
        console.log('[App.Views.NavbarItem.handleAddClick]');
        new App.Views.ItemModal({
            model: new App.Models.Template(),
        }).render();
    },
    render: function () {
        console.log('[App.Views.Navbar.render]');
        this.$el.html(this.template());
        this.$el.find('[data-toggle="tooltip"]').tooltip();
        return this;
    },
});

/***********************************************************************
 * App.Views.Search
 ***********************************************************************/

App.Views.Search = Backbone.View.extend({
    tagName: 'div',
    className: 'input-group',
    template: _.template(' \
        <input type="text" class="form-control mb-3" id="search-query" placeholder="Search ..." value="<%- decodeURIComponent(query) %>" autofocus> \
        <i id="search-eraser" class="fa fa-times form-control-plaintext mb-2 text-muted"></i> \
        <select type="text" class="form-control custom-select mb-2" id="language"> \
            <option value="FR" <%- language == "FR" ? "selected" : "" %>>FR</option> \
            <option value="EN" <%- language == "EN" ? "selected" : "" %>>EN</option> \
        </select> \
    '),
    events: {
        'change #language':     'handleLanguageChange',
        'input #search-query':  'handleSearchKeyup',
        'click #search-eraser': 'handleSearchEraserClick',
    },
    handleLanguageChange: function ( event ) {
        console.log('[App.Views.Search.handleLanguageChange]');
        var language = $('#language').val().toLowerCase().substr(0, 2);
        Backbone.history.navigate('home/' + language + (App.query.length > 0 ? '/' + App.query : ''), { trigger: true });
        $('html,body').scrollTop(0);
    },
    handleSearchKeyup: function ( event ) {
        console.log('[App.Views.Search.handleSearchKeyup]');
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(function () {
            var query = $('#search-query').val();
            App.filteredItems = new App.Collections.Template(App.selectedItems.search(query))
            App.current.homeView.refresh();
        }, 200);
        $('#search-eraser').toggle(Boolean($('#search-query').val()));
        $('html,body').scrollTop(0);
    },
    handleSearchEraserClick: function ( event ) {
        console.log('[App.Views.Search.handleSearchEraserClick]');
        $('#search-query').val('');
        Backbone.history.navigate('home/' + $('#language').val().toLowerCase().substr(0, 2));
        App.filteredItems = new App.Collections.Template(App.selectedItems.search())
        App.current.homeView.refresh();
        $('#search-eraser').toggle(Boolean($('#search-query').val()));
        $('html,body').scrollTop(0);
    },
    render: function () {
        console.log('[App.Views.Search.render]');
        this.$el.html(this.template({
            query:    document.location.hash.startsWith('#home') ? App.query || document.location.hash.split('/')[2] || '' : '',
            language: document.location.hash.split('/')[1].toUpperCase().substr(0, 2) || 'FR',
        }));
        _.defer(function () {
            var initialVal = $('#search-query').val();
            $('#search-query').focus().val('').val(initialVal);
            $('#search-eraser').toggle(Boolean($('#search-query').val()));
        });
        return this;
    },
});

/***********************************************************************
 * App.Views.Nav
 ***********************************************************************/

App.Views.Nav = Backbone.View.extend({
    tagName: 'ul',
    className: 'nav flex-column bg-white',
    template: _.template(' \
        <li id="item-counter" class="nav-link"> \
            <i class="d-block bg-light text-muted text-center border p-2"> \
                <%- App.filteredItems.length %> / <%- App.selectedItems.length %> template<%- App.filteredItems.length > 1 ? "s" : "" %> shown \
            </i> \
        </li> \
    '),
    render: function () {
        console.log('[App.Views.Nav.render]');
        this.$el.html(this.template());
        for (var i = 0; i < App.Collections.Owasp2017.models.length; i++) {
            var owasp = App.Collections.Owasp2017.at(i);
            this.$el.append(this.addChild(new App.Views.NavCategory({
                model:      owasp,
                collection: new App.Collections.Template(App.filteredItems.where({
                    owasp: owasp.get('id') + ' - ' + owasp.get('name'),
                })),
            })).html());
        }
        return this;
    },
});

/***********************************************************************
 * App.Views.NavCategory
 ***********************************************************************/

App.Views.NavCategory = Backbone.View.extend({
    tagName: 'li',
    className: 'nav-item',
    template: _.template(' \
        <a href="#view/<%- language.toLowerCase() %>/owasp-<%- owasp.id.replace(":", "-") %>" class="nav-link font-weight-bold"> \
            <i class="fa fa-angle-double-right"></i> <%- owasp.id %> - <%- owasp.name %> \
        </a> \
        <ul class="nav flex-column"></ul> \
    '),
    render: function () {
        console.log('[App.Views.NavCategory.render]');
        if (this.collection.models.length > 0) {
            this.$el.html(this.template({
                owasp:    this.model.toJSON(),
                language: document.location.hash.split('/')[1].substr(0, 2) || 'FR',
            }));
            for (var i = 0; i < this.collection.models.length; i++) {
                if (this.collection.at(i).get('title') == this.collection.at(i).get('owasp')) continue;
                this.$el.find('> ul.nav').append(this.addChild(new App.Views.NavItem({
                    model: this.collection.at(i),
                })).html());
            }
        }
        return this;
    },
});

/***********************************************************************
 * App.Views.NavItem
 ***********************************************************************/

App.Views.NavItem = Backbone.View.extend({
    tagName: 'li',
    className: 'nav-item',
    template: _.template(' \
        <a class="nav-link" href="#view/<%-language.toLowerCase() %>/<%- id %>"><i class="fa fa-angle-right"></i> <%- title %></a> \
    '),
    initialize: function () {
        this.listenTo(this.model, 'change', this.refresh);
    },
    render: function () {
        console.log('[App.Views.NavItem.render]');
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
});

/***********************************************************************
 * App.Views.List
 ***********************************************************************/

App.Views.List = Backbone.View.extend({
    tagName: 'div',
    className: 'list-vulndb',
    render: function () {
        console.log('[App.Views.List.render]');
        this.$el.empty();
        for (var i = 0; i < App.filteredItems.models.length; i++) {
            this.$el.append(this.addChild(new App.Views.ListItem({
                model: App.filteredItems.at(i),
            })).html());
        }
        return this;
    },
});

/***********************************************************************
 * App.Views.ListItem
 ***********************************************************************/

App.Views.ListItem = Backbone.View.extend({
    id: function () {
        var owaspID = this.model.get('owasp') ? this.model.get('owasp').replace(/^(A[1-9]|A10):(20[0-9]{1,2}).*$/, 'owasp-$1-$2') : 'owasp-undefined';
        return this.model.get('title') == this.model.get('owasp') ? owaspID : this.model.id;
    },
    className: 'card mb-3',
    template: _.template('\
        <div class="card-body <%- title == owasp ? "bg-secondary": "" %>"> \
            <div class="card-title d-flex w-100 justify-content-between"> \
                <h5 class="mb-1"><%= App.Formating.highlight(title) %> <button class="btn btn-sm btn-outline-secondary">edit</button></h5> \
                <small class="text-secondary owasp"><%- owasp %></small> \
            </div> \
            <div class="card-text position-relative"> \
                <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                <div class="pre-wrap" title="description"><%= App.Formating.markdownToHtml(description) %></div> \
            </div> \
            <div class="card-text position-relative"> \
                <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                <div class="pre-wrap" title="consequences"><%= App.Formating.markdownToHtml(consequences) %></div> \
            </div> \
            <div class="card-text position-relative"> \
                <div class="btn-copy text-secondary position-absolute h-100"><i class="far fa-copy fa-lg"></i></div> \
                <div class="pre-wrap" title="recommendations"><%= App.Formating.markdownToHtml(recommendations) %></div> \
            </div> \
        </div> \
    '),
    initialize: function () {
        this.listenTo(this.model, 'change', this.render);
    },
    events: {
        'click .btn-copy':   'handleCopyClick',
        'click h5 > button': 'handleEditClick',
    },
    handleCopyClick: function ( event ) {
        console.log('[App.Views.ListItem.handleCopyClick]');
        var button = $(event.target);
        button.tooltip({
            title: App.Clipboard.setText(button.closest('.card-text').find('.pre-wrap').html()),
            trigger: 'manuel',
        }).tooltip('show');
        setTimeout(function () {
            button.tooltip('hide').tooltip('dispose');
        }, 1000);
    },
    handleEditClick: function ( event ) {
        console.log('[App.Views.ListItem.handleEditClick]');
        new App.Views.ItemModal({
            model: this.model,
        }).render();
    },
    render: function () {
        console.log('[App.Views.ListItem.render]');
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
});

/***********************************************************************
 * App.Views.StatisticsModal
 ***********************************************************************/

App.Views.StatisticsModal = Backbone.View.extend({
    id: 'stats',
    template: _.template(' \
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true"> \
            <div class="modal-dialog modal-lg" role="document"> \
                <div class="modal-content"> \
                    <div class="modal-header bg-dark text-white"> \
                        <h5 class="modal-title text-uppercase"><i class="fa fa-chart-bar"></i> <%- counter %> templates</h5> \
                        <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close"> \
                            <span aria-hidden="true">&times;</span> \
                        </button> \
                    </div> \
                    <div class="modal-body"> \
                        <div class="histogram d-table w-100 text-center my-3" id="histogram-graph"></div> \
                        <div class="statistics list-group mt-3"> \
                            <div class="list-group-item list-group-item-action d-flex border-0"> \
                                <b class="col-9"></b> \
                                <b class="col-1 text-center">FR</b> \
                                <b class="col-1 text-center">EN</b> \
                                <b class="col-1 text-center">TOTAL</b> \
                            </div> \
                            <div id="statistics-pool"></div> \
                            <div class="list-group-item list-group-item-action d-flex border-0"> \
                                <b class="col-9"></b> \
                                <b class="col-1 text-center"><%- totalFR %></b> \
                                <b class="col-1 text-center"><%- totalEN %></b> \
                                <b class="col-1 text-center"><%- counter %></b> \
                            </div> \
                        </div> \
                    </div> \
                    <div class="modal-footer bg-light"> \
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button> \
                    </div> \
                </div> \
            </div> \
        </div> \
    '),
    events: {
        'hidden.bs.modal .modal': 'close',
    },
    render: function () {
        console.log('[App.Views.StatisticsModal.render]');
        this.$el.html(this.template({
            counter: this.collection.length,
            totalFR: this.collection.where({language: 'FR'}).length,
            totalEN: this.collection.where({language: 'EN'}).length,
        }));
        for (var i = 0; i < App.Collections.Owasp2017.models.length; i++) {
            var owasp = App.Collections.Owasp2017.at(i);
            var vulns = new App.Collections.Template(App.selectedItems.where({
                owasp: owasp.get('id') + ' - ' + owasp.get('name'),
            }));
            this.$el.find('#histogram-graph').append(this.addChild(new App.Views.StatisticsHistogramItem({
                model:      owasp,
                collection: vulns,
            })).html());
            this.$el.find('#statistics-pool').append(this.addChild(new App.Views.StatisticsItem({
                model:      owasp,
                collection: vulns,
            })).html());
        }
        $('body').append(this.el);
        this.$el.find('.modal').modal('show');
        return this;
    },
});

/***********************************************************************
 * App.Views.StatisticsHistogramItem
 ***********************************************************************/

App.Views.StatisticsHistogramItem = Backbone.View.extend({
    tagName: 'dl',
    className: 'd-table-cell align-bottom',
    template: _.template(' \
        <dd> \
            <span class="bar bar-fr" style="line-height: <%- totalFR %>em;">FR</span> \
            <span class="bar bar-en" style="line-height: <%- totalEN %>em;">EN</span> \
        </dd> \
        <dt><%- owasp.id %></dt> \
    '),
    render: function () {
        console.log('[App.Views.StatisticsHistogramItem.render]');
        this.$el.html(this.template({
            owasp: this.model.toJSON(),
            counter: this.collection.length,
            totalFR: this.collection.where({language: 'FR'}).length,
            totalEN: this.collection.where({language: 'EN'}).length,
        }));
        return this;
    },
});

/***********************************************************************
 * App.Views.StatisticsItem
 ***********************************************************************/

App.Views.StatisticsItem = Backbone.View.extend({
    tagName: 'div',
    className: 'list-group-item list-group-item-action d-flex border-0 py-1',
    template: _.template(' \
          <b class="col-9 px-0"><%- owasp.id %> - <%- owasp.name %></b> \
          <span class="col-1 px-0 text-center"><%- totalFR %></span> \
          <span class="col-1 px-0 text-center"><%- totalEN %></span> \
          <span class="col-1 px-0 text-center"><%- counter %></span> \
    '),
    render: function () {
        console.log('[App.Views.StatisticsItem.render]');
        this.$el.html(this.template({
            owasp: this.model.toJSON(),
            counter: this.collection.length,
            totalFR: this.collection.where({language: 'FR'}).length,
            totalEN: this.collection.where({language: 'EN'}).length,
        }));
        return this;
    },
});

/***********************************************************************
 * App.Views.ImportModal
 ***********************************************************************/

App.Views.ImportModal = Backbone.View.extend({
    id: 'stats',
    template: _.template(' \
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true"> \
            <div class="modal-dialog modal-lg" role="document"> \
                <div class="modal-content"> \
                    <div class="modal-header bg-dark text-white"> \
                        <h5 class="modal-title text-uppercase"><i class="fa fa-file-import"></i> Import JSON</h5> \
                        <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close"> \
                            <span aria-hidden="true">&times;</span> \
                        </button> \
                    </div> \
                    <div class="modal-body"> \
                        <div class="form-group"> \
                            <label class="form-label" for="json">Paste JSON content:</label> \
                            <textarea class="form-control" name="json" rows="10"></textarea> \
                        </div> \
                    </div> \
                    <div class="modal-footer bg-light"> \
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Discard</button> \
                        <button type="button" class="btn btn-dark" data-event="import" data-dismiss="modal">Import</button> \
                    </div> \
                </div> \
            </div> \
        </div> \
    '),
    events: {
        'hidden.bs.modal .modal':            'close',
        'click button[data-event="import"]': 'handleImportClick',
    },
    handleImportClick: function ( event ) {
        console.log('[App.Views.ImportModal.handleImportClick]');
        try {
            var jsonData = JSON.parse(this.$el.find('[name="json"]').val());
        } catch (e) {
            new App.Views.Toast({
                type: 'danger',
                title: 'Unable to import data!',
                message: e.name + ': ' + e.message,
            }).render();
            console.error('Parsing error', e)
            return false;
        }
        new App.Collections.Template(jsonData).createBatch({
            success: function ( collection, response ) {
                var message = 'Data was proceed and ';
                if (collection.length == 0) message += 'no template was created.';
                else if (collection.length == 1) message += 'one template was created.';
                else message += collection.length + ' templates were created.';
                new App.Views.Toast({
                    type: (collection.length > 0) ? 'success' : 'warning',
                    title: 'New template imported!',
                    message: message,
                }).render();
                App.selectedItems.fetch({
                    success: function ( collection, response ) {
                        App.filteredItems = new App.Collections.Template(collection.search());
                        App.current.homeView.refresh();
                    },
                });
            },
            error: function ( response ) {
                new App.Views.Toast({
                    type: 'danger',
                    title: 'Unable to import data!',
                    message: 'Error: ' + JSON.stringify(response),
                }).render();
            },
        });
    },
    render: function () {
        console.log('[App.Views.ImportModal.render]');
        this.$el.html(this.template());
        $('body').append(this.el);
        this.$el.find('.modal').modal('show');
        return this;
    },
});

/***********************************************************************
 * App.Views.ItemModal
 ***********************************************************************/

App.Views.ItemModal = Backbone.View.extend({
    id: 'stats',
    template: _.template(' \
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true"> \
            <div class="modal-dialog modal-lg" role="document"> \
                <div class="modal-content"> \
                    <div class="modal-header bg-dark text-white"> \
                        <h5 class="modal-title text-uppercase"><i class="fa fa-<%- icon %>"></i> <%- title %></h5> \
                        <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close"> \
                            <span aria-hidden="true">&times;</span> \
                        </button> \
                    </div> \
                    <div class="modal-body"> \
                        <div class="form-group"> \
                            <label class="sr-only" for="title">Title</label> \
                            <input type="text" class="form-control form-control-lg" name="title" placeholder="Title" value="<%- item.title %>"> \
                        </div> \
                        <div class="form-group d-flex"> \
                            <div class="flex-grow-1 mr-2"> \
                                <select class="custom-select" name="owasp"> \
                                    <option value="" disabled="disabled" <%- item.owasp == null ? "selected" : "" %>>-- TOP 10 OWASP 2017</option> \
                                    <% _.each(owaspCatecories, function (owasp) { %> \
                                    <option value="<%- owasp.id %> - <%- owasp.name %>" <%- item.owasp == owasp.id + " - " + owasp.name ? "selected" : "" %>> \
                                        <%- owasp.id %> - <%- owasp.name %> \
                                    </option> \
                                    <% }) %> \
                                </select> \
                            </div> \
                            <div class="ml-2"> \
                                <div class="form-check form-check-inline"> \
                                    <input class="form-check-input" type="radio" name="language" value="FR" <%- item.language == "FR" ? "checked" : "" %>> \
                                    <label class="form-check-label" for="language">FR</label> \
                                </div> \
                                <div class="form-check form-check-inline"> \
                                    <input class="form-check-input" type="radio" name="language" value="EN" <%- item.language == "EN" ? "checked" : "" %>> \
                                    <label class="form-check-label" for="language">EN</label> \
                                </div> \
                            </div> \
                        </div> \
                        <div class="form-group mb-1"> \
                            <textarea class="form-control" name="description" rows="4" placeholder="Description"><%- item.description %></textarea> \
                        </div> \
                        <div class="form-group mb-1"> \
                            <textarea class="form-control" name="consequences" rows="4" placeholder="Consequences"><%- item.consequences %></textarea> \
                        </div> \
                        <div class="form-group mb-1"> \
                            <textarea class="form-control" name="recommendations" rows="4" placeholder="Recommendations"><%- item.recommendations %></textarea> \
                        </div> \
                        <small class="form-text text-muted text-right"> \
                            The text boxes for the "Description", "Consequences" and "Recommendation" paragraphs support Markdown syntax. \
                        </small> \
                    </div> \
                    <div class="modal-footer bg-light"> \
                        <% if (item.id.length > 0) { %> \
                        <div class="form-inline"> \
                            <input type="text" name="delete-confirm" class="form-control" placeholder="Type DELETE to confirm"> \
                        </div> \
                        <button type="button" class="btn btn-danger" data-event="delete">Delete</button> \
                        <% } %> \
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button> \
                        <button type="button" class="btn btn-dark" data-event="save"><%- button %></button> \
                    </div> \
                </div> \
            </div> \
        </div> \
    '),
    events: {
        'hidden.bs.modal .modal':            'close',
        'hide.bs.modal .modal':              'promptCloseConfirm',
        'change [name]':                     'handleFormChange',
        'click button[data-event="save"]':   'handleSaveClick',
        'click button[data-event="delete"]': 'handleDeleteClick',
    },
    promptCloseConfirm: function ( event ) {
        console.log('[App.Views.ItemModal.promptCloseConfirm]');
        if (this.preventClose === true) {
            if ( ! confirm('Some data has been modified and has not been saved.\nAre you sure you want to close the editing window?')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }
    },
    handleFormChange: function ( event ) {
        console.log('[App.Views.ItemModal.handleFormChange]');
        this.preventClose = true;
    },
    handleSaveClick: function ( event ) {
        console.log('[App.Views.ItemModal.handleSaveClick]');
        this.model.set({
            title:           this.$el.find('[name="title"]').val(),
            owasp:           this.$el.find('[name="owasp"]').val(),
            language:        this.$el.find('[name="language"]:checked').val() || 'FR',
            description:     this.$el.find('[name="description"]').val(),
            consequences:    this.$el.find('[name="consequences"]').val(),
            recommendations: this.$el.find('[name="recommendations"]').val(),
        });
        if (this.model.hasChanged()) {
            this.model.save(null, {
                success: function ( model, response ) {
                    App.selectedItems.add(model);
                    new App.Views.Toast({
                        type: 'dark',
                        title: 'Done!',
                        message: 'Item successfully saved!',
                    }).render();
                    App.filteredItems = new App.Collections.Template(App.selectedItems.search());
                    App.current.homeView.refresh();
                    Backbone.history.navigate('view/' + model.get('language').toLowerCase() + '/' + model.get('id'), { trigger: true });
                },
                error: function ( response ) {
                    new App.Views.Toast({
                        type: 'danger',
                        title: 'Unable to save item!',
                        message: 'Error: ' + JSON.stringify(response),
                    }).render();
                },
            });
        }
        this.preventClose = false;
        this.$el.find('.modal').modal('hide');
    },
    handleDeleteClick: function ( event ) {
        console.log('[App.Views.ItemModal.handleDeleteClick]');
        if (this.$el.find('[name="delete-confirm"]').val() != 'DELETE') {
            this.$el.find('[name="delete-confirm"]').addClass('is-invalid');
        } else {
            this.model.destroy({
                success: function ( model, response ) {
                    new App.Views.Toast({
                        type: 'dark',
                        title: 'Done!',
                        message: 'Item successfully deleted!',
                    }).render();
                    App.filteredItems = new App.Collections.Template(App.selectedItems.search())
                    App.current.homeView.refresh();
                },
                error: function ( response ) {
                    new App.Views.Toast({
                        type: 'danger',
                        title: 'Unable to delete item!',
                        message: 'Error: ' + JSON.stringify(response),
                    }).render();
                },
            });
            this.preventClose = false;
            this.$el.find('.modal').modal('hide');
        }
    },
    render: function () {
        console.log('[App.Views.ItemModal.render]');
        this.$el.html(this.template({
            title:           this.model.id.length > 0 ? 'Edit template' : 'Add template',
            icon:            this.model.id.length > 0 ? 'pen-square' : 'plus-square',
            owaspCatecories: App.Collections.Owasp2017.toJSON(),
            item:            this.model.toJSON(),
            button:          this.model.id.length > 0 ? 'Save' : 'Create',
        }));
        $('body').append(this.el);
        this.$el.find('.modal').modal('show');
        return this;
    },
});

/***********************************************************************
 * App.Views.Footer
 ***********************************************************************/

App.Views.Footer = Backbone.View.extend({
    tagName: 'footer',
    template: _.template(' \
        <div class="bg-light text-muted text-center py-3"> \
            Templates for pentest reports \
            <a href="https://github.com/vonKrafft/VulnDB-Docker" target="_blank" class="text-muted"><i class="fab fa-github"></i></a> \
            &ndash; <em>Kraffted</em> with &lt;3 \
        </div> \
    '),
    render: function () {
        console.log('[App.Views.Footer.render]');
        this.$el.html(this.template());
        return this;
    },
});
