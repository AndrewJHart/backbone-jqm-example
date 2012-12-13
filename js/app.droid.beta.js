( function( $ ) {

    document.addEventListener("deviceready", onDeviceReady, false);

	// create one global object to store state of app for pusher
    var MESSAGE_STATES = {
        ORIGIN_CREATED: false,
        ORIGIN_DELETED: false,
        ORIGIN_UPDATED: false
    };


// Create basic model that mirrors our backend
      window.calEvent = Backbone.Model.extend({
          urlRoot:'http://mscns.webfactional.com/dev-api/events/api/v2/message/',

          // used to populate fields of new model in the form when user clicks add
          defaults:{
              'id':null,
              'name':'',
              'description':''
          }
      });

// collection of models - depends on underscore.js
      window.calEvents = Backbone.Collection.extend({
          model: calEvent,
          urlRoot : 'http://mscns.webfactional.com/dev-api/events/api/v2/message/',
          url : 'http://mscns.webfactional.com/dev-api/events/api/v2/message/'
      });

// Main event list view tied to event-lists dom
      window.EventListItemView = Backbone.View.extend({
            tagName: 'li',

            template:_.template($('#tpl-event-list').html()),

            initialize: function() {
                this.model.bind("destroy", this.close, this);  // on destroy this model we want to close this view
            },

            render: function () {
                // automatically take our json object, parse it, and put it into html template with underscore tmpl
                this.$el.html(this.template(this.model.toJSON()));
                window.console.log(this.model.toJSON());
                return this;
            },

            close: function() {
                this.$el.unbind();
                this.$el.empty();
                window.console.log('closed list Item View - from EventListItemView::close()');
            }
        });

// ul view - wrapper for list items view
      window.EventListView = Backbone.View.extend({
          tagName: 'ul',
          className: 'list_items',

          initialize: function() {
              this.collection.bind('reset', this.render, this);   // render whenever reset is triggered
              this.collection.bind('change', this.render, this);  // render whenever a change is triggered in the list
              this.collection.bind('add', this.render, this);     // render whenever a new model is added to the collection
              this.collection.bind('destroy', this.render, this); // after model is destroyed re-render
              this.collection.bind('remove', this.render, this);  // also re-render after an item is removed via pusher to reflect changes in list
          },

          render: function() {
              var self = this;
              this.$el.html('');
              this.collection.each(function (event) {
                  self.$el.append(new EventListItemView({ model: event }).render().el);
              }, this);

              return this;
          },

          close: function() {
              this.$el.unbind();
              this.$el.empty();
              window.console.log('List View (collection view) closed');

              return this; // for chaining
          }

      });

// Detail view - shows more info on selected event and has buttons for changes
      window.EventDetailView = Backbone.View.extend({

          template:_.template($("#tpl-event-detail").html()),

          initialize: function() {
              // this.model.bind('add', this);
              //this.model.bind('reset', this.render, this);
              this.model.bind('change', this.render, this);
              this.model.bind("destroy", this.close, this);
          },

          render: function(){
              this.$el.html(this.template(this.model.toJSON()));
              return this;
          },

          close: function() {
              this.$el.unbind();
              this.$el.empty();
              window.console.log('closed Detail View - from EventDetailView::close()');
          },

          events: {
              'click .save': 'saveEvent',
              'click .delete': 'deleteEvent'
          },

          saveEvent: function() {
              window.console.log('event save initiated');

              // get our model data from HTML elements values
              // id: App.eventsList.length+1, 
              // Get last id/pk of collection and add one for new id  $('#eventid').val(),
              this.model.set({
                  name: $('#eventname').val(),
                  description: $('#eventdesc').val()
              });

              if (this.model.isNew()) {
                  //this.model.url = this.model.urlRoot;
                  var self = this;

                  App.eventsList.create(this.model, {
                      success: function() {
                          window.console.log('success on POST');

                          // close the detail view after save
                          self.close();
                      }
                  });
              }
              else {
                  this.model.save();
                  window.console.log('updated (PUT)');
                  MESSAGE_STATES.ORIGIN_UPDATED = true;
              }
              window.console.log('save method complete');

              return false; // pevent propagation?
          },

          deleteEvent: function() {
              // get the model associated with this view
              this.model.destroy({
                  success: function() {
                      window.console.log('model destroyed');
                      MESSAGE_STATES.ORIGIN_DELETED = true;
                  }
              });

              return false;
          }
      });

      window.ActionsHeaderView = Backbone.View.extend({
          template:_.template($("#tpl-action-list").html()),

          events: {
              'click .add': 'newEvent'
          },

          initialize: function() {
              this.render();
          },

          render: function() {
              this.$el.html(this.template());
              return this;
          },

          newEvent: function() {
              // render a new detail event view
              $('#detail').append(new EventDetailView({model: new calEvent()}).render().el);
              window.console.log('new event added');


              if (App.eventView) {
                  App.eventView.close();
                  window.console.log('Event Detail View closed - called from newEvent');
              }

              // let app know that new model is being added by this client so websockets dont add it twice
              MESSAGE_STATES.ORIGIN_CREATED = true;

              return false;
          }
      });

// router to map requests to functions that fetch objects and pass to views on construction
      var AppRouter = Backbone.Router.extend({
          routes: {
              '':'list',
              ':id/':'detail'
          },

          // constructor - header, footer, actions / extremely reusable markup
          initialize: function() {
              $("#list_actions").html(new ActionsHeaderView().render().el);
          },

          // Standard List View (Fetches objects, passes the collection to listView which instantiates ListItemView and writes to template
          list: function() {
              this.eventsList = new calEvents();

              var self = this;

              // this will not work unless we wait for success and then act
              this.eventsList.fetch({
                  cache: false,
                  success: function(collection, response) {

                      self.eventslistview = new EventListView({ collection: collection });

                      $('#list').html(self.eventslistview.render().el);
                  }
              });
          },

          // Detail View fetches one model from the list and instantiates only the detail or list view passing single model to it
          detail: function(id) {
              window.console.log('detail route activated');

              // --- Originally was fetching data here too, so the process went: click on a list item, fetch data for a whole collection
              // --- then get one model from that collection, pass it to a detail view, render it... That seemed like overkill and it appears
              // --- to work just fine with the existing collection received from list view - no reason to re-fetch again

              // get our single model from the collection by id
              this.event = App.eventsList.get(id); //.at(id);  // was using id-1

              // Set the URL for each fetched model now so we don't have to worry later
              this.event.url = this.event.urlRoot + this.event.id + '/';

              // Without PushState we have to use hashes for our URLS so destroy old detail views to bring in new ones.. or else they stack...duuh duh duuuuuhh..
              if (App.eventView) {
                  App.eventView.close();
                  window.console.log('closed event detail view from router:detail fetch method');
              }

              this.eventView = new EventDetailView({ model: this.event });
              $('#detail').html(this.eventView.render().el);

              //Backbone.history.start();
              window.console.log('id is: ' + id + ' models id is: ' + this.event.get('id'));
              window.console.log(this.event.toJSON());
          }
      });


    function onDeviceReady() {

		// instantiate backbone
      	window.App = new AppRouter();
      	Backbone.history.start();

		// Pusher
      	var pusher = new Pusher('3fb8e3f49e89f2640bc9');
      	var channel = pusher.subscribe('client-api');

		// listen for new messages
      	channel.bind('add_message', function(data) {
          	if (MESSAGE_STATES.ORIGIN_CREATED) {
            	window.console.log('Caught pusher event and stopped due to message origin same as client');
              	MESSAGE_STATES.ORIGIN_CREATED = false;
          }
          else {
              window.console.log('** id of event from pusher is ' + data.id + ' adding this event to the collection');

              // Add our event real time to other clients
              App.eventsList.add(data);


              window.console.log('event added from pusher');
              window.console.log(data);
          }
      });

      // listen for delete message
      channel.bind('remove_message', function(data) {

          if (MESSAGE_STATES.ORIGIN_DELETED) {
              window.console.log('** Caught pusher delete message stopped same as origin');
              MESSAGE_STATES.ORIGIN_DELETED = false;
          }
          else {
              window.console.log('** Pusher removing ' + data.id + ' from collection');
              App.eventsList.remove(data);

              window.console.log('event deleted from pusher, bound on remove.. re-rendering');
          }
      });
  }
  
} )( jQuery );

Pusher.log = function( msg ) {
	if( window.console && window.console.log ) {
		window.console.log( msg );
	}
};