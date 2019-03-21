import { MasterWorker } from "./master-worker";
import { SlaveWorker } from "./slave-worker";
import { EpWorker } from "./worker";

const cluster = require('cluster');
const os = require('os');

class EPJS {

    worker: EpWorker;

    public static bootstrap() {
        if (cluster.isMaster) {
            const cpus = os.cpus().length;
            console.log(`Forking for ${cpus} CPUs`);
            for (let i = 0; i < cpus; i++) {
                cluster.fork();
            }
        }

        return new EPJS();
    }

    constructor() {
        this.worker = cluster.isMaster ? new MasterWorker() : new SlaveWorker();
    }
}

var server = EPJS.bootstrap();
exports.default = server;