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

var _ = gruntRunner._ = require('./lib/task-util');
module.exports = gruntRunner;

// static methods
gruntRunner.run = gruntRunner;
gruntRunner.config = config, gruntRunner.initConfig = initConfig;

function gruntRunner(workdirc, taskroot, configure) {

  if(!(this instanceof gruntRunner))
    return new gruntRunner(workdirc, taskroot, configure);

  Emitter.call(grunt.runner = this);

  var taskList = this._taskList = [];
  this._current = null, this._noerror = true;

  // simple mode
  if(Array.isArray(workdirc))
    taskList.push.apply(taskList, workdirc), workdirc = null;
  else if(Array.isArray(taskroot))
    taskList.push.apply(taskList, taskroot), taskroot = null;

  // normal mode
  else if(workdirc && typeof workdirc != 'string')
    configure = workdirc, taskroot = null, workdirc = null;
  else if(workdirc && taskroot && typeof taskroot != 'string')
    configure = taskroot, taskroot = null;

  this._cwd = process.cwd(), workdirc && process.chdir(workdirc);
  _setupEventOptions();

  if(taskList.length) // runTaskList
    return _runTaskList([].concat(taskList));

  this._workdirc = workdirc || process.cwd();
  this._taskroot = taskroot || Default.Tasks;
  this.configure = configure || {};
  this.start();

}
inherits(gruntRunner, Emitter);

var GRProtos = {
  start: start,
  gruntInit: gruntInit
};
for( var i in GRProtos)
  gruntRunner.prototype[i] = GRProtos[i];

function start() {

  var runner = this, taskroot = runner._taskroot;
  if(grunt.runner && grunt.runner !== runner)
    throw new Error('Unexpected condition. Another runner is running?');

  runner._current = null, runner._noerror = true;
  grunt.config(Const.GruntPkg, grunt.file.readJSON(argv.opts.config
    || Default.Package));

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

    runner._taskList = grunt.config.get(Const.GruntPkg).taskList
      || Object.keys(tasks);

    // "_finish" is internal event for proceed.
    runner.on('_finish', nextTaskGroup);

    // execute first task
    var taskList = [].concat(runner._taskList);
    nextTaskGroup();

    function nextTaskGroup() {

      if(taskList.length === 0)
        return;

      var taskn = taskList.shift();
      if(!tasks[taskn])
        return nextTaskGroup();

      grunt.loadTasks(tasks[taskn]);
      _runTaskList([taskn]);

    }

  });
}

function _setupEventOptions() {

  grunt.task.options({
    done: function() {
      grunt.runner.emit('_finish', grunt.task.current.name);
    },
    error: function(e) {
      grunt.runner.emit('_error', e, this);
    }
  });

  grunt.event.on('*', function() {
    var ee = grunt.runner, evt = this.event, task = grunt.task.current;
    var tnam = task.name.replace(/:.+$/, '');
    var args = [task.name + '.' + evt].concat(_.toArray(arguments));
    _asynchronous(function() {
      ee.emit.apply(ee, args);
    });
  });
  grunt.runner.on('_finish', function(taskname) {
    var runner = grunt.runner;
    taskname = _removeFromTaskList(taskname, true);
    _asynchronous(function() {
      runner.emit('finish', taskname);
    });
    runner._taskList.length == 0 && _asynchronous(function() {
      gruntInit(), runner._noerror && runner.emit('end');
    });
  });
  grunt.runner.on('_error', function(e, task) {
    var runner = grunt.runner, taskname = task && task.name;
    taskname = _removeFromTaskList(taskname);
    _asynchronous(function() {
      runner.emit('error', e, task);
    });
  });

}

function gruntInit() {
  var runner = grunt.runner;
  runner && process.chdir(runner._cwd);
  delete grunt.runner;
}

function config(k, v) {
  if(k && typeof k == 'object') {
    for( var i in k)
      config(i, k[i]);
    return k;
  }
  return v ? grunt.config.set(k, v): grunt.config.get(k);
}

function initConfig(v) {
  return grunt.config.init(v || {}), gruntRunner;
}

function _asynchronous(fn) {
  _.processor(fn); // force asynchronous for event bind.
}

function _runTaskList(taskList) {
  taskList && grunt.task.run(_execNpmLoad(taskList));
  grunt.task.start();
}

function _execNpmLoad(taskList) {
  var runner = grunt.runner, ret = [];
  taskList.forEach(function(t) {
    var is_load_task = /^npm:$/i.test(t.substr(0, 4));
    is_load_task ? (function() {
      grunt.loadNpmTasks(t.substr(4)), runner.emit('_finish', t);
    })(): ret.push(t);
  });
  return ret;
}

function _removeFromTaskList(taskname, finish) {

  var runner = grunt.runner, idx = runner._taskList.indexOf(taskname);
  if(runner._current) {// if Error occurs already.
    taskname = runner._current, finish && delete runner._current;
    return taskname;
  }

  !finish && (runner._noerror = false);
  (idx === -1 ? function() {
    taskname = runner._taskList.shift();
  }: function() {
    runner._taskList.splice(idx, 1);
  })();
  return finish ? taskname: (runner._current = taskname);

}
