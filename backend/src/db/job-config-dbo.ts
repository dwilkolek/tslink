import { JobNodeConfig } from "./job-node-config";

export interface JobConfigDBO {
    _id?: string;
    name: string;
    jobParams?: any,
    sources?: { [key: string]: JobNodeConfig };
    transformers?: { [key: string]: JobNodeConfig };
    sinks?: { [key: string]: JobNodeConfig };
}