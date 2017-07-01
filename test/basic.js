var nodeunit = require('nodeunit');
var grun = require('../index');
grun.set('debug', true);

var banner = '/*! <%= pkg.name %>'
  + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

var js_conf = {}, js_pkg = {
  pkg: {
    name: 'runner-test-basic',
    version: '1.0.0'
  }
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

var cnt = 0;
module.exports = nodeunit.testCase({

  'run': function(t) {
    // taskList value comes from "package.json".
    var taskList = ['concat-uglify', 'run'];
    grun(__dirname, js_conf).on('finish', function(taskname) {
      // (1, 2)
      t.equal(taskname, taskList.shift());
      t.ok(cnt++ < 2);
    }).on('end', function() {
      // (3)
      t.ok(true, 'run');
      t.equals(++cnt, 3), grun.initConfig(), t.done();
    });
  },

  'alias': function(t) {
    // taskList value comes from "package.json".
    var taskList = ['concat-uglify', 'run'];
    grun.run(__dirname, js_conf).on('finish', function(taskname) {
      // (4, 5)
      t.equal(taskname, taskList.shift());
      t.ok(cnt++ < 5);
    }).on('end', function() {
      // (6)
      t.ok(true, 'alias');
      t.equals(++cnt, 6), grun.initConfig(), t.done();
    });
  },

  'notexist': function(t) {
    var taskList = ['notexist'];
    grun.initConfig(grun._.extend(js_pkg, js_conf))(__dirname, taskList).on(
      'error', function(e, task) {
        // (7)
        t.ok(e instanceof Error, 'notexist: First argument is Error.');
        t.ok(e.message, 'Task "notexist" not found.');
        t.strictEqual(task.name, null);
        t.equals(++cnt, 7), grun.initConfig(), t.done();
      });
  },

  'loadnpm': function(t) {
    var taskList = ['npm:grunt-contrib-concat', 'concat'];
    grun.initConfig(grun._.extend(js_pkg, js_conf))(__dirname, taskList).on(
      'finish', function(taskname) {
        // (8, 9)
        t.equal(taskname, taskList.shift());
        t.ok(cnt++ < 9);
      }).on('end', function() {
      // (10)
      t.ok(true, 'loadnpm');
      t.equals(++cnt, 10);
      grun.initConfig(), t.done();
    });
  }

});
