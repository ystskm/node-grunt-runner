# grunt-runner
  
[![Rank](https://nodei.co/npm/grunt-runner.png?downloads=true&amp;downloadRank=true&amp;stars=true)](https://nodei.co/npm/grunt-runner/)  
  
[![Version](https://badge.fury.io/js/grunt-runner.png)](https://npmjs.org/package/grunt-runner)
[![Build status](https://travis-ci.org/ystskm/node-grunt-runner.png)](https://travis-ci.org/ystskm/node-grunt-runner)  
  
Support for pipeline execution of grunt tasks.  
CLI operation is not required to use.

## Install

Install with [npm](http://npmjs.org/):
```sh
npm install grunt-runner
```

## API - simplest running  
```js
// Let's run the regist(Multi)Task()-ed tasks 'concat' and 'uglify'
require('grunt-runner')(['concat', 'uglify']);
```
*e.g.*
```js
var gr = require('grunt-runner');
gr.initConfig({
  pkg: { name:"grunt-runner-test" },
  concat: { /*(concat's config)*/ },
  uglify: { /*(uglify's config)*/ }
}).run([
  'npm:grunt-contrib-concat'  // grunt.loadNpmTasks('grunt-contrib-concat')
, 'npm:grunt-contrib-uglify'  // grunt.loadNpmTasks('grunt-contrib-uglify')
, 'concat', 'uglify']);
```

## API - runs and pipe tasks under "tasks" directory 
assume that directory exists just below executing script file
```js
  runner = require('grunt-runner')([rootdir][,taskdir][,comconf])
```
*,or use alias*
```js
  runner = require('grunt-runner').run([rootdir][,taskdir][,comconf])
```
*,then debug mode*
```js
  gr = require('grunt-runner'); gr.set('debug', true); // use 'trace' for more detail.
  runner = gr.run([rootdir][,taskdir][,comconf])
```
  
###Arguments  
__rootdir__ (String) `process.cwd()` optional  
The working place for this runner. process.chdir(rootdir) is performed before begin.  
  
__taskdir__ (String) `'tasks'` optional  
The directory where tasks used in for this runner.  
Note that if you want to specify __taskdir__ but not specify __rootdir__, please set `null` for the first argument.  
  
__comconf__ (Object) `{}` optional  
The configuration for each tasks.  
e.g. { "taskname": { (grunt task configuration) } }
  
###Event
A runner is an instance of EventEmitter.  
  
type `finish`  
Emit when end for each task.  
```js
runner.on('finish', function(taskname) { ... })  
```
  
type `error`  
Emit when error occurs.  
If no handler is binded, the error will be thrown as you know.  
```js
runner.on('error', function(e, taskstat) { ... })  
```

type `end`  
Emit when all in "taskList" are ended.  
```js
runner.on('end', function() { ... })  
```

type `(taskname).(eventname)`
All of `grunt.event.emit` event will pass runner as this each type.  
When you executing `(taskname):(tag)` task, `:(tag)` will be ignored.  
e.g.  
In taskname "hoge"'s Gruntfile.js
```js
grunt.event.emit('ok', 1, 2, 3);
```
You can catch the event by runner.on
```js
runner.on('hoge.ok', function() { console.log(arguments) }) // [1, 2, 3]
```
You can also catch this event for type `data`.
```js
runner.on('data', function(d) { console.log(d) }) // ['hoge.ok', 1, 2, 3]
```
  
### - example for running configuration
Default reading target: *package.json*  
```js
{
  "name": "grunt-runner-test",
  "version": "1.0.0",
  "taskList": ["run"],
  "configure": {
  }
}
```
You can change the *target_file_name* via `argv` or specify in **taskdir**
```js
node main.js --config=package-alias.json
```
,or
```js
require('grunt-runner').run(rootdir, 'package-alias.json')
```
In **taskdir**, you can specify *task_directory* and *target_file_name*, both or either with using comma ",".  
e.g. `taskgroup.json,tasks`, `taskgroup.json`, `tasks`  
The value will be treated as a *target_file_name* when `.json` is found at the last of the value.  
  
__This file is not required. If not provide (and the "taskList" is not provided, )__  
(1) Tasks are listed up by the directory list in `taskdir`.  
(2) If tasks are listed, run the tasks.  
(3) If no task is discovered, grunt.start() is simply called. Then tasks which
are already grunt.regist(Multi)Task()-ed are started.  
  
#### before example for Gruntfile.js, note that underscore is included.
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
  var line = [], done = gtask.async();
  line.push(function() {
    grunt.log.writeln('[' + gtask.name + '] done.'), done();
  });
  _.micropipe(line);
}
```

### - of course, available "[Grunt Plugins](http://gruntjs.com/plugins)" in Gruntfile.js!
*The most comfortable way to construct a task.*
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

### - task config can be pre-given not only via package.json but also as an execute option
```js
{
  "name": "grunt-runner-test",
  "version": "1.0.0",
  "taskList": ["run"],
  "configure": {
    "concat": {
      "banner": "/*! <%= pkg.name %> <%= grunt.template.today(\"dd-mm-yyyy\") %> */\\n"
    }
  }
}
```
*same configuration can be given at the time of run*
```js
require('grunt-runner')({
  pkg: {
    name: 'grunt-runner-test',
    version: '1.0.0',
    taskList: ['run']
  },
  concat: {
    banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
  }
});
```
then, Gruntfile.js will be very smart.
```js
var taskname = require('grunt-runner')._.taskname(__dirname); // get directory name
module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask(taskname, ['concat', 'uglify']);
};
```

#### memo
I want to request some fixing of [grunt](http://gruntjs.org/) himself functionally but not yet.  
So that please use grunt-runner with paying some attention listed below:
- If same name is defined recursively, task is not ended forever
- "grunt.fail.fatal" method is evil because this method is disappear the error thrown. Please throw error simply if you want to finish the task.
- "node_modules" requires at the root of your project directory for loadNpmTasks  
  
If you know the way to avoid them by the function (or option) of grunt,
let [me](http://liberty-technology.biz/) know, please.

