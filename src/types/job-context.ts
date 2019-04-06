import { IJobConfig } from './job-config';

export class JobContext {

    constructor(
        public jobConfig: IJobConfig,
        public workspaceDirectory: string,
        public storeOffset: (offset: {}, cb: (status: boolean) => void) => void,
        public storeProgress: (progress: number) => void,
        public currentOffset?: any,
    ) {

    }

}
