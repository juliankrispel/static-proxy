# Static Proxy

A static file server which falls back to proxying your requests if there is no local file matching the route

This'll be a cli tool. For now just use it like this:

```javascript
var staticProxy = require('static-proxy');

// start the server with arguments url, protocol and [static folders]
staticProxy('http://google.com', 'https', ['public']);
```
