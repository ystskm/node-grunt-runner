var nodeunit = require('nodeunit');
var grun = require('../index');

var banner = '/*! <%= pkg.name %>'
  + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

var js_conf = {}, js_pkg = {
  pkg: {
    name: 'runner-test-event',
    version: '1.0.0'
  }
};

js_conf.ok_event = {
  options: {},
  BBB: {},
  AAA: {}
};

var cnt = 0;
module.exports = nodeunit.testCase({

  'run': function(t) {

    var taskList = ['events', 'run'];
    var nameArgs = ['ok_event:AAA', 'ok_event:BBB'];

    var gr = grun.initConfig(grun._.extend(js_pkg, js_conf)).run(taskList);
    gr.on('ok_event.ok', function(task) {
      // (1, 2)
      t.equals(task.nameArgs, nameArgs[cnt]);
      t.ok(cnt++ < 4);
    }).on('finish', function(taskname) {
      // (3, 4)
      t.equal(taskname, taskList.shift());
      t.ok(cnt++ < 4);
    }).on('end', function() {
      // (5)
      t.ok(true, 'run');
      t.equals(++cnt, 5);
      grun.initConfig(), t.done();
    });

  },

});
