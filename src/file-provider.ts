import { ConfigProvider } from "./config-provider";

const path = require('path');

export class FileProvider {
    public static getSystemPath(file: string) {
        if (ConfigProvider.isDev) {
            return file;
        } else {
            return path.join(path.dirname(process.execPath), file);
        }

    }
}