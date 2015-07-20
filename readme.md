# Static Proxy

A static file server which falls back to proxying your requests if there is no local file matching the route.

Basically, this is useful for frontend developers which want to be able to point their frontend app to different backends, i.e. your local devserver, or your production environment etc.

## Usage

You can use the `static-proxy` module in your app or as a cli tool.

Using static-proxy as a cli tool:

```bash
npm install static-proxy -g

# cd into your project
cd ~/my-project

# start static-proxy
static-proxy -u google.com -f public,assets,otherFolder -p 3000 -P https
```

Using static-proxy in your app or build script:

```javascript
var staticProxy = require('static-proxy');

// start the server with arguments url, protocol and [static folders]

staticProxy('http://google.com', 3000, 'https', ['public', 'assets']);
```
