/***/
var path = require('path'), fs = require('fs'), _ = require('../../../index')._;
var taskname = _.taskname(__dirname); // concat-uglify

module.exports = function(grunt) {

  var tmes = 'Grunt Runner javascript config use case: ' + taskname;
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
  grunt.registerTask(taskname, ['concat', 'uglify']);

};
