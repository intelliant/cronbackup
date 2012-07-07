
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
  registry = require('./windows/registry'),
  execSync = require('./windows/Command').execSync,
  backup = require('./backup'),
  database = require('./database'),
  git = require('./git');
  
/**
 * Module logger.
 */

var log;

/**
 * Configure the settings of our backup application.  
 * Most of the default values can be directly extracted from the Windows registry or from the nuxeo.conf file.
 *  
 * Cron Patterns: see <a href="http://help.sap.com/saphelp_xmii120/helpdata/en/44/89a17188cc6fb5e10000000a155369/content.htm">this documentation</a>.
 * Ex. "00 30 22 * * 2-6" (runs from Monday through Friday at 22:30:00).  
 *
 * @param {Object} settings
 * @param {String} [settings.cron.data] cron time pattern for Nuxeo data backup
 * @param {String} [settings.cron.program] cron time pattern for Nuxeo program backup 
 * @param {String} [settings.port=3000] Bind the app server to the given port
 * @param {Object} [settings.auth] HTTP basic authentication user name and password
 * @param {String} [settings.git.cmd] Command to use in order to launch the stupid content tracker
 * @param {String} [settings.git.dir] Base path to the repositories
 * @param {Object} [settings.git.config] Git repository options
 * @param {String} [settings.nuxeo.regkey] Windows registry key where to read Nuxeo configuration values
 * @param {String} [settings.nuxeo.configfile] Path to nuxeo.conf file
 * @param {String} [settings.nuxeo.vardir] Path to Nuxeo Program Data
 * @param {String} [settings.nuxeo.path] Path to Nuxeo program
 * @param {String} [settings.nuxeo.datadir] Path to Nuxeo data folder
 * @param {String} [settings.nuxeo.logdir] Path to Nuxeo logs folder
 * @param {Array}  [settings.nuxeo.requiredParam] A config error is thrown if this array values are not set in nuxeo.conf
 * @param {String} [settings.nuxeo.dumpfile] Path to database dump file (must be somewhere in Nuxeo Program Data folder)
 * @param {String} [settings.db.regkey] Windows registry key where to read Postgresql configuration values
 * @param {String} [settings.db.dump] Command to use in order to launch the pg_dump utility 
 * @param {String} [settings.db.restore] Command to use in order to launch the pg_restore utility
 * @param {String} [settings.db.host] Nuxeo database host URL
 * @param {String} [settings.db.port] Nuxeo database host port
 * @param {String} [settings.db.name] Nuxeo database name
 * @param {String} [settings.db.user] Nuxeo database user name
 * @param {String} [settings.db.password] Nuxeo database password
 * @param {String} [settings.db.pgpass] Path to database password file
 * @param {Object} [settings.log] Log4js configuration (see <a href="https://github.com/nomiddlename/log4js-node">the documentation</a>).  
 * @return {Object} Our Nuxeo Data & Program 'Backup' business objects 
 */ 
module.exports = function (settings, logger) {
  var reg,
    appdata,
    config = {},
    git = {},
    db = {},
    nuxeo = {},
    basedir = path.dirname(__dirname);
        
  log = logger;
         
  //If set, the app will try to read the 3 following values in this Windows registry key:
  if (settings.nuxeo.regkey) {
    reg = registry(settings.nuxeo.regkey);    
    //Try all install types
    if (!reg.Path) {
      nuxeo.regkey = settings.nuxeo.regkey.replace('/Wow6432Node', '');
      reg = registry(nuxeo.regkey);
    }
    if (reg.Path) {
      nuxeo.path = reg.Path.value;
      nuxeo.vardir = reg.VarDirectory.value;   
      nuxeo.configfile = reg.ConfigFile.value;
      if (!settings.nuxeo.configfile) {
        settings.nuxeo.configfile = nuxeo.configfile;
      }    
    }
  }
  
  //If set, the app will try to find the Postgres bin location value from this Windows registry key:
  if (settings.db.regkey) {
    reg = registry(settings.db.regkey);
    if (!reg['Base Directory']) {
      db.regkey = settings.db.regkey.replace('/Wow6432Node', '');
      reg = registry(db.regkey);
    }
    if (reg['Base Directory']) {
      db.dump = path.join(reg['Base Directory'].value, 'bin', 'pg_dump.exe');
      db.restore = path.join(reg['Base Directory'].value, 'bin', 'pg_restore.exe');
    }
  }
                                                                                                
  //If not set in settings.json, all the nuxeo.db.* values will be read in nuxeo.conf
  if (fs.existsSync(settings.nuxeo.configfile)) {
    config = read(settings.nuxeo.configfile, settings.nuxeo.requiredParam);      
    nuxeo.datadir = config['nuxeo.data.dir'];
    nuxeo.logdir = config['nuxeo.log.dir'];  
    db.host = config['nuxeo.db.host']; 
    db.port = config['nuxeo.db.port'];
    db.name = config['nuxeo.db.name'];
    db.user = config['nuxeo.db.user'];
    db.password = config['nuxeo.db.password'];
  }
  
  if (settings.nuxeo.requiredParam) {
    checkRequired(config, settings.nuxeo.requiredParam);
  }
    
  //If not set in settings.json, the app will create a 'backup' directory in the same folder
  git.dir = path.join(basedir, 'backup');
    
  //pgpass.conf file contains the password needed to connect to database as a user, allowing automating routine
  //administration tasks through mechanisms like cron (Cf. http://wiki.postgresql.org/wiki/Pgpass).
  //If not set in settings.json, the app will try to find or create this file in the Windows %APPDATA% system folder
  appdata = execSync('echo %APPDATA%');
  appdata = appdata.substr(0, appdata.indexOf('\r\n') - 2);
  db.pgpass = path.join(appdata, 'postgresql', 'pgpass.conf');  
    
  mergeSettings(settings.git, git);
  mergeSettings(settings.db, db);
  mergeSettings(settings.nuxeo, nuxeo);
      
  //Database dump file name (must be somewhere in Nuxeo var directory)
  //If not set in settings.json the app will create it in the pgsql folder
  if (!settings.nuxeo.dumpfile) {
    settings.nuxeo.dumpfile = path.join(settings.nuxeo.vardir, 'pgsql', settings.db.name + '.dump'); 
  }
    
  //Check that we find Git command location  
  if (!fs.existsSync(settings.git.cmd)) {
    settings.git.cmd = settings.git.cmd.replace(' (x86)', '');
  }
  //If not set in settings.json, the app will try to find the Windows portable version located in the same folder  
  if (!fs.existsSync(settings.git.cmd)) {
    settings.git.cmd = path.join(basedir, 'git', 'cmd', 'git.cmd');    
  }
  if (!fs.existsSync(settings.git.cmd)) {
    throw new Error ('Could not find the location of Git command on the system. Please complete the configuration file!');
  }
  
  //Check that our git base directory exists
  if (!fs.existsSync(settings.git.dir)) {
    fs.mkdirSync(settings.git.dir);
  }
      
  //Git config options
  //(if core.excludesfile is not set in settings.json, the app will try to find a file named 'exclude' in the same folder)     
  if (!settings.git.config['core.excludesfile']) {
    settings.git.config['core.excludesfile'] = path.join(basedir, 'exclude');  
  }
  
  unlinkSyncFiles();
  log.debug('Settings: %j', settings);  
  
  return {
    data: data(settings),
    program: program(settings)
  };
};

