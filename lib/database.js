
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
  execSync = require('./windows/Command').execSync;

/**
 * Construct a 'Postgresql' database object.
 * This object wraps database dump & restore commands.
 * It also takes care of the database password file.  
 *
 * @param {Object} config
 * @param config.host Database host URL
 * @param config.port Database host port 
 * @param config.name Database name
 * @param config.user Database username
 * @param config.password Database password
 * @param config.dump_cmd Command to launch the pg_dump utility
 * @param config.restore_cmd Command to launch the pg_restore utility
 * @param config.pgpass Location of database password file (allowing automatic administration tasks)
 */ 
function Postgresql(config) {
  var host = config.host,  
    port = config.port,  
    name = config.name,  
    user = config.user,  
    password = config.password,
    dump_cmd = config.dump,
    restore_cmd = config.restore,
    pgpass = config.pgpass;
      
  /**
   *  Extract a PostgreSQL database into a script file or other archive file.  
   *
   * @param file Send output to the specified file
   * @param [format="custom"] Select the format of the output (plain, custom or tar)
   * @return {String} The output of the pg_dump commandline utility
   */ 
  this.dump = function (file, format) {
    format = format || 'custom';
    this.writePass();                                                                             
    return execSync('"' + dump_cmd + '"',
      '--file="' + file + '"',
      '--format=' + format,
      '--host=' + host,
      '--port=' + port,
      '--username=' + user,
      name);
  };
  
  /**
   *  Restore a PostgreSQL database from an archive file created by pg_dump.  
   *
   * @param file The location of the archive file to be restored
   * @return {String} The output of the pg_restore commandline utility
   */ 
  this.restore = function (file) {
    this.writePass();                                                                           
    return execSync('"' + restore_cmd + '"',
      '--clean',
      '--dbname=' + name,
      '--host=' + host,
      '--port=' + port,
      '-U ' + user,
      '"' + file + '"');
  };

  /**
   *  Check Postgresql password file and write it to disk if necessary.
   *  This file contains the password needed to connect to database as a user, allowing automating routine
   *  administration tasks through mechanisms like cron. Lines should follow this format:
   *  hostname:port:database:username:password  
   *  See http://www.postgresql.org/docs/8.4/static/libpq-pgpass.html).
   */ 
  this.writePass = function () {
    var data = '',
      isDataOK = false,
      fields = host + ':' + port + ':' + name + ':' + user + ':' + password;   
    if (fs.existsSync(pgpass)) {
      data = fs.readFileSync(pgpass).toString();
    }
    if (data == '') {
      data = fields;
    } else {
      isDataOK = (data.search(fields) != -1);
      if (!isDataOK) {
        data += '\r\n' + fields;
      }
    }
    if (!isDataOK) {
      console.log('Adding a line to ' + pgpass + '...');
      fs.writeFileSync(pgpass, data);
    }    
  };
}

module.exports = function (config) {
  return new Postgresql(config);
};
