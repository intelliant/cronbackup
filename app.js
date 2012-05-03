
/*!
 * Nuxeo Cron Backup
 * Copyright(c) 2012 F. Viaud-Murat <info@intelliant.fr>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs'),
  path = require('path'),
  express = require('express'),
  log4js = require('log4js'),
  commit = require('./commit'),
  configure = require('./lib/configure');
  
/**
 * Module globals.
 */
    
var app = module.exports = express.createServer(),
  settings,
  log;
  
process.on('uncaughtException', function (error) { 
  log4js.getLogger('email').info(error.stack);
  process.exit(1);
});

// Configuration

app.configure(function () {
  //all the settings can be manually overridden in settings.json
  var json = fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'),
  backup;
  settings = JSON.parse(json);
        
  log4js.configure(settings.log);  
  log = log4js.getLogger('backup');
    
  backup = configure(settings, log);
  app.set('backup', backup);  
    
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  
  if (settings.auth) {
    app.use(express.basicAuth(settings.auth.user, settings.auth.pass));
  }
      
  app.use(log4js.connectLogger(log, { level: log4js.levels.TRACE }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

// Routes

app.get('/', commit.list);
app.get('/commits/:type?', commit.list);
app.get('/commits/:type/:id', commit.view);
app.post('/commits/:type/:id', commit.update);

app.listen(settings.port);
log.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);