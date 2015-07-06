#!/usr/bin/env node
var express = require('express');
var request = require('request');
var through2 = require('through2');
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
var cookieUrl = 'rainforestqa.com'

var list = function(list){
  return list.split(',').filter(function(item){ return item.length > 0});
};

var stripProtocol = function(url){
  return url.replace(/.+\:\/\//, '');
}

var replaceUrl = function(body, url, replacementUrl){
  return body.toString().replace(url, replacementUrl);
};

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

  var makeUrl = function(url){
    return protocol + '://' + path.join(proxyUrl, url);
  };

  var j = request.jar();

  var makeRequest = function(req, res){
    console.log(colors.yellow('Requesting url >> ', makeUrl(req.url)));
    // assign cookies to cookiejar
    _.forEach(req.cookies, function(value, key){
      //j.setCookie(req.cookie(key+'='+value, 'rainforestqa.com'));

      j.setCookie(key + '=' + value, 'https://app.rainforestqa.com');
    });

    var pipe = false

    request({
      method: req.method,
      jar: j,
      uri: makeUrl(req.url),
      form: req.body
    }, function (error, response, body) {
      if(error){
        console.log(colors.red(error));
        res.send(error);
      }{
        //_.contains(response.headers['content-type'])
        _.forEach(response.headers, function(value, key){
          if (key === 'set-cookie' || key === 'location'){
            if (_.isString(value)){
              value = value.replace(proxyUrl, 'localhost:'+ port);
              value = value.replace('https', 'http')
            }else if (_.isArray(value)){
              value = value.map(function(val){ return val.replace(proxyUrl, 'localhost:'+ port); });
            }
          }
          res.setHeader(key, value);
        });
        if(_.contains(response.headers['content-type'], 'text/html')){
          body = body.replace(proxyUrl, 'localhost:'+ port);
        }
        console.log(_.keys(res));
        console.log(colors.green('Successfully requested >> ', makeUrl(req.url)));
        res.status(response.statusCode);
        res.send(new Buffer(body));
      }
    });
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
