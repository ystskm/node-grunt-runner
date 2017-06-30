/***/
var NULL = null, TRUE = true, FALSE = false;
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
gruntRunner.config = config;
gruntRunner.initConfig = initConfig;

function gruntRunner(workdirc, taskroot, configure) {

  if(!(this instanceof gruntRunner)) {
    return new gruntRunner(workdirc, taskroot, configure);
  }

  var gr = this;
  var taskList;

  Emitter.call(grunt.runner = gr);

  taskList = gr._taskList = [];
  gr._current = NULL;
  gr._noerror = TRUE;

  // simple mode
  // gr(taskList)
  if(isArray(workdirc)) {
    taskList.push.apply(taskList, workdirc), workdirc = NULL;
  }
  // gr(workdirc, taskList)
  else if(isArray(taskroot)) {
    taskList.push.apply(taskList, taskroot), taskroot = NULL;
  }

  // normal mode
  // gr(configure)
  else if(configure == NULL && taskroot == NULL && !is('string', workdir)) {
    configure = workdirc, taskroot = NULL, workdirc = NULL;
  }
  // gr(workdirc, configure)
  else if(configure == NULL && !is('string', taskroot)) {
    configure = taskroot, taskroot = NULL;
  }

  gr._cwd = process.cwd(), workdirc && process.chdir(workdirc);
  gr._workdirc = workdirc || gr._workdirc || process.cwd();
  _setupEventOptions();

  // package.json,tasks
  if(is('string', taskroot)) {
    taskroot = taskroot.split(',');
    // Only "taskroot" specify
    if(taskroot.length == 1 && !/\.json$/.test(taskroot[0])) {
      taskroot.unshift('');
    }
  }

  gr._packagef = taskroot && taskroot[0] || gr._packagef || Default.Package;
  gr._taskroot = taskroot && taskroot[1] || gr._taskroot || Default.Tasks;

  if(taskList.length) { // runTaskList with Loading
    return _runWithLoad([].concat(taskList));
  }

  gr.configure = configure || {};
  gr.start();

}
inherits(gruntRunner, Emitter);

each({
  start: start,
  gruntInit: gruntInit
}, function(k, func) {
  gruntRunner.prototype[k] = func;
});

function start() {

  var gr = this, taskroot = gr._taskroot;
  if(grunt.runner && grunt.runner !== gr) {
    throw new Error('Unexpected condition. Another runner is running?');
  }

  gr._current = NULL;
  gr._noerror = TRUE;

  // File base read
  var pkgfile = argv.opts.config || gr._packagef;
  if(fs.existsSync(pkgfile)) {
    grunt.config(Const.GruntPkg, grunt.file.readJSON(pkgfile));
  }

  // JavaScript object base read
  var pconf = grunt.config.get(Const.GruntPkg) || {};
  var tconf = extend({}, pconf.configure, gr.configure);
  each(tconf, function(k, v) {
    grunt.config.set(k, v);
  });

  // Load and Run Tasks
  // if error, execute tasks already in queue
  fs.readdir(taskroot, function(er, files) {
    _.assert('[grunt-runner] Task files are found: ' + files, taskroot, er);
    er ? _runTask(): _runWithLoad(files);
  });

}

function _setupEventOptions() {

  var gr;
  grunt.task.options({
    done: function() {

      log('DONE TASK:' + grunt.task.current.name);
      if(gr = grunt.runner) {
        gr.emit('_finish', grunt.task.current.name);
      }

    },
    error: function(e) {

      log('FAIL TASK:' + grunt.task.current.name);
      if(gr = grunt.runner) {
        gr.emit('_error', e, this);
      }

    }
  });

  var evt_a = grunt.event._all || [];
  if(evt_a.indexOf(eventBridgeHandler) == -1) {
    grunt.event.on(eventBridgeHandler);
  }

  grunt.runner.on('_finish', function(taskname) {

    var gr = grunt.runner;
    taskname = _removeFromTaskList(taskname, TRUE);
    if(gr._noerror !== TRUE) {
      return;
    }

    setImmediate(function() {
      gr.emit('finish', taskname);
    });

    log('FINISH TASK! remains:' + gr._taskList.length);
    if(gr._taskList.length != 0) {
      return;
    }

    log('ON_END');
    gruntInit(function() {
      gr.emit('end');
    });

  });

  grunt.runner.on('_error', function(e, task) {

    var gr = grunt.runner;
    var taskname = is('string', task) ? task: task && task.name;

    taskname = _removeFromTaskList(taskname, e);
    grunt.task.clearQueue();

    log('ON_ERROR');
    gruntInit(function() {
      gr.emit('error', e, task);
    });

  });

}

