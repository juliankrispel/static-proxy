# Static Proxy

A static file server which falls back to proxying your requests if there is no local file matching the route.

Basically, this is useful for frontend developers which want to be able to point their frontend app to different backends, i.e. your local devserver, or your production environment etc.

Static proxy is part of our dev setup at [rainforest](http://rainforestqa.com).

## Usage

You can use the `static-proxy` module in your app or as a cli tool.

### Command Line API
Using static-proxy as a cli tool looks like this:

```bash
npm install static-proxy -g

# cd into your project
cd ~/my-project

# start static-proxy
static-proxy -u google.com -f public,assets,otherFolder -p 3000 -P https
```

the available options are:
`-u <proxy-url>` or `--url <proxy-url>` - This sets up the url that will be proxied
`-p` or `--port` - Sets port of the server
`-P` or `--protocol` - Protocol to use for proxy, https is default
`-f` or `--folders` - this tells the server which folders to scan before 
`-v` or `--verbose` - to log basic details for every request being made through static-proxy (__false__ by default)

### JavaScript API

Using static-proxy in your app or build script:

First install static proxy in your project:

```
npm install static-proxy --save-dev
```

Then use it in your node js script like so:

```javascript
var staticProxy = require('static-proxy');

// start the server with arguments url, protocol and [static folders]

staticProxy('http://google.com', 3000, 'https', ['public', 'assets']);
```

Options for the js api are the same as for the cli tool with one additional argument (transform), simply pass them as arguments like so:

```
staticProxy(url[String], port[Integer], protocol[Integer], folders[array of strings], verbose(Boolean), transform[Function])`
```

With *transform*, you can modify the response body of a request. This allows you to modify the response body in whatever way you please. We use it for example to replace absolute urls with relative ones so that we can map assets from a cdn or 3rd party resources to assets in our public folder.

Example:
```javascript
var transform = function(respBody, encoding){
  return respBody.toString().replace(/\/\/static\.[a-z]+\.com\/[a-z0-9]+\//gi, '/');
};

gulp.task('staticProxyQa', function(){
  staticProxy('google.com', 3000, 'https', ['public'], transform);
});
```
