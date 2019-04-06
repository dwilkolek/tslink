import * as cluster from 'cluster';
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
            db: {
                name: 'tslink',
                options: {},
                url: 'mongodb://localhost:27017',
            },
            forceSlowDownOnMemory: 1000,
            inMemoryOffsetCaching: true,
            jobsDirectory: './jobs',
            redis: {
                host: '127.0.0.1',
                options: {},
                port: 6379,
            },
            slaveWorkerCount: 8,
            tempZipDirectory: './zips',
            workspaceDirectory: './workspace',
        };

        try {
            const userConfig = JSON.parse(fs.readFileSync('./config.json').toString());
            Object.assign(this.config, userConfig);
        } catch (e) {
            if (cluster.isMaster) {
                console.warn('File config.json is missing. Using default config');
            }
        }
    }
}
