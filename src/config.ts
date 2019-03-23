export interface Config {
    cpus: number;
    db: {
        url: string,
        name: string
    };
    port?: number;
    tempJobDir: string;
    limitJobsPerWorker: number;
    additionalDependencyDirectory: string;
}