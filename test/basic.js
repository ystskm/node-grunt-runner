var nodeunit = require('nodeunit');
var grun = require('../index');

var banner = '/*! <%= pkg.name %>'
  + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

var js_conf = {};

js_conf.pkg = {
  name: 'runner-test-raw',
  version: '1.0.0'
};

js_conf.concat = {
  options: {
    separator: ";"
  },
  dist: {
    src: ["src/*.js"],
    dest: "dist/<%= pkg.name %>.js"
  }
};

js_conf.uglify = {
  options: {
    banner: banner
  },
  dist: {
    files: {
      'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
    }
  }
};

module.exports = nodeunit.testCase({

  'notexist': function(t) {

    var taskList = ['notexist'];
    grun.initConfig(js_conf);

    grun.run(__dirname, taskList).on('error', function(e, task) {
      t.ok(e instanceof Error, 'notexist: First argument is Error.');
      t.equal(e.message, 'Task "notexist" not found.');
      t.strictEqual(task.name, null);
      grun.initConfig(), t.done();
    });

  },

  'loadnpm': function(t) {

    var taskList = ['npm:grunt-contrib-concat', 'concat'];
    grun.initConfig(js_conf);

    grun.run(__dirname, taskList).on('finish', function(taskname) {
      t.equal(taskname, taskList.shift()), console.log('finish ' + taskname)
    }).on('end', function() {
      t.ok(true, 'loadnpm');
      grun.initConfig(), t.done();
    });

  },

  'run': function(t) {
    grun(__dirname, js_conf).on('end', function() {
      t.ok(true, 'run');
      grun.initConfig(), t.done();
    });
  },

  'alias': function(t) {
    grun.run(__dirname, js_conf).on('end', function() {
      t.ok(true, 'alias');
      grun.initConfig(), t.done();
    });
  }

});
