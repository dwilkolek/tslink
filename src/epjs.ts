import { MasterWorker } from "./master-worker";
import { SlaveWorker } from "./slave-worker";
import { EpDbWorker } from "./worker";
import { FileProvider } from "./file-provider";
import { ConfigProvider } from "./config-provider";

console.log("Additional deps: ", FileProvider.getSystemPath(ConfigProvider.depsPath));

require('app-module-path').addPath(FileProvider.getSystemPath(ConfigProvider.depsPath));

const cluster = require('cluster');

class EPJS {

    worker: EpDbWorker;    

    public static bootstrap() {
        return new EPJS();
    }

    constructor() {
        this.worker = cluster.isMaster ? new MasterWorker() : new SlaveWorker();
    }
}

var server = EPJS.bootstrap();
exports.default = server;