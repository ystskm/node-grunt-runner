/***/
var platform = require('os').platform(), fs = require('fs'), util = require('util');
var _ = require('underscore'), micropipe = require('micro-pipe');
module.exports = _.extend(_, {
  pwd: process.cwd(),
  platform: platform,
  util: util,
  micropipe: micropipe,
  next: next,
  caught: caught,
  mkdir: mkdir,
  thousandSep: thousandSep,
  archiveExt: archiveExt,
  decompress: decompress,
  simbolicLink: simbolicLink,
  mixedConfigure: mixedConfigure
});

function next(a) {
  return _.toArray(a).pop();
}

function caught(fn, std) {
  return function() {
    try {
      fn.apply(this, arguments);
    } catch(e) {
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
  s = s.toString().split('.');
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

function decompress(f) {
  return [(archiveExt() == '.tgz' ? 'tar -zxvf': 'unzip'), f].join(' ');
}

function simbolicLink(d, n) {
  return [(archiveExt() == '.tgz' ? 'ln -s': 'mklink /D'), d, n].join(' ');
}

function mixedConfigure(grunt, taskname) {
  var conf = grunt.config.get('pkg').configure;
  var stock = taskname.split('-'), namea = [], mixed = {};
  while(stock.length)
    namea.push(stock.shift()), _.extend(mixed, conf[namea.join('-')]);
  return mixed;
}
