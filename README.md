# grunt-runner

Support for execute grunt task easier.  
This module is not required CLI.

## Install

Install with [npm](http://github.com/isaacs/npm):

    npm install grunt-runner
    
## API - runs grunt tasks under "tasks" directory which is just below

    var gruntr = require('grunt-runner');
    gruntr(__dirname);

### - example for running configuration
_Default: package.json_

    {
      "name": "grunt-runner-test",
      "version": "0.1.0",
      "taskList": ["run"],
      "configure": {
      }
    }

####before example for Gruntfile.js, attention that underscore is included.
This object is extended for running tasks.  
see: __lib/task-utin.js__
    
    var _ = require('grunt-runner')._;
    
### - example for Gruntfile.js
_in this case deploy in __"tasks/run"__ directory_

	module.exports = function(grunt) {
	  grunt.registerTask('run', 'test for grunt-runner', function() {
              ...
	  });
	};

### - if you want add tasks more easily, use utilities
```js
var path = require('path'), fs = require('fs'), _ = require('grunt-runner')._;
var taskname = __dirname.split('/').pop(); // run

function gruntRunnerTest(grunt, conf, gtask) {

  var line = [], done = gtask.async(), stop = function(e) {
    grunt.fail.fatal(e);
  }, log = function(m) {
    _.util.log('[' + gtask.name + '] ' + m);
  };

  line.push(function() {
    log('done.'), done();
    grunt.runner.emit('end');
  });

  _.micropipe(line);

}
```

