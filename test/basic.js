var nodeunit = require('nodeunit');
var grunt = require('../index');

module.exports = nodeunit.testCase({
  'run': function(t) {
    grunt(__dirname).on('end', function(){
      t.ok(true, 'run'), t.done();
    });
  },
  'alias': function(t) {
    grunt.run(__dirname).on('end', function(){
      t.ok(true, 'alias'), t.done();
    });
  }
});
