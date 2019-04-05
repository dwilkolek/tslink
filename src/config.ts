export interface IConfig {
    slaveWorkerCount: number;
    db: {
        url: string,
        name: string,
        options?: any,
    };
    port?: number;
    jobsDirectory: string;
    tempZipDirectory: string;
    workspaceDirectory: string;
    forceSlowDownOnMemory: number;
    redis: {
        port: number,
        host: string,
        options?: any,
    };
    inMemoryOffsetCaching: boolean;
}
