import { IJobConfig } from './job-config';

export class JobContext {

    constructor(
        public jobConfig: IJobConfig,
        public workspaceDirectory: string,
        public storeOffset: (offset: {}, cb: (status: boolean) => void) => void,
        public currentOffset?: any,
    ) {

    }

}
