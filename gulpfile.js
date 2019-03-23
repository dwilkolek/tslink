var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var clean = require('gulp-clean');
const { exec } = require('pkg')

gulp.task('clean', function () {
  return gulp.src(['release', 'dist', 'ui/dist'], { read: false, allowEmpty: true })
      .pipe(clean());
});

gulp.task('scripts', function() {
    return gulp.src('src/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
}); 

gulp.task('watch', function(){
    gulp.watch('src/*', gulp.series('scripts'));
  return
});

gulp.task('release', function() {
  return Promise.all(
    platforms.map(platform => {
      return exec(['dist/epjs.js', '--target', 'host', '--output', `release/epjs.${platform.ext}`])
    })
  )  
})