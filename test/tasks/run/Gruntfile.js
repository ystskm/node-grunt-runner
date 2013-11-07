/***/
var path = require('path'), fs = require('fs'), _ = require('../../../index')._;
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
