'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI);

var cors = require('cors');
var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
var dns = require('dns');
var bodyParser = require('body-parser');

var urlRegex = /https?:\/\/(www)?\.?/i
var Url = createUrlModel();
var UrlCounter = createCounterModel();

app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(process.cwd() + '/public'));

function createUrlModel() {
  var urlSchema = new mongoose.Schema({
    longUrl: String,
    shortUrl: String,
    shortLabel: Number
  });
  return mongoose.model('Url', urlSchema);
}

function createCounterModel() {
  var urlCounterSchema = new mongoose.Schema({  
    name: String,
    ident: String,
    counter: {type: Number, default: 0}  
  });
  return mongoose.model('UrlCounter', urlCounterSchema);
}
  
function createCounter(callback) {
  console.log('about to create counter')
  var newCounter = new UrlCounter({name: "counter", counter: 0});
  newCounter.save(function(err, data) {
    if (err) throw err;
    console.log('counter created');
    callback()
    })
} 

function counterExists(callback) {  
  UrlCounter.findOne({name: 'counter'}, function(err, data) {    
    if (err) throw err;  
    if (data == null) {        
      createCounter(callback)
    } else { 
    callback()
    }
  })  
}

function updateCounter(url, res, callback) {  
  UrlCounter.findOne({name: 'counter'}, function(err, data) {
    if (err) throw err;     
    data.counter += 1;        
    data.save(function(err, data) {
      if (err) throw err;
    })
    callback(url, res, data.counter)
  })  
}

function updateDb(url, res, label) {  
  var newEntry = new Url({longUrl: url, shortUrl: 'paint-fight.glitch.me/api/shorturl/' + label, shortLabel: label})  
  newEntry.save(function(err, data) {
    if (err) console.error(err)
  })
  res.json({"original_url": url, 
            "short_url": newEntry.shortUrl})  
}

function checkUrl(url, req, res) {    
  var testUrl = url.replace(urlRegex, '');  
  dns.lookup(testUrl, function (err, address, family) {    
    if (!address) {      
      res.json({error: "Invalid URL"})
    } else {            
      counterExists(function() {
        updateCounter(url, res, updateDb)
      })      
    }    
  })
}  

function lookupUrl(url, callback) {
  var findUrl = Url.findOne({shortLabel: url}, function(err, data) {
    if (err) console.error(err);
    if (data == null) {
      callback(null)
    } else {
      callback(data.longUrl)
    }
  })
}

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.post('/api/shorturl/new', function (req, res) {    
  checkUrl(req.body.url, req, res)  
});

app.get('/api/shorturl/new-:url', function (req, res) {
  checkUrl(req.params.url, req, res);  
}); 

app.get('/api/shorturl/:label', function(req, res) {    
  lookupUrl(req.params.label, function(label) {
    if (label == null) {
      res.type('txt').send('ShortUrl not in database');
    } else {
      label = 'https:\/\/' + label.replace(urlRegex, '');
      res.redirect(label)
    }
  })
});
  

app.listen(port, function () {
  console.log('Node.js listening ...');
});