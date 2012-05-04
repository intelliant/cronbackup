/*
 * List, view and update commit page.
 */

exports.list = function (req, res) {
  var type = req.params.type === undefined ? 'data' : req.params.type,
    backup = res.app.settings.backup[type];
  res.render('commits/list', {
    type: type,
    title: type == 'program' ? 'Nuxeo Program' : 'Nuxeo Data',
    list: backup.list(),
    head: backup.head()
  });    
};
  
exports.view = function (req, res, next) {
  var commit,
    type = req.params.type,
    id = req.params.id,
    backup = res.app.settings.backup[type];
  if (id) {
    commit = backup.get(id);
  }
  if (commit !== undefined) {
    res.render('commits/view', {
      command: '',
      type: type,
      title: type == 'program' ? 'Nuxeo Program' : 'Nuxeo Data',
      commit: commit,
      diff: backup.diff(id).split(/\r?\n/g)
    });    
  } else {
    next(new Error('Cannot find commit ' + id));  
  }
};
  
exports.update = function (req, res, next) {
  var commit,
    result,
    type = req.params.type,
    id = req.params.id,
    command = req.body.command,
    backup = res.app.settings.backup[type];
  
  if (id) {
    commit = backup.get(id);
  }
  
  if (command != 'checkout')  {
    next(new Error('The application only supports checkout commands yet!'));  
  } else if (commit === undefined)  {
    next(new Error('Cannot find commit ' + id));  
  } else {
    //Always saving current working files before trying to restore an old commit
    backup.run();
    
    //Restore commit
    result = backup.restore(id);                       
    
    res.render('commits/update', {
      command: command,
      type: type,
      title: type == 'program' ? 'Nuxeo Program' : 'Nuxeo Data',
      commit: commit,
      head: backup.head(),
      diff: backup = backup.diff(id).split(/\r?\n/g)
    });    
  }  
};
