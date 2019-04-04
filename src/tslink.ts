import * as appModulePath from 'app-module-path';
import * as cluster from 'cluster';
import { ConfigProvider } from './config-provider';
import { FileProvider } from './file-provider';
import { MasterWorker } from './master-worker';
import { SlaveWorker } from './slave-worker';
import { TSlinkWorker } from './worker';

appModulePath.addPath(FileProvider.getSystemPath(ConfigProvider.depsPath));

class TSlink {

    public static bootstrap() {
        return new TSlink();
    }

    private worker: TSlinkWorker;

    constructor() {
        this.worker = cluster.isMaster ? new MasterWorker() : new SlaveWorker();
    }

}

export const server = TSlink.bootstrap();