function gruntInit(callback) {
  setImmediate(function() {

    var gr = grunt.runner;
    if(gr) {
      process.chdir(gr._cwd);
    }
    delete grunt.runner;
    if(isFunction(callback)) {
      callback(gr);
    }

  });
}

function config(k, v) {
  if(k && is('object', k)) {
    each(k, function(k, v) {
      config(k, v);
    });
    return k;
  }
  return v ? grunt.config.set(k, v): grunt.config.get(k);
}

function initConfig(v) {
  return grunt.config.init(v || {}), gruntRunner;
}

function _loadIfDir(fp) {
  fs.statSync(fp).isDirectory() && grunt.loadTasks(fp);
}

function _runTask(taskname) {

  var gr = grunt.runner;
  if(taskname && _sigOfNpm(taskname)) {
    _execNpmLoad(taskname);
    return;
  }

  var taskr = path.join(gr._workdirc, gr._taskroot, taskname);
  try {
    _loadIfDir(taskr);
  } catch(e) {
    log('ignore loadTasks?(@_runTask)', e);
  }
  grunt.task.run(taskname);

  // Ignore load error 
  // but it may occurs 'Task "[taskname]" not found.' error on runner.
  setImmediate(function() {
    gr.emit('start', [].concat(gr._taskList));
    grunt.task.start();
  });

}

function _runWithLoad(tasks) {

  var gr = grunt.runner;
  var given = isArray(tasks) ? tasks: Object.keys(tasks);

  gr._taskList = grunt.config.get(Const.GruntPkg).taskList || given;
  (isArray(given) ? given: []).forEach(function(taskname) {
    var taskr = path.join(gr._workdirc, gr._taskroot, taskname);
    try {
      _loadIfDir(taskr);
    } catch(e) {
      log('ignore loadTasks?(@_runWithLoad)', e);
    }
  });

  log(JSON.stringify(grunt.config.get(Const.GruntPkg)));
  log('[grunt-runner] Task listed: ' + gr._taskList);

  // "_finish" is internal event for proceed.
  gr.on('_finish', nextTaskGroup);

  // execute first task
  var taskList = [].concat(gr._taskList);
  nextTaskGroup();

  function nextTaskGroup() {
    log('[grunt-runner] nextTaskGroup remains:' + taskList.length);
    taskList.length !== 0 && _runTask(taskList.shift());
  }

}

function _execNpmLoad(taskanme) {
  var gr = grunt.runner;
  grunt.loadNpmTasks(taskanme.substr(4));
  gr.emit('_finish', taskanme);
}

function _sigOfNpm(t) {
  return (/^npm:$/i).test(t.substr(0, 4));
}

function _removeFromTaskList(taskname, finish) {

  var gr = grunt.runner, idx = gr._taskList.indexOf(taskname);
  if(gr._current) {// if Error occurs already.
    taskname = gr._current;
    if(finish) delete gr._current;
    return taskname;
  }

  if(finish !== TRUE) {
    gr._noerror = finish;
  }

  (idx === -1 ? function() {
    taskname = gr._taskList.shift();
  }: function() {
    gr._taskList.splice(idx, 1);
  })();
  return finish ? taskname: (gr._current = taskname);

}

function eventBridgeHandler() {
  var ee = grunt.runner, evt = this.event, task = grunt.task.current;
  var tnam = task.name.replace(/:.+$/, ''), args = _.toArray(arguments);
  setImmediate(function() {
    args = [tnam + '.' + evt].concat(args);
    ee.emit.apply(ee, args), ee.emit('data', args);
  });
}

// --------------- //
function log() {
  return _.assert.apply(_, arguments);
}
function extend() {
  return _.extend.apply(_, arguments);
}
function each(obj, func) {
  for( var k in obj)
    func(k, obj[k]);
}
function is(ty, x) {
  return typeof x == ty;
}
function isFunction(x) {
  return is('function', x);
}
function isArray(x) {
  return Array.isArray(x);
}
