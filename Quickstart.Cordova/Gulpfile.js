var babelify = require('babelify'),
    browserify = require('browserify'),
    gulp = require('gulp'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass'),
    source = require('vinyl-source-stream');

gulp.task('default', [ 'build' ]);
gulp.task('build', [ 'js:bundle', 'css:bundle' ]);

gulp.task('css:bundle', function () {
    gulp.src('./src/scss/index.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./www/css'));
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
