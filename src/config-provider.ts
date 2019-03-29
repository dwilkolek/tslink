import * as fs from 'fs';
import { IConfig } from './config';

export class ConfigProvider {
    public static isDev = process.argv.filter((arg) => arg === 'dev').length === 1;

    public static uiPath = ConfigProvider.isDev ? './ui/dist/ui/' : '../ui/dist/ui';
    public static depsPath = './node_modules';

    public static getInstance(): ConfigProvider {
        if (!this._instance) {
            this._instance = new ConfigProvider();
        }
        return this._instance;
    }

    public static get(): IConfig {
        return this.getInstance().config;
    }

    private static _instance: ConfigProvider;

    public config: IConfig;

    private constructor() {
        this.config = {
            cpus: 8,
            db: {
                name: 'epjs',
                url: 'mongodb://localhost:27017',
            },
            jobsDirectory: './jobs',
            limitJobsPerWorker: 1,
            tempZipDirectory: './zips',
            workspaceDirectory: './workspace',
        };

        try {
            const userConfig = JSON.parse(fs.readFileSync('./epjs-config.json').toString());
            Object.assign(this.config, userConfig);
        } catch (e) {
            console.warn('File epjs-config.json is missing. Using default config');
        }
    }
}
