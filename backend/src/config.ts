export interface Config {
    cpus: number;
    db: {
        url: string,
        name: string
    };
    jobsDir: string;
    port: number;
    tempJobDir: string;
    limitJobsPerWorker: number;
}