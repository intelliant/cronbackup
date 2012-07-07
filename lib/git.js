
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
  Command = require('./windows/Command').Command;

/**
 * Construct a 'Git' repository object.
 * This object wraps some basic commands of the stupid content tracker.
 * All these commands can then be executed like this:
 *   git.init();
 *   git.config(key, val);
 *   git.gc();
 *   git.checkout(id);
 *   git.diff(id);
 *   git.reset(id);
 *   git.show(id);
 *   git.add(filename);
 *   git.commit();
 *   git.revlist('--all');            
 *
 * @param {String} dir The path to the repository
 * @param {String} worktree The path to the working tree
 * @param {String} cmd Command to launch the git utility
 * @param {Object} [options] The repository options (@see the <a href="http://schacon.github.com/git/git-config.html">git-config Manual Page</a>)
 */ 
function Git(dir, worktree, cmd, options) {
  this.dir = dir;
  this.worktree = worktree;
     
  var i,
    name,
    val,
    c = [ 'init', 'config', 'gc', 'checkout', 'diff', 'reset', 'show', 'add', 'commit', 'rev-list' ];
    
  for (i = 0; i < c.length; ++i) {
    name = c[i].replace('-', '');
    this[name] = new Command('"' + cmd + '" --git-dir="' + dir + '" --work-tree="' + worktree + '" ' + c[i], name,
      function (s) { return s.trim(); });
  }
  
  if (!fs.existsSync(path.dirname(dir))) {
    fs.mkdirSync(dir);
  }
  
  this.init();  
  
  if (options) {  
    for (key in options) {
      val = options[key];
      if (val) {
        this.config(key, val);  
      }
    }
  }
  
  /**
   * Get the path of a file relative with regard to the repository root
   *  
   * @return {Object} A commit object or undefined if no head commit has been found
   */ 
  this.relativePath = function (file) {
    return '"' + path.relative(this.worktree, file) + '"';
  };
  
  /**
   * Get the current head commit
   *  
   * @return {Object} A commit object or undefined if no head commit has been found
   */ 
  this.head = function () {
    var list = this.commits('-n 1 head');
    if (list.length == 0) {
      return undefined;
    }
    return list[0];
  };
  
  /**
   * Get a list of all the commit objects in reverse chronological order
   *  
   * @return {Object[]} An array of objects
   */ 
  this.commits = function (options) {
    options = options || '--all';
    var i,
      list = [],
      id = '',
      lines = this.revlist('--abbrev-commit --format="%ci"', options).split(/\r?\n/g);
  
    for (i in lines) {
      if (i % 2) {
        list.push({ id: id, date: lines[i].substr(0, 16) });  
      } else {
        if (lines[i].substr(0, 6) != 'commit') {
          break;
        }
        id = lines[i].substr(7);
      }    
    }
    return list;
  };
  
  /**
   * Get a specific commit object
   *  
   * @param {String} id The name of the commit
   * @return {Object} A commit object or undefined if no commit has been found with this name
   */ 
  this.commitFromId = function (id) {
    var list = this.commits(id);
    if (list.length == 0 || list[0].id != id) {
      return undefined;
    }  
    return list[0];
  };
}

module.exports = function (dir, worktree, cmd, options) {
  return new Git(dir, worktree, cmd, options);
};
