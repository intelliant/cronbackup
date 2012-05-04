
/*!
 * Nuxeo Cron Backup
 * Copyright(c) 2012 F. Viaud-Murat <info@intelliant.fr>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var path = require('path'),
  CronJob = require('cron').CronJob;

/**
 * Module logger.
 */
  
var log;

/**
 * Construct a 'Backup' object.
 * This object is a simplified interface to the underlying repository basic operations.
 * It allows to run file & folder periodical backup operations at certain times or dates. 
 *
 * @param {Object} config
 * @param {Object} config.git (@see Git) 
 * @param {String} [config.cron] Cron pattern (@see <a href="http://help.sap.com/saphelp_xmii120/helpdata/en/44/89a17188cc6fb5e10000000a155369/content.htm">the definition</a>)  
 * @param {Function} [config.beforebackup] Callback function to execute before proceeding to backup
 * @param {Function} [config.afterrestore] Call back function to execute after restoring a backup
 * @param {String[]} [config.files] An arrray of files to backup
 */ 
function Backup(config) {
  var git = config.git,
    cron = config.cron,
    beforebackup = config.beforebackup,
    afterrestore = config.afterrestore,
    files = config.files || [];
    
  /**
   * Add all the files and commit all of them to the repository.
   * If the files array is empty, it adds all the working tree to the Git repository
   */   
  this.run = function () {
    var i,
      file,
      result;
    log.info('Proceeding to %s backup...', git.worktree);       
    if (beforebackup) {
      beforebackup();
    }            
    if (!files || files.length == 0) {
      git.add('--all');             
    } else {
      for (i in files) {
        file = git.relativePath(files[i]);
        log.trace('Adding %s...', file);       
        git.add('--all', file);       
      }    
    }
    result = git.commit('-m "Nuxeo automatic backup"');
    log.trace(result);    
    log.info('Cleaning up and optimizing...');       
    git.gc();
    log.info('Done.');       
  };
  /**
   * Restore a specific commit to the working tree and make it the repository head in detached mode
   * (@see the <a href="http://schacon.github.com/git/git-checkout.html">git-checkout Manual Page</a>).
   *
   * @param {String} id The name of the commit to restore
   * @return {String} The output of the git-checkout command
   */ 
  this.restore = function (id) {
    var result;
    log.info('Restoring %s commit...', id);       
    result = git.checkout(id);
    log.trace(result);    
    if (afterrestore) {
      afterrestore();
    }            
    log.info('Done.');
    return result;
  };
  /**
   * Get a list of all the commit objects in reverse chronological order
   *  
   * @return {Object[]} An array of objects
   * @see Git#commits
   */ 
  this.list = function () {
    return git.commits();
  };
  /**
   * Get a specific commit object
   *  
   * @param {String} id The name of the commit
   * @return {Object} A commit object or undefined if no commit has been found with this name
   * @see Git#commitFromId
   */ 
  this.get = function (id) {
    return git.commitFromId(id);
  };
  /**
   * Get the current head commit
   *  
   * @return {Object} A commit object or undefined if no head commit has been found
   * @see Git#head
   */ 
  this.head = function () {
    return git.head();
  };
  /**
   * Show changes between the head commit commit and working tree
   *  
   * @return {String} The output of the git-diff command
   * (@see the <a href="http://schacon.github.com/git/git-diff.html">git-diff Manual Page</a>).
   */ 
  this.diff = function (id) {
    return git.diff('--name-only ' + id);
  };
  // Add a file to the next batch
  this.add = function (file) {
    files.push(file);
  };
  // Create a "CronJob" object
  this.cronjob = cron ? new CronJob(cron, this.run, null, true) : undefined;
}
  
module.exports = function (config, logger) {
  log = logger;
  return new Backup(config);
};
