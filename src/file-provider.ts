import { ConfigProvider } from './config-provider';

const path = require('path');
const fs = require('fs');

export class FileProvider {
    public static getSystemPath(file: string) {
        if (ConfigProvider.isDev) {
            return file;
        } else {
            return path.join(path.dirname(process.execPath), file);
        }

    }

    public static createDirectory(dirPath: string) {
        try {
            fs.mkdirSync(dirPath, { recursive: true, mode: 0o744 });
        } catch (e) {
            if (e.code !== 'EEXIST') {
                console.warn('Failed to create directory at:', path.resolve(dirPath), e);
            }
        }
    }

    public static rmdirAsync(path, callback) {
        fs.readdir(path, function (err, files) {
            if (err) {
                // Pass the error on to callback
                callback(err, []);
                return;
            }

            let count = 0;
            const wait = files.length,
                folderDone = function (err?) {
                    count++;
                    // If we cleaned out all the files, continue
                    if (count >= wait || err) {
                        fs.rmdir(path, callback);
                    }
                };
            // Empty directory to bail early
            if (!wait) {
                folderDone();
                return;
            }

            // Remove one or more trailing slash to keep from doubling up
            path = path.replace(/\/+$/, '');
            files.forEach(function (file) {
                const curPath = path + '/' + file;
                fs.lstat(curPath, function (err, stats) {
                    if (err) {
                        callback(err, []);
                        return;
                    }
                    if (stats.isDirectory()) {
                        FileProvider.rmdirAsync(curPath, folderDone);
                    } else {
                        fs.unlink(curPath, folderDone);
                    }
                });
            });
        });
    }
}
