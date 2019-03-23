import { MasterWorker } from "./master-worker";
import { SlaveWorker } from "./slave-worker";
import { EpDbWorker } from "./worker";

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