/***/
var platform = require('os').platform(), path = require('path'), fs = require('fs'), util = require('util'), Emitter = require('events').EventEmitter;
var _ = require('underscore'), micropipe = require('micro-pipe'), timecalc = require('time-calc');
module.exports = _.extend(_, {
  // expose
  pwd: process.cwd(),
  platform: platform,
  util: util,
  micropipe: micropipe,
  timecalc: timecalc,
  next: next,

  // utilities
  caught: caught,
  thousandSep: thousandSep,
  archiveExt: archiveExt,
  mixedConfigure: mixedConfigure,
  eventDrive: eventDrive,

  // file actions - using eventDrive
  download: download,
  decompress: decompress,
  // use node fs
  rmkdir: rmkdir, // recursive -f mkdir
  mkdir: mkdir,
  symlinkd: simlinkd,
  symlinkf: simlinkf,

  // command bridges
  decompressc: decompressc
});

function next(a) {
  return _.toArray(a).pop();
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

function mixedConfigure(grunt, taskname) {
  var conf = grunt.config.get('pkg').configure;
  var stock = taskname.split('-'), namea = [], mixed = {};
  while(stock.length)
    namea.push(stock.shift()), _.extend(mixed, conf[namea.join('-')]);
  return mixed;
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

function eventDrive(line, callback) {
  var ee = new Emitter();
  if(typeof callback == 'function')
    ee.once('error', callback).once('end', function() {
      callback(null);
    });
  setImmediate(caught(function() {
    micropipe(line);
  }, function(e) {
    ee.emit('error', e);
  }));
  return ee;
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
