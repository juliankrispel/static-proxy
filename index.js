#!/usr/bin/env node
var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var tough = require('tough-cookie');
var Cookie = tough.Cookie;
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

var stripProtocol = function(url){
  return url.replace(/.+\:\/\//, '');
}

cli
  .version(package.version)
  .option('-u --url [url]', 'Set url of proxy [url] (required)', stripProtocol)
  .option('-f --folders <folders>', 'Add a list of folders <folders>', list)
  .option('-p --port [port]', 'Set port of local server [port]', 3000)
  .option('-P --protocol [protocol]', 'Protocol to use for proxy [protocol]', 'https')
  .parse(process.argv);

if(!module.parent){
  staticProxy(cli.url, cli.port, cli.protocol, cli.folders);
}

function staticProxy(proxyUrl, port, protocol, staticFolders){
  console.log('static folders', staticFolders);
  if(proxyUrl === undefined){
    console.log(colors.red('Error: a url for the proxy must be defined\n') +
             colors.yellow('Define a proxy-url Like this: \n' +
                           'static-proxy -u google.com'));
    return ;
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

  var url = function(url){
    return protocol + '://' + path.join(proxyUrl, url);
  };

  var j = request.jar();

  var makeRequest = function(req, res){
    console.log(colors.yellow('Requesting url >> ', url(req.url)));
    // assign cookies to cookiejar
    _.forEach(req.cookies, function(value, key){
      j.setCookie(key + '=' + value, proxyUrl);
    });

    request({
      method: req.method,
      jar: j,
      uri: url(req.url),
      form: req.body
    }).pipe(res);
  };

  app.get('/*', makeRequest);
  app.post('/*', makeRequest);
  app.put('/*', makeRequest);

  var server = app.listen(3000, function () {
    var host = server.address().address;
    if(host === '::') host = '0.0.0.0'
    var port = server.address().port;

    console.log(colors.green('static proxy listening at http://%s:%s'), host, port);
  });
};


module.exports = staticProxy;
