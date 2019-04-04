import * as appModulePath from 'app-module-path';
import * as cluster from 'cluster';
import { ConfigProvider } from './config-provider';
import { DbWorker } from './db-wroker';
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
        if (process.env.type === 'dbworker') {
            console.log('spawn db worker');
            this.worker = new DbWorker();
        } else if (process.env.type === 'slaveworker') {
            console.log('spawn slave worker');
            this.worker = new SlaveWorker();
        } else {
            console.log('spawn master worker');
            this.worker = new MasterWorker();
        }
    }

}

export const server = TSlink.bootstrap();
