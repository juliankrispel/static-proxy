var express = require('express');
var request = require('request');
var _ = require('lodash');
var path = require('path');
var app = express();
var colors = require('colors');
var protocol = 'https://';
var baseUrl = 'app.rnfrstqa.com'

var url = function(url){
  return protocol + path.join(baseUrl, url);
};

var makeRequest = function(req, res){
  console.log(colors.yellow('Requesting url >> ', url(req.url)));
  console.log(req.cookies);
  request({
    method: req.method,
    uri: url(req.url)
  }, function (error, response, body) {
    if(error){
      console.log(colors.red(error));
      res.send(error);
    }{
      _.forEach(response.headers, function(value, key){
        res.setHeader(key, value);
      });
      console.log(colors.green('Successfully requested >> ', url(req.url)));
      res.send(body);
    }
  });
};

app.get('/*', makeRequest);
app.post('/*', makeRequest);
app.put('/*', makeRequest);

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
