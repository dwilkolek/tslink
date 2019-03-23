import { Config } from "./config";
const fs = require('fs');

export class ConfigProvider {

    private static _instance: ConfigProvider;

    config: Config;

    private constructor() {
        this.config = {
            cpus: 4,
            db : {
                "url": "mongodb://localhost:27017",
                "name": "epjs"
            },
            tempJobDir: "./tmp-jobs",
            limitJobsPerWorker: 1
        };

        if (process.argv.filter(arg => arg==='dev').length === 1) {
            
        }
        try {
            let userConfig = JSON.parse(fs.readFileSync('./epjs-config.json').toString());
            this.config = Object.assign(this.config, userConfig);
        } catch (e) {
            console.warn('File epjs-config.json is missing. Using default config');
        }
    }
    public static isDev = process.argv.filter(arg => arg==='dev').length === 1;

    public static getInstance(): ConfigProvider {
        if (!this._instance) {
            this._instance = new ConfigProvider();
        }
        return this._instance;
    }

    public static get(): Config {
        return this.getInstance().config;
    }
}