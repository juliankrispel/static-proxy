#!/usr/bin/env node
var express = require('express');
var request = require('request');
var Transform = require('stream').Transform;
var cookieParser = require('cookie-parser');
var tough = require('tough-cookie');
var Cookie = tough.Cookie;
var Readable = require('stream').Readable;
var _ = require('lodash');
var path = require('path');
var cli = require('commander');
var app = express();
var colors = require('colors');
var bodyParser = require('body-parser');
var package = require('./package.json');

var list = function(list){
  return list.split(',').filter(function(item){ return item.length > 0});
};

var transformResponse = function(transform, proxyUrl){
  var parser = new Transform();
  parser._transform = function(data, encoding, done) {
    this.push(transform(data, encoding));
    done();
  };
  return parser;
}

var stripProtocol = function(url){
  return url.replace(/.+\:\/\//, '');
}

cli
  .version(package.version)
  .option('-u --url [url]', 'Set url of proxy (required)', stripProtocol)
  .option('-p --port [port]', 'Set port of local server', 3000)
  .option('-P --protocol [protocol]', 'Protocol to use for proxy', 'https')
  .option('-f --folders <folders>', 'Add a list of folders', list)
  .option('-v --verbose', 'Set logger to be verbose')
  .parse(process.argv);

if(!module.parent){
  staticProxy(cli.url, cli.port, cli.protocol, cli.folders, cli.verbose);
}

var mapHeader = function(regex, replacement, value, key){
  if (_.isString(value)){
    value = value.replace(regex, replacement);
  }else if (_.isArray(value)){
    value = _.map(value, mapHeader.bind(this, regex, replacement));
  }else if(_.isObject(value)){
    value = transformHeadersRecursively(value, regex, replacement);
  }
  return value;
};

var transformCookies = function(){
};

var transformHeadersRecursively = function(headers, regex, replacement){
  return _.mapValues(headers, mapHeader.bind(this, regex, replacement));
}

function staticProxy(proxyUrl, port, protocol, staticFolders, verbose, transform){
  if(proxyUrl === undefined){
    console.log(colors.red('Error: a url for the proxy must be defined\n') +
             colors.yellow('Define a proxy-url Like this: \n' +
                           'static-proxy -u google.com'));
    return ;
  }

  if (verbose === undefined){
    verbose = false;
  }

  if (transform === undefined){
    // No-op by default
    transform = function(data){ return data; }
  }

  if (port === undefined){
    port = 3000;
  }

  if (protocol === undefined){
    protocol = 'https';
  }

  if (staticFolders === undefined){
    staticFolders = ['public'];
  }

  app.use(cookieParser());
  app.use(bodyParser.json());
  staticFolders.forEach(function(folder){
    app.use(express.static(folder));
  });
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  var makeUrl = function(url){
    return protocol + '://' + path.join(proxyUrl, url);
  };

  var makeRequest = function(req, res, next){
    if(verbose === true){
      console.log(colors.yellow('Requesting url >> ', makeUrl(req.url)));
    }

    var pipe = false

    var isText = false;

    var headers = req.headers;

    var localhostUrl = 'localhost';
    if (port && port !== 80){
      localhostUrl+= ':' + port;
    }

    var localhostRegex = new RegExp(localhostUrl, 'gi');
    var headers = transformHeadersRecursively(headers, localhostRegex, proxyUrl);
    headers['accept-encoding'] = headers['accept-encoding'].replace('gzip, ', '');

    // set the host to the proxy url
    headers.host = proxyUrl;
    headers.referer = makeUrl(req.url);
    headers.origin = makeUrl('')
    headers.method = req.method;

    if (verbose === true){
      _.forEach(headers, function(val, k){console.log(k + ': ' + val);});
    }

    var options = {
      method: req.method,
      headers: headers,
      encoding: null,
      followRedirect: false,
      uri: makeUrl(req.url),
    }
    if(_.contains(req.headers['content-type'], 'form')){
      options.form = req.body
    }else{
      options.json = req.body
    }

    request(options)
    .on('response', function(response){
      var proxyUrlRegex = new RegExp(proxyUrl, 'gi');
      var localhostUrl = 'localhost';
      if (port && port !== 80){
        localhostUrl+= ':' + port;
      }

      response.headers = transformHeadersRecursively(response.headers, new RegExp(proxyUrl, 'gi'), localhostUrl);
      response.headers = transformHeadersRecursively(response.headers, 'https', 'http');
      if(response.headers['set-cookie']){
        response.headers['set-cookie'] = response.headers['set-cookie'].map(function(cookie){ return cookie.replace(/domain=[^;]+;/, 'domain=;') });
        if(verbose === true){
          console.log('set cookie', response.headers['set-cookie']);
        }
      }

      res.writeHead(response.statusCode, response.headers)
      response
      .pipe(transformResponse(transform))
      .pipe(res);
    })

  };

  app.all('/*', makeRequest);

  var server = app.listen(port, function () {
    var host = server.address().address;
    if(host === '::') host = '0.0.0.0'
    var port = server.address().port;
    console.log(colors.green('static-proxy listening at http://%s:%s'), host, port);
  });
};

module.exports = staticProxy;
