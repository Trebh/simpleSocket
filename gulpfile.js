'use strict';

var gulp = require('gulp');
var sequence = require('run-sequence');
var jasmine = require('gulp-jasmine');
var sass = require('gulp-ruby-sass');
var rename = require('gulp-rename');
var minifycss = require('gulp-minify-css');
var del = require('del');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var livereload = require('gulp-livereload');

gulp.task('test', function() {
  return gulp.src('spec/*.js')
    // gulp-jasmine works on filepaths so you can't have any plugins before it 
    .pipe(jasmine());
});

gulp.task('styles', function() {
  return sass('services/client/**/index.scss', {
      style: 'expanded'
    })
    .pipe(gulp.dest('services/client/dist/styles'))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(minifycss())
    .pipe(gulp.dest('services/client/dist/styles'));
});

gulp.task('clean', function() {
  return del(['services/client/dist/styles', 'services/client/dist/scripts']);
});

gulp.task('scripts', function() {
  return gulp.src(['services/client/bower_components/**/*.min.js',
      'services/client/app/**/*.js',
      '!services/client/app//components/errors/*.js'
    ])
    .pipe(concat('main.js'))
    .pipe(gulp.dest('services/client/dist/scripts'))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(uglify())
    .pipe(gulp.dest('services/client/dist/scripts'));
});

gulp.task('build-dev', function(callback) {
  sequence('clean', ['test', 'styles', 'scripts'], 'watch', callback);
});

gulp.task('build', function(callback) {
  sequence('clean', ['styles', 'scripts'], callback);
});

gulp.task('watch', function() {
  gulp.watch('services/client/app/**/*.js', ['scripts']);
  gulp.watch('services/client/**/*.scss', ['styles']);

   // Create LiveReload server
  livereload.listen();

  // Watch any files in dist/, reload on change
  gulp.watch(['services/client/dist/**']).on('change', livereload.changed);
});