import { Config } from "./config";
const fs = require('fs');

export class ConfigProvider {

    private static _instance: ConfigProvider;

    config: Config;

    private constructor() {
        this.config = JSON.parse(fs.readFileSync('./epjs-config.json').toString());
    }

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