'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var wrench = require('wrench');

var ambiente = gutil.env.ambiente;
var versao = gutil.env.versao;

var options = {
  src: 'src',
  dist: 'dist',
  tmp: '.tmp',
  e2e: 'e2e',
  errorHandler: function(title) {
    return function(err) {
      gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
      this.emit('end');
    };
  },
  wiredep: {
    directory: 'bower_components',
    exclude: [/jquery/]
  }
};

wrench.readdirSyncRecursive('./gulp').filter(function(file) {
  return (/\.(js|coffee)$/i).test(file);
}).map(function(file) {
  if (file === 'proxy.js') {
    require('./gulp/' + file)
  } else {
    require('./gulp/' + file)(options);
  }
});

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});
