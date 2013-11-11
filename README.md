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
*then, note that process.chdir(__dirname) is performed*
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
in this case deploy in __"tasks/run"__ directory
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
var taskname = _.taskname(__dirname); // run

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

### - Of course available contrib-plugins in Gruntfile.js.
the most confortable way to construct a task.
```js
module.exports = function(grunt) {

  var bann = '/*! <%= pkg.name %>'
    + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

  grunt.config.set('concat', {
    options: {
      separator: ";"
    },
    dist: {
      src: ["src/*.js"],
      dest: "dist/<%= pkg.name %>.js"
    }
  });

  grunt.config.set('uglify', {
    options: {
      banner: bann
    },
    dist: {
      files: {
        'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('concat-uglify', ['concat', 'uglify']);

};
```


#### memo
I want to request some fixing of [grunt](http://gruntjs.org/) himself functionally but not yet.  
So that please use grunt-runner with some attention listed below:
- If same name is defined recursively, task is not ended forever
- Domain is not separated so that once changing your workspace, saved forever.