/**
 * Create a new Nuxeo Data 'Backup' object.
 *
 * @param {Object} settings
 */ 
function data(settings) {
  var gitdir = path.join(settings.git.dir, 'data'),
    worktree = settings.nuxeo.vardir,
    before = function () {
      log.info('Dumping the database...');
      var db = database(settings.db);
      db.dump(settings.nuxeo.dumpfile);        
    },
    after = function () {
      log.info('Restoring the database...');
      var db = database(settings.db);
      db.restore(settings.nuxeo.dumpfile);
    },
    files = [
      settings.nuxeo.dumpfile,
      settings.nuxeo.configfile,
      settings.nuxeo.datadir,
      settings.nuxeo.logdir
    ];
  return backup({
      git: git(gitdir, worktree, settings.git.cmd, settings.git.config),
      beforebackup: before,
      afterrestore: after,
      files: files,
      cron: settings.cron.data
    }, log);
}

/**
 * Create a new Nuxeo Program 'Backup' object.
 *
 * @param {Object} settings
 */ 
function program(settings) {
  var gitdir = path.join(settings.git.dir, 'program'),
    worktree = settings.nuxeo.path;
  return backup({
      git: git(gitdir, worktree, settings.git.cmd, settings.git.config),
      cron: settings.cron.program
    }, log);
}

/**
 * Read the content of nuxeo.conf
 *
 * @param {String} file Path to the Nuxeo configuration file
 * @param {String[]} [keys] An array of the keys to read in this file (if undefined, all the values will be read)
 */ 
function read(file, keys) {
  var values = {},
    index,
    key,
    parts = fs.readFileSync(file).toString().split('\n');
  parts.forEach(function (d) {
    if (!d.match(/^ *(#|$)/)) {
      index = d.indexOf('=');
      key = d.slice(0, index++).trim();
      if (keys === undefined || keys.indexOf(key) != -1) {
        values[key] = d.slice(index).trim();      
      }
    }
  });
     
  return values;
}

//Check that all needed values are defined
function checkRequired(values, keys) {
  var i, undef = [];
  for (i = 0; i < keys.length; ++i) {
    if (!values[keys[i]]) {
      undef.push(keys[i]);
    }
  }  
  if (undef.length > 0) {
    throw new Error('Please define these values in nuxeo.conf: ' + undef.join(', '));
  }
}

//Merge the properties of 2 objects
function mergeSettings(obj, otherobj) {
  var name;
  for (name in otherobj) {
    if (!obj[name]) {
      obj[name] = otherobj[name];
    }
  }
}

//Remove sync files (workaround to the impossibility to unlink in real time working files generated by the execSync
//function in windows module)
function unlinkSyncFiles() {
  var basedir = path.dirname(__dirname),
    todelete = fs.readdirSync(basedir),
    i,
    file;
  for (i in todelete) {
    file = todelete[i];
    if (file.substr(0, 5) == 'sync0') {
      fs.unlinkSync(file);
    }
  }
}