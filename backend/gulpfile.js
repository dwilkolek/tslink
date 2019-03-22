var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
const { exec } = require('pkg')

// gulp.task("default", function () {
//     return tsProject.src()
//         .pipe(tsProject())
//         .js.pipe(gulp.dest("dist"));
// });
const platforms = [
  { name: 'win', target: 'node10-win-x64', ext: 'exe' },
  { name: 'linux', target: 'node10-linux-x64', ext: 'sh' },
  { name: 'mac', target: 'node10-linux-x64', ext: 'shm' }
]

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