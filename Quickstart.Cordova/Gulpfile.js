var babelify = require('babelify'),
    browserify = require('browserify'),
    gulp = require('gulp'),
    npmfiles = require('gulp-npm-files'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass'),
    source = require('vinyl-source-stream');

gulp.task('default', [ 'build' ]);
gulp.task('build', [ 'js:bundle', 'css:bundle', 'libs:copy' ]);

gulp.task('css:bundle', function () {
    gulp.src('./src/scss/index.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./www/css'));
});

gulp.task('libs:copy', function () {
    gulp.src(npmfiles())
        .pipe(gulp.dest('./www/lib'));
});

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
