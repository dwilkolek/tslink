var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

// gulp.task("default", function () {
//     return tsProject.src()
//         .pipe(tsProject())
//         .js.pipe(gulp.dest("dist"));
// });

gulp.task('scripts', function() {
    return gulp.src('src/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
}); 

gulp.task('watch', function(){
    gulp.watch('src/*', gulp.series('scripts'));
  return
});