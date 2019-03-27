import { IJobConfig } from './job-config';

export class JobContext {

    public storeOffset?: (offset: {}) => void;
    constructor(
        public jobConfig: IJobConfig,
        public workspaceDirectory: string,
    ) {

    }

}
