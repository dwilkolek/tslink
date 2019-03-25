export interface IConfig {
    cpus: number;
    db: {
        url: string,
        name: string,
    };
    port?: number;
    jobsDirectory: './jobs';
    tempZipDirectory: './zips';
    workspaceDirectory: './workspace';
    limitJobsPerWorker: 1;
}
