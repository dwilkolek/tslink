export interface JobConfig {
    _id?: string;
    name: string;
    jobParams?: any;
    deleteWorkspaceOnFinish: boolean;
    deleteWorkspaceOnError: boolean;
    recoverOnFail: boolean;
    entryFile: string;
}