# grunt-runner, grun

Support for executing grunt tasks.  
CLI operation is not required to use.

## Install

Install with [npm](http://npmjs.org/):
```sh
    npm install grunt-runner
```
## API - runs grunt tasks under "tasks" directory 
assume that directory exists just below executing script file
```js
    require('grunt-runner')(__dirname)
```
*,or use alias*
```js
    require('grunt-runner').run(__dirname)
```
### - example for running configuration
_Default: package.json_
```js
    {
      "name": "grunt-runner-test",
      "version": "0.1.0",
      "taskList": ["run"],
      "configure": {
      }
    }
```
####before example for Gruntfile.js, note that underscore is included.
This object is extended for running tasks.  
see: __lib/task-util.js__
```js
var _ = require('grunt-runner')._;
```
### - example for Gruntfile.js
in this case deploy in_ __"tasks/run"__ _directory
```js
module.exports = function(grunt) {
  grunt.registerTask('run', 'test for grunt-runner', function() {
          ...
  });
};
```
### - if you want add tasks more easily, use utilities
```js
var path = require('path'), fs = require('fs'), _ = require('grunt-runner')._;
var taskname = __dirname.split('/').pop(); // run

module.exports = function(grunt) {
  var tmes = 'Grunt Runner test: ' + taskname;
  grunt.registerTask(taskname, tmes, _.caught(function() {
    gruntRunnerTest(grunt, _.mixedConfigure(grunt, taskname), this);
  }, grunt.fail));
};

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

