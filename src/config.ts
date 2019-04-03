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
    limitJobsPerWorker: number;
    forceSlowDownOnMemory: number;
    redis: {
        port: number,
        host: string,
        options?: any,
    };
}
