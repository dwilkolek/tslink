var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

gulp.task('scripts', function() {
    return gulp.src('src/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
}); 

gulp.task('watch', function(){
    gulp.watch('src/*', gulp.series('scripts'));
  return
});

gulp.task('copy', function () {
  return gulp.src('./dist/**/*.js')
      .pipe(gulp.dest('./../backend/compiled-jobs/'));
});