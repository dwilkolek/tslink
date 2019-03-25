import { ConfigProvider } from './config-provider';

import * as fs from 'fs';
import * as path from 'path';

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
            if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
                console.warn('Failed to create directory at:', path.resolve(dirPath), e);
            }
        }
    }

    public static rmdirAsync(pathProvided: string, callback: (err: NodeJS.ErrnoException, data?: string[]) => void) {
        fs.readdir(pathProvided, (err, files) => {
            if (err) {
                // Pass the error on to callback
                callback(err, []);
                return;
            }

            let count = 0;
            const wait = files.length;
            const folderDone = (errCb?) => {
                count++;
                // If we cleaned out all the files, continue
                if (count >= wait || err) {
                    fs.rmdir(pathProvided, callback);
                }
            };
            // Empty directory to bail early
            if (!wait) {
                folderDone();
                return;
            }

            // Remove one or more trailing slash to keep from doubling up
            pathProvided = pathProvided.replace(/\/+$/, '');
            files.forEach((file) => {
                const curPath = path + '/' + file;
                fs.lstat(curPath, (errCb, stats) => {
                    if (errCb) {
                        callback(errCb, []);
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
