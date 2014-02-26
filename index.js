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
  // grun(taskList)
  if(Array.isArray(workdirc))
    taskList.push.apply(taskList, workdirc), workdirc = null;
  // grun(workdirc, taskList)
  else if(Array.isArray(taskroot))
    taskList.push.apply(taskList, taskroot), taskroot = null;

  // normal mode
  // grun(configure)
  else if(configure == null && taskroot == null && typeof workdir != 'string')
    configure = workdirc, taskroot = null, workdirc = null;
  // grun(workdirc, configure)
  else if(configure == null && typeof taskroot != 'string')
    configure = taskroot, taskroot = null;

  this._cwd = process.cwd(), workdirc && process.chdir(workdirc);
  this._workdirc = workdirc || this._workdirc || process.cwd();
  _setupEventOptions();

  // package.json,tasks
  if(typeof taskroot == 'string') {
    taskroot = taskroot.split(',');
    // only "taskroot" specify
    if(taskroot.length == 1 && !/\.json$/.test(taskroot[0]))
      taskroot.unshift('');
  }

  this._packagef = taskroot && taskroot[0] || this._packagef || Default.Package;
  this._taskroot = taskroot && taskroot[1] || this._taskroot || Default.Tasks;

  if(taskList.length) // runTaskList with Loading
    return _runWithLoad([].concat(taskList));

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

  // File base read
  var pkgfile = argv.opts.config || runner._packagef;
  if(fs.existsSync(pkgfile))
    grunt.config(Const.GruntPkg, grunt.file.readJSON(pkgfile));

  // JavaScript object base read
  var pconf = grunt.config.get(Const.GruntPkg) || {};
  var tconf = _.extend({}, pconf.configure, runner.configure);
  for( var i in tconf)
    grunt.config.set(i, tconf[i]);

  // Load and Run Tasks
  // if error, execute tasks already in queue
  fs.readdir(taskroot, function(err, files) {
    _.assert('[grunt-runner] Task files are found: ' + files);
    err ? _runTask(): _runWithLoad(files);
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

  (grunt.event._all || []).indexOf(eventBridgeHandler) == -1
    && grunt.event.on(eventBridgeHandler);

  grunt.runner.on('_finish', function(taskname) {
    var runner = grunt.runner;
    taskname = _removeFromTaskList(taskname, true);
    if(runner._noerror !== true)
      return;
    _asynchronous(function() {
      runner.emit('finish', taskname);
    });
    runner._taskList.length == 0 && _asynchronous(function() {
      gruntInit(function() {
        runner.emit('end');
      });
    });
  });

  grunt.runner.on('_error', function(e, task) {

    var runner = grunt.runner;
    var taskname = typeof task == 'string' ? task: task && task.name;

    taskname = _removeFromTaskList(taskname, e);
    grunt.task.clearQueue(), _asynchronous(function() {
      gruntInit(function() {
        runner.emit('error', e, task);
      });
    });

  });

}

function gruntInit(callback) {
  _asynchronous(function() {
    var runner = grunt.runner;
    runner && process.chdir(runner._cwd), delete grunt.runner;
    callback && callback(runner);
  });
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

function _runTask(taskname) {
  var runner = grunt.runner;
  taskname && _sigOfNpm(taskname) ? _execNpmLoad(taskname): (function() {
    var taskr = path.join(runner._workdirc, runner._taskroot, taskname);
    try {
      fs.statSync(taskr).isDirectory() && grunt.loadTasks(taskr);
      grunt.task.run(taskname);
    } catch(e) {
      grunt.task.run(taskname);
      // ignore load error 
      // but it may occurs 'Task "[taskname]" not found.' error on runner.
    }
    _asynchronous(function() {
      runner.emit('start', [].concat(runner._taskList));
      grunt.task.start();
    });
  })();
}

function _runWithLoad(tasks) {
  var runner = grunt.runner;

  runner._taskList = grunt.config.get(Const.GruntPkg).taskList
    || (Array.isArray(tasks) ? tasks: Object.keys(tasks));
  _.assert('[grunt-runner] Task listed: ' + runner._taskList);

  // "_finish" is internal event for proceed.
  runner.on('_finish', nextTaskGroup);

  // execute first task
  var taskList = [].concat(runner._taskList);
  nextTaskGroup();

  function nextTaskGroup() {
    taskList.length !== 0 && _runTask(taskList.shift());
  }

}

function _execNpmLoad(taskanme) {
  var runner = grunt.runner;
  grunt.loadNpmTasks(taskanme.substr(4)), runner.emit('_finish', taskanme);
}

function _sigOfNpm(t) {
  return /^npm:$/i.test(t.substr(0, 4));
}

function _removeFromTaskList(taskname, finish) {

  var runner = grunt.runner, idx = runner._taskList.indexOf(taskname);
  if(runner._current) {// if Error occurs already.
    taskname = runner._current, finish && delete runner._current;
    return taskname;
  }

  finish !== true && (runner._noerror = finish);
  (idx === -1 ? function() {
    taskname = runner._taskList.shift();
  }: function() {
    runner._taskList.splice(idx, 1);
  })();
  return finish ? taskname: (runner._current = taskname);

}

function eventBridgeHandler() {
  var ee = grunt.runner, evt = this.event, task = grunt.task.current;
  var tnam = task.name.replace(/:.+$/, ''), args = _.toArray(arguments);
  _asynchronous(function() {
    args = [tnam + '.' + evt].concat(args);
    ee.emit.apply(ee, args), ee.emit('data', args);
  });
}
