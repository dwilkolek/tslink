import { MasterWorker } from "./master-worker";
import { SlaveWorker } from "./slave-worker";
import { EpWorker } from "./worker";

const cluster = require('cluster');
const os = require('os');

class EPJS {

    worker: EpWorker;

    public static bootstrap() {
        return new EPJS();
    }

    constructor() {
        this.worker = cluster.isMaster ? new MasterWorker() : new SlaveWorker();
    }
}

var server = EPJS.bootstrap();
exports.default = server;