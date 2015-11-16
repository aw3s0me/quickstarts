var babelify = require('babelify'),
    browserify = require('browserify'),
    gulp = require('gulp'),
    rename = require('gulp-rename')
    source = require('vinyl-source-stream');

gulp.task('js:bundle', function () {
  var bundler = browserify({
    entry: './src/js/index.js',
    debug: true
  });

  return bundler
    .add('./src/js/index.js')
    .transform(babelify)
    .bundle()
    .pipe(source('./src/js/index.js'))
    .pipe(rename('index.js'))
    .pipe(gulp.dest('./www/js'));
});
