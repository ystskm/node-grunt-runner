var nodeunit = require('nodeunit');
var grun = require('../index');

var banner = '/*! <%= pkg.name %>'
  + ' <%= grunt.template.today("dd-mm-yyyy") %> */\n';

var js_conf = {};
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
  'run': function(t) {
    grun(__dirname, js_conf).on('end', function() {
      t.ok(true, 'run'), t.done();
    });
  },
  'alias': function(t) {
    grun.run(__dirname, js_conf).on('end', function() {
      t.ok(true, 'alias'), t.done();
    });
  },
  'notexist': function(t) {
    grun.run(['notexist']).on('error', function(e, task) {
      t.ok(e instanceof Error, 'notexist: First argument is Error.');
      t.equal(e.message, 'Task "notexist" not found.');
      t.strictEqual(task.name, null);
      t.done();
    });
  }
});
