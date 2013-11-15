/***/
// node [plugin:grunt-runner]
var fs = require('fs'), path = require('path'), inherits = require('util').inherits, Emitter = require('events').EventEmitter;
var argv = require('named-argv'), grunt = require('grunt');

var Const = {
  GruntPkg: 'pkg'
};
var Default = {
  Tasks: 'tasks',
  Package: 'package.json'
};

var running = null;
var _ = gruntRunner._ = require('./lib/task-util');
module.exports = gruntRunner, gruntRunner.run = gruntRunner;

function gruntRunner(workdirc, taskroot, configure) {

  if(!(this instanceof gruntRunner))
    return new gruntRunner(workdirc, taskroot, configure);

  Emitter.call(grunt.runner = this);
  _setupEventOptions();

  if(Array.isArray(workdirc)) // runTaskList
    return _runTaskList(running = workdirc);

  if(workdirc && typeof workdirc != 'string')
    configure = workdirc, taskroot = null, workdirc = null;
  else if(workdirc && taskroot && typeof taskroot != 'string')
    configure = taskroot, taskroot = null;

  this._workdirc = workdirc || process.cwd();
  this._taskroot = taskroot || Default.Tasks;
  this.configure = configure || {};
  this.start();

}
inherits(gruntRunner, Emitter);

var GRProtos = {
  start: start
}
for( var i in GRProtos)
  gruntRunner.prototype[i] = GRProtos[i];

function start() {

  var runner = this;
  var workdirc = runner._workdirc, taskroot = runner._taskroot;
  process.chdir(workdirc), grunt.config(Const.GruntPkg, grunt.file
      .readJSON(argv.opts.config || Default.Package));

  var tconf = _.extend({}, grunt.config.get(Const.GruntPkg).configure,
    runner.configure);
  for( var i in tconf)
    grunt.config.set(i, tconf[i]);

  var tasks = {};
  fs.readdir(taskroot, function(err, files) {

    if(err)
      return _runTaskList(); // execute tasks already in queue

    files.forEach(function(taskd) {
      taskd = path.join(taskroot, taskd);
      fs.statSync(taskd).isDirectory() && (function() {
        tasks[_.taskname(taskd)] = taskd;
      })();
    });

    var taskList = grunt.config.get(Const.GruntPkg).taskList
      || Object.keys(tasks);

    // "_finish" is internal event for proceed.
    runner.on('_finish', nextTaskGroup);
    
    // execute first task
    nextTaskGroup();

    function nextTaskGroup() {

      if(taskList.length === 0)
        return _initGrunt(), runner.emit('end');

      var taskn = taskList.shift();
      if(!tasks[taskn])
        return nextTaskGroup();

      grunt.loadTasks(tasks[taskn]);
      running = taskn, _runTaskList([taskn]);

    }

  });
}

function _setupEventOptions() {

  grunt.task.options({
    done: function() {
      grunt.runner.emit('_finish', running);
    },
    error: function(e) {
      grunt.runner.emit('_error', e, this);
    }
  });

  grunt.runner.on('_finish', function(taskname) {
    grunt.runner.emit('finish', taskname);
  });
  grunt.runner.on('_error', function(e, task) {
    grunt.runner.emit('error', e, task);
  });

}

function _initGrunt() {
  running = null, delete grunt.runner;
}

function _runTaskList(taskList) {
  taskList && grunt.task.run(taskList);
  grunt.task.start();
}
