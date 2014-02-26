var nodeunit = require('nodeunit');
var grun = require('../index');

var banner = '/*! <%= pkg.name %>'
  + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

var js_conf = {}, js_pkg = {
  pkg: {
    name: 'runner-test-multi',
    version: '1.0.0'
  }
};

js_conf.concat = {
  options: {
    separator: ";"
  },
  BBB: {
    src: ["src/*1.js", "src/*0.js"],
    dest: "dist/<%= pkg.name %>_BBB.js"
  },
  AAA: {
    src: ["src/*0.js", "src/*1.js"],
    dest: "dist/<%= pkg.name %>_AAA.js"
  }
};

js_conf.uglify = {
  options: {
    banner: banner
  },
  dist: {
    files: {
      'dist/<%= pkg.name %>.min.js': ['<%= concat.BBB.dest %>']
    }
  }
};

var cnt = 0;
module.exports = nodeunit.testCase({

  'run': function(t) {
    var taskList = ['concat-uglify-concat', 'run'];
    grun.initConfig(grun._.extend(js_pkg, js_conf)).run(taskList).on('finish',
      function(taskname) {
        // (1, 2)
        t.equal(taskname, taskList.shift());
        t.ok(cnt++ < 2);
      }).on('end', function() {
      // (3)
      t.ok(true, 'run');
      t.equals(++cnt, 3);
      grun.initConfig(), t.done();
    });
  },

});
