var nodeunit = require('nodeunit');
var grun = require('../index');

module.exports = nodeunit.testCase({
  'run': function(t) {
    grun(__dirname).on('end', function() {
      t.ok(true, 'run'), t.done();
    });
  },
  'alias': function(t) {
    grun.run().on('end', function() {
      t.ok(true, 'alias'), t.done();
    });
  }
});
