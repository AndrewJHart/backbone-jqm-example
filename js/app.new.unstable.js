// Application for Client -- 11/2012 Andrew J Hart MSCNS
// Backbone & Pusher for realtime messaging and models/views syncronization
	
(function ($) {
//    'use strict';
    
    // register the event listener to link cordova with the native entry point
    document.addEventListener("deviceready", onDeviceReady, false);
	
	// router to map requests to functions that fetch objects and pass to views on construction
	var AppRouter = Backbone.Router.extend({
	    routes: {
	        '': 'list',
	        ':id/': 'detail'
	    },
	
	    // constructor - header, footer, actions / extremely reusable markup
	    initialize: function() {
	        $("#list_actions").html(new ActionsHeaderView().render().el);
	    },
	
	    // Standard List View (Fetches objects, passes the collection to listView which instantiates ListItemView and writes to template
	    list: function() {
	        this.messages = new Messages();
	
	        /*
	         ------------------------------------------------------------//
	         We extended the collection with websockets real time caps  //
	         so instantiate pusher here and call live on our collection //
	         ------------------------------------------------------------//
	         */
	        this.pusher = new Pusher('3fb8e3f49e89f2640bc9');
	
	        this.messages.live({pusher: this.pusher, channel: 'client-api', channelName: 'client-api', log: true, eventType: 'message'});
	
	        var self = this;
	
	        // this will not work unless we wait for success and then act
	        this.messages.fetch({
	           // cache: false,
	            success: function(collection, response) {
	
	                self.messagesview = new EventListView({ collection: collection });
	
	                $('#list').html(self.messagesview.render().el);
	            }
	        });
	    },
	
	    // Detail View fetches one model from the list and instantiates only the detail or list view passing single model to it
	    detail: function(id) {
	        console.log('detail route activated');
	
	        // get our single model from the collection by id
	        this.event = App.messages.get(id);
	
	        // Without PushState we have to use hashes for our URLS so destroy old detail views to bring in new ones.. or else they stack...duuh duh duuuuuhh..
	        if (App.eventView) App.eventView.close();
	
	        // instantiate the detail view & pass not only the model but the collection so i can reference it to pluck my model from
	        this.eventView = new EventDetailView({ model: this.event, collection: App.messages });  // pass reference to collection cuz i like it better that way ;)
	
	        // draw this view and append it to DOM
	        $('#detail').html(this.eventView.render().el);
	
	        // log
	        console.log('id is: ' + id + ' models id is: ' + this.event.get('id'));
	        console.log(this.event.toJSON());
	    }
	});
	
	
	// entry point - required for namespacing
	function onDeviceReady() {
	
	    // instantiate our Router and start backbone
	    window.App = new AppRouter();
	    Backbone.history.start();
	}
	
})(jQuery);
	