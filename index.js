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
module.exports = gruntRunner, gruntRunner.run = gruntRunner;

function gruntRunner(workdirc, taskroot, configure) {
  if(!(this instanceof gruntRunner))
    return new gruntRunner(workdirc, taskroot, configure);
  if(workdirc && typeof workdirc != 'string')
    configure = workdirc, taskroot = null, workdirc = null;
  else if(workdirc && taskroot && typeof taskroot != 'string')
    configure = taskroot, taskroot = null;
  this._workdirc = workdirc || process.cwd();
  this._taskroot = taskroot || Default.Tasks;
  this.configure = configure || {};
  Emitter.call(this), this.start();
}
inherits(gruntRunner, Emitter);

var GRProtos = {
  start: start
}
for( var i in GRProtos)
  gruntRunner.prototype[i] = GRProtos[i];

function start() {
  var runner = grunt.runner = this;
  var workdirc = runner._workdirc, taskroot = runner._taskroot;
  process.chdir(workdirc), grunt.initConfig({
    pkg: grunt.file.readJSON(argv.opts.config || Default.Package),
  });

  var config = _.extend({}, grunt.config.get(Const.GruntPkg).configure,
    runner.configure);
  for( var i in config)
    grunt.config.set(i, config[i]);

  fs.readdir(taskroot, function(err, files) {
    files.forEach(function(taskd) {
      taskd = path.join(taskroot, taskd);
      fs.statSync(taskd).isDirectory() && grunt.loadTasks(taskd);
    });
    grunt.task.run(grunt.config.get(Const.GruntPkg).taskList);
    grunt.task.start();
  });
}
