/***/
var path = require('path'), fs = require('fs'), _ = require('../../../index')._;
var taskname = _.taskname(__dirname); // events

module.exports = function(grunt) {
  var tmes = 'Grunt Runner javascript config use case: ' + taskname;
  grunt.registerMultiTask('ok_event', function() {
    grunt.event.emit('ok', this);
  });
  grunt.registerTask(taskname, ['ok_event:AAA', 'ok_event:BBB']);
};
