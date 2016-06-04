/**
 * Created by snatvb on 31.05.16.
 */

var gulp = require('gulp');
var browserify = require('gulp-browserify');
var browserSync = require('browser-sync').create();
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

gulp.task('scripts', function() {
    gulp.src('./js/snMVVM/app.js')
        .pipe(browserify({
            insertGlobals : true,
            debug : !gulp.env.production
        }))
        .pipe(rename('snMVVM.js'))
        .pipe(gulp.dest('./js'))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest('./js'))
});

// Static server
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
});

gulp.task('watch', function () {
    gulp.watch('./js/snMVVM/**/*.js', ['scripts']);
    gulp.watch([
        './**/*.html',
        './js/snMVVM.js'
    ]).on('change', browserSync.reload);
});




gulp.task('default', ['scripts', 'browser-sync', 'watch']);