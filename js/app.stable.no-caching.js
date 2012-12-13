//-------------------------------------------------------------//
// jquery mobile version  - Andrew Hart 11/12 MSCNS
// *Caveats noticed with addition of jquery mobile to backbone:
//   -> The html templates cant be assigned to underscore as hash option like normal; Instead you have to assign them in
//      the views initialize method to this.template...Something weird that only happens with jquery mobile.
//   -> Change ups in the bind / listeners affecting the views
//      If you remove collection.bind(change) but leave it for model.bind(change) then
//      jquery mobile doesnt react well and you lose your css formatting
//   -> Double render or fetch for every time we query - pre jqm render fetches & post fetches too
//   -> ensure cross-domain is set in jqm config and jquery $.ajax also



(function ($) {

    'use strict';


    //-----------------//
    // Client Models   //
    //-----------------//

    // Create basic model that mirrors our backend
    window.Message = Backbone.LiveModel.extend({
        urlRoot:'http://mscns.webfactional.com/dev-api/events/api/v2/message/', // cross domain needed for apps so we my as well use it here too

        url:function () {
            // return the url root and if the id exists then the verb is PUT so append it to the root
            // else its POST and all we need is the root url - ** be wary of removing the trailing slash ;)
            return this.urlRoot + (this.id !== null ? (this.id + '/') : '');
        },

        // used to populate fields of new model in the form when user clicks add
        defaults:{
            'id':null,
            'name':'',
            'description':''
        }
    });

    // collection of models - requires underscore.js
    window.Messages = Backbone.LiveCollection.extend({
        model: Message,

        // if / at beginning of url string then it loads just domain + entire url string
        // if no / at beginning it loads current url + url string (ie: site is mscns.com/client-api then url
        // becomes mscns.com/client-api/message) but with forward slash its just mscns.com/message/
        url: 'http://mscns.webfactional.com/dev-api/events/api/v2/message/',

        findByName: function (key) {
            var url = this.url + key;
            console.log('findByName: ' + key);
            var self = this;

            this.fetch({
                url: url,
                cache: false,

                success: function (collection, response) {
                    self.reset(response);  // collection::reset wants raw data or the response not collection
                    console.log('**findByName fetch successful!');
                },

                error: function (collection, xhr, options) {
                    console.log('Error on fetch attempt. Test cached results.');
                }
            });

            /* alternatively we can call ajax directly instead of using fetch as a wrapper
            $.ajax({
                url: url,
                dataType: "json",
                success: function (data) {
                    console.log(data);
                    console.log("search success: " + data.length);
                    self.reset(data);
                }
            });
            */
        }
    });


    //--------------//
    // client views //
    //--------------//

    window.MessagePageView = Backbone.View.extend({

        // we dont need an init yet until we try to use some type of template loading on the fly
        //template: _.template($('#search-main').html()),

        initialize: function() {
            this.template = _.template($('#search-main').html());
        },

        render: function (eventName) {
            $(this.el).html(this.template(this.model.toJSON()));  // throw json string to template and attach to page

            // instantiate new list of messages
            this.listview = new EventListView({ el: $('ul', this.el), model: this.model, collection: this.collection });
            this.listview.render();

            return this;
        },

        events: {
            'keyup .search-query': 'search',
            'click .add-message': 'addMessage'
        },

        search: function (e) {
            var queryValue = $('.search-query').val();
            console.log('search query is: ' + queryValue);

            // do a search for characters contained in the name for now using djangos contains filter
            var query = '?name__contains=' + queryValue;
            this.model.findByName(query);
        },

        addMessage: function(e) {
            // due to limitations in jquery mobile we need to re-route to a url with add in it

            App.navigate('add/', true);

            return false;
        }
    });

    // ul view - wrapper for list items view
    window.EventListView = Backbone.View.extend({
        //tagName:'ul',
        //className:'list_items',

        initialize: function () {
            this.collection.bind('reset', this.render, this);   // render whenever reset is triggered
            this.collection.bind('change', this.render, this);  // render whenever a change is triggered in the list
            this.collection.bind('add', this.render, this);     // render whenever a new model is added to the collection
            this.collection.bind('remove', this.render, this);  // also re-render after an item is removed via pusher to reflect changes in list
        },

        render: function () {
            var self = this;
            //this.$el.empty();  // empty leftovers
            //this.$el.html('');
            this.$el.empty();
            //$('#welcome').remove();

            console.log('pre rendering the list item view in listView');
            // instantiate the list items and pass to list item view for rendering
            this.collection.each(function (message) {
                self.$el.append(new EventListItemView({ model: message }).render().el);
            }, this);

            console.log('post list view render calling refresh on jqm');
            // this is a jquery mobile only thing here.. TODO: check it
            $('#myList').listview('refresh');

            return this;
        }
    });

    // Main event list view tied to event-lists dom
    window.EventListItemView = Backbone.View.extend({
        tagName: 'li',

        initialize: function() {
            this.template = _.template($('#message-list-item').html());
            this.model.bind('destroy', this.close, this);  // on destroy this model we want to close this view
            // this.model.bind('change', this.render, this); -- not needed for li since ul listens for changes
        },

        render: function () {
            // automatically take our json object, parse it, and put it into html template with underscore tmpl
            this.$el.html(this.template(this.model.toJSON()));
            window.console.log(this.model.toJSON());

            return this;
        },


        close: function() {
            this.$el.unbind();
            //this.$el.empty();
            window.console.log('closed list Item View - from EventListItemView::close()');

            return this;
        }

    });

    // Add Message View
    window.MessageCreateView = Backbone.View.extend({

        events: {
            'click .save': 'saveMessage'
        },

        initialize: function() {
            this.template = _.template($('#message-create-item').html());
            this.model.bind('change', this.render, this);  // on destroy this model we want to close this view
        },

        render: function () {
            // automatically take our json object, parse it, and put it into html template with underscore tmpl
            this.$el.html(this.template(this.model.toJSON()));
            window.console.log(this.model.toJSON());

            return this;
        },

        saveMessage: function() {
            window.console.log('event save initiated');

            // get our model data from HTML elements values
            // id: App.messages.length+1, // Get last id/pk of collection and add one for new id  $('#eventid').val(),
            this.model.set({
                name:$ ('#name').val(),
                description:$ ('#description').val()
            });

            if (this.model.isNew()) {
                //this.model.url = this.model.urlRoot;
                var self = this;

                // I choose to pass the collection in the options hash upon instantiation - however we could do away with OOP and
                // ensure that client.App.messages !== null and then call create on it... would rather do it by passing collection to my view

                this.collection.create(this.model, {
                    wait: true,
                    success:function () {
                        window.console.log('success callback - on POST complete');

                        // close the detail view after save
                        App.navigate('', true);
                    }
                });
            }
            else {
                var that = this;

                this.model.save({}, {
                    //wait: true,
                    success:function () {
                        window.console.log('success callback - PUT complete');

                        // close detail view after save - optional
                        that.close();
                    },
                    error:function () {
                        window.console.log('Error on PUT');
                    }
                });
            }
            return false;
        }
    });

    // Detail view - shows more info on selected event and has buttons for changes
    window.EventDetailView = Backbone.View.extend({

        events: {
            'click .delete': 'deleteEvent'
        },

        initialize: function () {
            this.template = _.template($("#message-detail").html());
            this.model.bind('change', this.render, this); // TODO: temporary will enable when i find fix.
            this.model.bind('destroy', this.close, this);
        //    this.model.bind('reset', this.render, this);
        },

        render: function () {
            // Order of Ops => pass object json data to _ template to fill then pass that markup to element in the DOM
            this.$el.html(this.template(this.model.toJSON()));

            return this;
        },


        close: function () {
            this.$el.unbind();
            //this.$el.empty();
            window.console.log('closed Detail View - from EventDetailView::close()');

            return this;
        },

        deleteEvent:function () {
            // get the model associated with this view
            this.model.destroy({
                success:function () {
                    window.console.log('model destroyed');
                    App.navigate("", true);
                }
            });

            return false;
        }
    });


    //----------------//
    // client routing //
    //----------------//

    // Create the Router for the application
    var AppRouter = Backbone.Router.extend({
        routes:{
            '': 'list',
            'add/': 'add',
            ':id/': 'detail'
        },

        // constructor - header, footer, actions / extremely reusable markup
        initialize: function () {
            $('.back').live('click', function(event) {
                window.history.back();
                return false;
            });
            this.firstPage = true;

            // moved some of the list insantiation work to here
            this.messages = new Messages();

            this.pusher = new Pusher('3fb8e3f49e89f2640bc9');

            this.messages.live({pusher:this.pusher, channel:'client-api', channelName:'client-api', log:true, eventType:'message'});

            //$("#list_actions").html(new ActionsHeaderView().render().el);
        },

               // Standard List View (Fetches objects, passes the collection to listView which instantiates ListItemView and writes to template
        list: function () {
            var self = this;

            this.changePage(new MessagePageView({model: this.messages, collection: this.messages }));
            /*
            // this will not work unless we wait for success and then act
            this.messages.fetch({
                //cache:false,
                success:function (collection, response) {

                    self.messagesview = new EventListView({ collection:collection });

                    $('#content').html(self.messagesview.render().el);
                }
            });
            */
        },

        // Detail View fetches one model from the list and instantiates only the detail or list view passing single model to it
        detail:function (id) {
            window.console.log('detail route activated');

            // get our single model from the collection by id
            if (App.messages) {
                this.message = App.messages.get(id);
                this.changePage(new EventDetailView({ model: this.message }));
            }
            else {
                this.message = new Message({id: id});
                this.changePage(new EventDetailView({ model: this.message }));
            }

            // Without PushState we have to use hashes for our URLS so destroy old detail views to bring in new ones.. or else they stack...duuh duh duuuuuhh..
            //if (App.eventView) App.eventView.close();

            // instantiate the detail view & pass not only the model but the collection so i can reference it to pluck my model from
            //this.eventView = new EventDetailView({ model:this.event, collection:App.messages });  // pass reference to collection cuz i like it better that way ;)

            // draw this view and append it to DOM
            //$('#content').html(this.eventView.render().el);

            // var self = this;

            /*
            this.message.fetch({
                success: function(data) {
                    self.changePage(new EventDetailView({model: data}));
                }
            });
            */

            // log
            //window.console.log('id is: ' + id + ' models id is: ' + this.event.get('id'));
            //window.console.log(this.event.toJSON());
        },

        add: function() {
            // render a new view for posting messages
            this.changePage(new MessageCreateView({model: new Message(), collection: this.messages }));  // pass collection by reference
            window.console.log('new event added');
        },

        // on route add render

        changePage: function (page) {
            $(page.el).attr('data-role', 'page');
            console.log(page.el);

            console.log('calling render for view object ' + page.cid + ' rendering in changePage');
            page.render();  // render our templater with data


            console.log('appending page to body');
            $('body').append($(page.el));  // attach render template to body of dom

            var transition = $.mobile.defaultPageTransition;
            console.log('set up default transitions');

            // We don't want to slide the first page
            if (this.firstPage) {
                transition = 'none';
                this.firstPage = false;
            }
            console.log('checked if first page complete');

            console.log('pre change page on jqm');
            $.mobile.changePage($(page.el), {changeHash: false, transition: transition});
            console.log('after called $.mobile.changePage on jqm');
        }
    });

    // instantiate backbone
    window.App = new AppRouter();
    Backbone.history.start();

})(jQuery);


$(function() {
    // instantiate backbone here works fine in browser but gets downright funky in cordova even
    // when we put it inside of the onDeviceReady where it belongs... ? arggh.. oh well for now.
    // worked fine till jquery mobile so it must be loading something before hand thats fucking w/ scope
});