/***/
var path = require('path'), fs = require('fs'), _ = require('../../../index')._;
var taskname = _.taskname(__dirname); // concat-uglify

module.exports = function(grunt) {
  var tmes = 'Grunt Runner javascript config use case: ' + taskname;
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask(taskname, ['concat', 'uglify']);
};
