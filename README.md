backbone-jqm-example
====================

Real time notifications example -- NOTE: using jqm w/ backbone was a horrible idea - don't do it, just get a decent designer :) -- Uses backbone, Pusher, and jquery mobile on the client. The data comes over a public API built on tastypie and Django using signals to notify pusher after save, update, or delete. I'm using middleware that allows CORS so if you are allowing cross domain on your server then no configuration is needed on this client.
