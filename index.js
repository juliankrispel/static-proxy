var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var tough = require('tough-cookie');
var Cookie = tough.Cookie;
var _ = require('lodash');
var path = require('path');
var app = express();
var colors = require('colors');
var bodyParser = require('body-parser')

module.exports = function(baseUrl, protocol, staticFolders){

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
    return protocol + '://' + path.join(baseUrl, url);
  };

  var j = request.jar();

  var makeRequest = function(req, res){
    console.log(colors.yellow('Requesting url >> ', url(req.url)));
    // assign cookies to cookiejar
    _.forEach(req.cookies, function(value, key){
      j.setCookie(key + '=' + value, baseUrl);
    });

    request({
      method: req.method,
      jar: j,
      uri: url(req.url),
      form: req.body
    }, function (error, response, body) {
      if(error){
        console.log(colors.red(error));
        res.send(error);
      }{
        _.forEach(response.headers, function(value, key){
          res.setHeader(key, value);
        });
        console.log(colors.green('Successfully requested >> ', url(req.url)));
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
    var port = server.address().port;

    console.log('static proxy listening at http://%s:%s', host, port);
  });
};
