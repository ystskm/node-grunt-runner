var nodeunit = require('nodeunit');
var grunt = require('../index');

module.exports = nodeunit.testCase({
  'run': function(t) {
    grunt(__dirname).on('end', function(){
      t.ok(true), t.done();
    });
  }
});
