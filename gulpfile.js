const gulp = require('gulp');
const clean = require('gulp-clean');
const fs = require('fs');
const { exec } = require('pkg')

gulp.task('clean', function () {
    return gulp.src(['dist', 'backend/dist', 'frontend/dist', 'backend/tmp-jobs/*'], { read: false, allowEmpty: true })
        .pipe(clean());
});

gulp.task('copy-config', function () {
    return gulp.src('backend/epjs-config.json').pipe(gulp.dest('dist/win')).pipe(gulp.dest('dist/linux')).pipe(gulp.dest('dist/mac'));
});
gulp.task('copy-ui', function () {
    return gulp.src('frontend/dist/**/*').pipe(gulp.dest('dist/win')).pipe(gulp.dest('dist/linux')).pipe(gulp.dest('dist/mac'));
});
gulp.task('create-temp-job-dir', function () {
    return new Promise((resolve) => {
        try {
            fs.mkdirSync('dist/win/tmp-jobs', 0o744);
            fs.mkdirSync('dist/linux/tmp-jobs', 0o744);
            fs.mkdirSync('dist/mac/tmp-jobs', 0o744);
        } catch (e) { };
        resolve();
    });
})

const platforms = [
    { name: 'win', target: 'node10-win-x64', ext: '.exe' },
    { name: 'linux', target: 'node10-linux-x64', ext: '' },
    // { name: 'mac', target: 'node10-linux-x64', ext: 'shm' }
]
gulp.task('release', function () {
    const promisess = [];
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const dest = `dist/${platform.name}`;
        try {
            fs.mkdirSync(`${dest}`);
        } catch (e) { }
        promisess.push(
            Promise.all([
                gulp.src('backend/epjs-config.json').pipe(gulp.dest(dest)),
                gulp.src('frontend/dist/**/*').pipe(gulp.dest(dest)),
                gulp.src(`backend/release/epjs${platform.ext}`).pipe(gulp.dest(dest)),
                // new Promise(resolve => {
                //     try {
                //         fs.mkdirSync(`${dest}/tmp-jobs`, 0o744);

                //     } catch (e) { console.warn(e) } 
                //     resolve();
                // })
            ])
        )
    }
    return Promise.all(promisess);

    return Promise.all(promisess);

})