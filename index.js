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

module.exports = gruntRunner;
gruntRunner._ = require('./lib/task-util');
gruntRunner.run = gruntRunner;

function gruntRunner(workdirc, taskroot) {
  if(!(this instanceof gruntRunner))
    return new gruntRunner(workdirc, taskroot);
  this._workdirc = workdirc || process.cwd();
  this._taskroot = taskroot || Default.Tasks;
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

  var config = grunt.config.get(Const.GruntPkg).configure || {};
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
