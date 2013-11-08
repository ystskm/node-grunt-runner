/***/
var platform = require('os').platform(), fs = require('fs'), util = require('util'), Emitter = require('events').EventEmitter;
var _ = require('underscore'), micropipe = require('micro-pipe');
module.exports = _.extend(_, {
  // expose
  pwd: process.cwd(),
  platform: platform,
  util: util,
  micropipe: micropipe,
  next: next,
  // utilities
  caught: caught,
  mkdir: mkdir,
  thousandSep: thousandSep,
  archiveExt: archiveExt,
  mixedConfigure: mixedConfigure,
  download: download,
  decompress: decompress,
  simbolicLink: simbolicLink,
  // command bridges
  decompressc: decompressc,
  simbolicLinkc: simbolicLinkc
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

function mkdir(d, callback) {
  caught(function() {
    if(!fs.statSync(d).isDirectory())
      throw 'mkdir';
    callback(null);
  }, function() {
    fs.mkdir(d, callback);
  })();
}

function thousandSep(s) {
  s = s.toString();
  if(s.replace(/\d|\./g, '').length)
    return 'NaN';
  s = s.split('.');
  var nat = s[0], dec = s[1];
  var rem = nat.substr(0, nat.length % 3), rlen = rem.length;
  return (rlen ? rem + ',': '')
    + nat.substr(rlen).split(/\d{3}/).slice(0, -1).map(function(v, i) {
      return nat.substr(rlen + i * 3, 3);
    }).join(',') + (dec ? '.' + dec: '')
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
  var fd = null, line = [], ee = new Emitter();
  if(typeof callback == 'function')
    ee.once('error', callback).once('end', function() {
      callback(null);
    });
  // open file
  line.push(function(next) {
    fs.open(afp, 'w', function(err, _fd) {
      fd = _fd, err ? ee.emit('error', err): next();
    });
  });
  // download and write into file
  line.push(function(next) {
    require('http' + (url.charAt(4) == 's' ? 's': '')).get(url, function(res) {
      var len = 0;
      var bytes = _.thousandSep(res.headers['content-length']) + ' bytes';
      var m = 'Downloading ' + (afp.split('/').pop()) + '... (' + bytes + ')';
      ee.emit('message', m), res.on('data', function(d) {
        fs.write(fd, d, 0, d.length, len), len += d.length;
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
  })
  setImmediate(caught(function() {
    micropipe(line);
  }));
  return ee;
}

function decompress(afp, callback) {
  var line = [], ee = new Emitter();
  if(typeof callback == 'function')
    ee.once('error', callback).once('end', function() {
      callback(null);
    });
  line.push(function() {
    require('child_process').exec(decompressc(afp)).on('error', function(e) {
      ee.emit('error', e);
    }).on('exit', function(code) {
      var m = 'Decompress ' + (afp.split('/').pop()) + ' finished.'
      ee.emit('message', m), ee.emit('end');
    });
  });
  setImmediate(caught(function() {
    micropipe(line);
  }));
  return ee;
}

function simbolicLink(p, as, callback) {
  var line = [], ee = new Emitter();
  if(typeof callback == 'function')
    ee.once('error', callback).once('end', function() {
      callback(null);
    });
  // remove old link, ignore error
  line.push(function(next) {
    fs.unlink(as, function(err) {
      next();
    })
  });
  // add sinbolic link
  line.push(function() {
    require('child_process').exec(simbolicLinkc(p, as)).on('exit', function() {
      var m = 'Create simbolic link "' + as + '" finished.';
      ee.emit('message', m), ee.emit('end');
    });
  });
  setImmediate(caught(function() {
    micropipe(line);
  }));
  return ee;
}

function decompressc(f) {
  return [(archiveExt() == '.tgz' ? 'tar -zxvf': 'unzip'), f].join(' ');
}

function simbolicLinkc(d, n) {
  return [(archiveExt() == '.tgz' ? 'ln -s': 'mklink /D'), d, n].join(' ');
}
