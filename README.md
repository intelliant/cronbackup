[![build status](https://secure.travis-ci.org/intelliant/cronbackup.png)](http://travis-ci.org/intelliant/cronbackup)
Nuxeo Cron Backup
=================

This is a node.js application I have developed to backup [Nuxeo 5.5 open source
Enterprise Content Management system](http://www.nuxeo.com).
At the moment the target system is Windows but adapting it to Linux or OSX
should be an easy task.

The application periodically commits all Nuxeo data to a local Git repository
and is able to restore a specific revision to the disk without having to restart
Nuxeo server (at least it may be necessary that you disconnect to refresh the
application cache). All you have to do is to click on the "Restore" button.  

Install
-------

Install [Node 0.6.X](http://nodejs.org/#download) then:

    npm install cronbackup
     
You also need to download and install [Git for Windows](http://code.google.com/p/msysgit/downloads/list).
If it's installed in the default folder (C:\Program Files (x86)\Git), the
application will manage to find it itself, otherwise you will have to enter the
full path to `cmd/git.cmd` in the `settings.json` configuration file (search
`git.cmd` field).
    
Usage
-----

If you accepted all the default settings when you installed Nuxeo, all you have
to do is to run the Express application:

    node app

If all goes well, you're ready to visit your backup application at:

    http://localhost:3000
  

The Web interface is pretty simple. It shows a list of the different backup
versions available. You can click on an item to see some more details and to
restore it to the disk.

Configuration
-------------

All available configuration options can be found in `settings.json`:

* `cron.data` -- cron time pattern for Nuxeo data backup
* `cron.program` -- cron time pattern for Nuxeo program backup 
* `port` -- Bind the app server to the given port
* `auth` -- HTTP basic authentication user name and password
* `git.cmd` -- Command to use in order to launch the stupid content tracker
* `git.dir` -- Base path to the repositories
* `git.config` -- Git repository options
* `nuxeo.regkey` -- Windows registry key where to read Nuxeo configuration values
* `nuxeo.configfile` -- Path to nuxeo.conf file
* `nuxeo.vardir` -- Path to Nuxeo Program Data
* `nuxeo.path` -- Path to Nuxeo program
* `nuxeo.datadir` -- Path to Nuxeo data folder
* `nuxeo.logdir` -- Path to Nuxeo logs folder
* `nuxeo.requiredParam` -- A config error is thrown if this array values are not set in nuxeo.conf
* `nuxeo.dumpfile` -- Path to database dump file (must be somewhere in Nuxeo Program Data folder)
* `db.regkey` -- Windows registry key where to read Postgresql configuration values
* `db.dump` -- Command to use in order to launch the pg_dump utility 
* `db.restore` -- Command to use in order to launch the pg_restore utility
* `db.host` -- Nuxeo database host URL
* `db.port` -- Nuxeo database host port
* `db.name` -- Nuxeo database name
* `db.user` -- Nuxeo database user name
* `db.password` -- Nuxeo database password
* `db.pgpass` -- Path to database password file
* `log` -- Logging configuration (see [log4js documentation](https://github.com/nomiddlename/log4js-node)).

To customize the Cron Patterns, see this [documentation](http://help.sap.com/saphelp_xmii120/helpdata/en/44/89a17188cc6fb5e10000000a155369/content.htm).
(`00 30 22 * * 2-6` means that a backup will run from Monday through Friday at 22:30:00).  

Testing
-------

To come.

License
---------- 

(The MIT License)

Copyright (c) 2012 F. Viaud-Murat &lt;info@intelliant.fr&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.