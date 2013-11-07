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
  this._workdirc = workdirc, this._taskroot = taskroot || Default.Tasks;
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
  grunt.initConfig({
    pkg: grunt.file.readJSON(argv.opts.config
      || path.join(workdirc, Default.Package)),
  });
  fs.readdir(path.join(workdirc, taskroot), function(err, files) {
    files.forEach(function(taskd) {
      taskd = path.join(workdirc, taskroot, taskd);
      fs.statSync(taskd).isDirectory() && grunt.loadTasks(taskd);
    });
    grunt.task.run(grunt.config.get(Const.GruntPkg).taskList);
    grunt.task.start();
  });
}
