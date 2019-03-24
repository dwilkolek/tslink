import { JobNodeConfigInterface } from "./job-node-config";

export interface JobConfigInterface {
    name: string;
    jobParams?: any,
    sources?: { [key: string]: JobNodeConfigInterface };
    transformers?: { [key: string]: JobNodeConfigInterface };
    sinks?: { [key: string]: JobNodeConfigInterface };
}