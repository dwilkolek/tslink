import { JobConfig } from "./job-config";
import { JobStatusEnum } from "../job-status-enum";

export interface JobDBO {
    _id?: string;
    jobDefinitionId: string;
    config: JobConfig;
    status: JobStatusEnum;
    startDateTime?: Date;
    endDateTime?: Date;
    statistics?: any;
    error?: any
}