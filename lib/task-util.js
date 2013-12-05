/***/
var path = require('path'), fs = require('fs'), util = require('util');
var assert = require('assert'), platform = require('os').platform();

var _ = require('underscore');
var micropipe = require('micro-pipe'), eventDrive = require('event-drive'), timecalc = require('time-calc');

var processor = typeof setImmediate == 'function' ? setImmediate: function(fn) {
  process.nextTick(fn);
};

module.exports = _.extend(_, {

  // expose
  pwd: process.cwd(),
  platform: platform,
  util: util,
  processor: processor,
  micropipe: micropipe,
  eventDrive: eventDrive,
  timecalc: timecalc,
  next: next,

  // utilities
  taskname: taskname,
  caught: caught,
  thousandSep: thousandSep,
  archiveExt: archiveExt,
  npmLink: npmLink,
  assert: 'DEBUG_MODE' in process.env ? extendedAssert: function() {
  },

  // grunt utilities
  mixedConfigure: mixedConfigure,
  requires: requires,

  // file actions - using eventDrive
  download: download,
  decompress: decompress,
  // use node fs
  rmkdir: rmkdir, // recursive -f mkdir
  mkdir: mkdir,
  symlinkd: symlinkd,
  symlinkf: symlinkf,

  // command bridges
  decompressc: decompressc

});

function next(a) {
  return _.toArray(a).pop();
}

function taskname(dir) {
  var name = dir.split('/').pop();
  if(/^\d+$/.test(name.split('.')[0])) // for directory ordering prefix
    name = name.split('.').slice(1).join('.');
  return name;
}

function caught(fn, std) {
  return function() {
    try {
      fn.apply(this, arguments);
    } catch(e) {
      if(!std)
        throw e;
      if(typeof std == 'function')
        return std(e);
      std.fatal ? std.fatal(e): std.error(e);
    }
  }
}

function thousandSep(s) {

  s = s.toString();
  if(s.replace(/\d|\./g, '').length)
    return 'NaN';

  s = s.split('.');
  var nat = s[0], dec = s[1];
  var rem = nat.substr(0, nat.length % 3), rlen = rem.length;
  var bdy = nat.substr(rlen).split(/\d{3}/).slice(0, -1).map(function(v, i) {
    return nat.substr(rlen + i * 3, 3);
  }).join(',');
  return (rlen ? rem + (bdy.length ? ',': ''): '') + (bdy || '')
    + (dec ? '.' + dec: '')

}

function archiveExt() {
  return platform === 'win32' ? '.zip': '.tgz';
}

function mixedConfigure(grunt, taskname, mix_config) {

  var conf = (grunt.config.get('pkg') || {}).configure || {};
  var stock = taskname.split('-'), namea = [], names = '', mixed = {};

  while(stock.length) {

    namea.push(stock.shift()), names = namea.join('-');
    conf[names] = _.extend({}, conf[names]);

    mix_config && _.extend(conf[names], grunt.config(names));
    _.extend(mixed, conf[names]);

  }

  return mixed;

}

function requires(grunt, target, checks) {

  var failProps = null;
  checks = [].concat(checks);

  var p = grunt.util.pluralize;
  var msg = 'Verifying propert' + p(checks.length, 'y/ies') + ' '
    + grunt.log.wordlist(checks) + ' exist' + p(checks.length, 's')
    + ' in target...';
  grunt.verbose.writeln(msg);

  if(target == null)
    throw grunt.util.error('Unable to load target.');

  if((failProps = checks.filter(checkOne)).length == 0)
    return grunt.verbose.ok(), true;

  throw grunt.util.error('Required config propert'
    + p(failProps.length, 'y/ies') + ' ' + failProps.map(function(prop) {
      return '"' + prop + '"';
    }).join(', ') + ' missing.');

  function checkOne(k, i, obj) {
    obj = !obj || Array.isArray(obj) ? target: obj;
    var keya = Array.isArray(k) ? k: k.split('.'), keyn = keya.shift();
    return keya.length == 0 ? !hasValue(obj, keyn): checkOne(keya, i, obj[keyn]
      || {});
  }

  function hasValue(target, key) {
    return target && target[key] && target[key] != null;
  }

}

function extendedAssert(type, args) {

  var type_is_args = Array.isArray(type);

  // logging
  if(!type_is_args && args == null)
    return util[type instanceof Error ? 'error': 'log'](type);

  // assertion
  if(type_is_args)
    args = type, type = 'ok';
  assert[type].apply(assert, args);

}

