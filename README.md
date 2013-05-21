backbone-jqm-example
====================

Real time notifications example --  
***This repo was originally for internal mscns devs to provide an example new to JS MVC concepts... This repo is functional but has been purposefully left in this state so lessons can be learned and abstraction & inheritance can be used to build reusable parts.

NOTE: using jqm w/ backbone was a horrible idea - don't do it, just get a good designer :)

-- App gets its functionality from backbone.js for routing + model driven views && pusher.js (hosted web-sockets) to listen for data and notify model(s).  The app's UI is entirely based on jQuery-Mobile, reflected by data-* attributes in the template markup. 

-- App Implementation based on cross-domain RESTful JSON API - allows the web app to get JSON formatted data from a remote endpoint on a separate domain. The app makes few assumptions and is server agnostic, requiring only that the data is JSON formatted.  

-- The original server tech was built w/ django & PostGres DB and using signals, sent the data via websockets whenever there was a update or write to the model. I added middleware that specifies CORS headers so if you are allowing cross domain on your server then no configuration is needed on this client.
