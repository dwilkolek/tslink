var gulp = require('gulp');
var clean = require('gulp-clean');

gulp.task('clean', function () {
    return gulp.src(['backend/dist', 'frontend/dist', 'backend/tmp-jobs/*'], { read: false, allowEmpty: true })
        .pipe(clean());
});