function npmLink(root, pkg, callback) {

  var line = [], ee = null;
  var d = null, mod_d = null;

  // check an create node_modules
  line.push(function() {
    var cb = next(arguments);
    d = path.join(root, 'node_modules');
    fs.stat(d, function(err, stat) {
      err || !stat.isDirectory() ? mkdir(d).on('error', error).on('end', cb)
        : cb();
    });
  });

  // check package directory
  line.push(function() {
    var cb = next(arguments);
    d = path.join(d, pkg);
    fs.stat(d, function(err, stat) {
      !err && !stat.isDirectory() ? end(): cb();
    });
  });

  // read package and get module directory
  line.push(function() {
    var cb = next(arguments);
    try {
      mod_d = require.resolve(pkg).split('/').slice(0, -1);
      while(mod_d.length
        && !fs.existsSync(path.join(mod_d.join('/'), 'package.json')))
        mod_d.pop();
      if(mod_d.length === 0)
        throw 'package.json for ' + pkg + ' not found.';
      symlinkd(mod_d.join('/'), d).on('error', error).on('end', end);
    } catch(e) {
      error(e);
    }
  });

  function error(e) {
    ee.emit('error', e);
  }

  function end() {
    ee.emit('end');
  }

  return ee = eventDrive(line, callback);

}

function download(url, afp, callback) {

  var fd = null, line = [], ee = null;

  // open file
  line.push(function(next) {
    fs.open(afp, 'w', function(err, _fd) {
      fd = _fd, err ? ee.emit('error', err): next();
    });
  });

  // download and write into file
  line.push(function(next) {
    require('http' + (url.charAt(4) == 's' ? 's': '')).get(url, function(res) {

      var bytes = parseInt(res.headers['content-length']);

      var watcher = timecalc(), now = watcher.basepoint(), len = 0, cnt = 1;
      var itv = Math.max(Math.pow(10, bytes.toString().length - 1) || 1);
      var bytev = _.thousandSep(bytes) + ' bytes';
      var m = 'Downloading ' + (afp.split('/').pop()) + '... (' + bytev + ')';

      ee.emit('message', m), res.on('data', function(d) {

        fs.write(fd, d, 0, d.length, len), len += d.length;

        // each over x/100, calc and emit download status
        (len > itv * cnt) && (function() {

          cnt++;

          var diff = watcher.diff(), times = parseInt(bytes / len * 10) / 10;
          var perc = parseInt(len / bytes * 1000) / 10;

          var w = bytes && watcher({
            basepoint: Date.now() - diff * Math.max(times - 1, 0.1),
            enable: {
              ms: false
            }
          });

          var t = '[' + perc + '%, ' + (w || 'soon') + ']';
          var s = _.thousandSep(parseInt(len / diff * 1000 / 1000));
          var m = '... progress ' + s + ' kbps ' + t;
          ee.emit('message', m), watcher.basepoint(now);

        })();

      }).on('end', function() {
        next();
      });
    }).on('error', function(e) {
      ee.emit('error', e);
    });
  });

  // close file
  line.push(function() {
    fs.close(fd, function(err) {
      err ? ee.emit('error', err): ee.emit('end');
    });
  });

  return ee = eventDrive(line, callback);

}

function decompress(afp, callback) {
  var line = [], ee = null;
  line.push(function() {
    require('child_process').exec(decompressc(afp)).on('error', function(e) {
      ee.emit('error', e);
    }).on('exit', function(code) {
      var m = 'Decompress ' + (afp.split('/').pop()) + ' finished.'
      ee.emit('message', m), ee.emit('end');
    });
  });
  return ee = eventDrive(line, callback);
}

function rmkdir(prefix, d, callback) {
  console.warn('deprecated. Recomend to use "grunt-tree-prepare".');
  var line = [], ee = null;
  var d_arr = d.split('/'), d_dir = '';
  while(d_arr.length)
    (function(t_dir) {
      line.push(function(next) {
        _.mkdir(path.join(prefix, t_dir)).on('error', function(e) {
          ee.emit('error', e);
        }).on('end', next);
      });
    })(d_dir += (d_dir ? '/': '') + d_arr.shift());
  line.push(function() {
    ee.emit('end');
  });
  return ee = eventDrive(line, callback);
}

function mkdir(d, callback) {
  var line = [], ee = null;
  line.push(caught(function() {
    if(!fs.statSync(d).isDirectory())
      throw 'ENOENT';
    ee.emit('end');
  }, function(e) {
    e == 'ENOENT' || e.code == 'ENOENT' ? fs.mkdir(d, function(err) {
      err ? ee.emit('error', err): ee.emit('end');
    }): ee.emit('error', e);
  }))
  return ee = eventDrive(line, callback);
}

function symlinkd(src, dst, callback) {
  return _symbolicLink(src, dst, 'dir', callback);
}

function symlinkf(src, dst, callback) {
  return _symbolicLink(src, dst, 'file', callback);
}

function decompressc(f) {
  return [(archiveExt() == '.tgz' ? 'tar -zxvf': 'unzip'), f].join(' ');
}

function _symbolicLink(src, dst, type, callback) {
  var line = [], ee = null;
  var isD = type == 'dir';
  line.push(function(next) {
    fs.unlink(dst, function() {
      next();
    });
  });
  line.push(function() {
    if(!fs.statSync(src)['is' + (isD ? 'Directory': 'File')]())
      throw 'simbolicLink: ' + type;
    fs.symlink(src, dst, type, function(err) {
      if(err)
        return ee.emit('error', err);
      var m = 'Create simbolic link "' + dst + '" finished.';
      ee.emit('message', m), ee.emit('end');
    });
  });
  return ee = eventDrive(line, callback);
}
