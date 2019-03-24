import { ConfigProvider } from "./config-provider";

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
        };
    }
}