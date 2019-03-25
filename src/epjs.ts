import * as appModulePath from 'app-module-path';
import * as cluster from 'cluster';
import { ConfigProvider } from './config-provider';
import { FileProvider } from './file-provider';
import { MasterWorker } from './master-worker';
import { SlaveWorker } from './slave-worker';
import { EpDbWorker } from './worker';

appModulePath.addPath(FileProvider.getSystemPath(ConfigProvider.depsPath));

class EPJS {

    public static bootstrap() {
        return new EPJS();
    }

    private worker: EpDbWorker;

    constructor() {
        this.worker = cluster.isMaster ? new MasterWorker() : new SlaveWorker();
    }

}

export const server = EPJS.bootstrap();
