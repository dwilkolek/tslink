import { JobConfigDBO } from "./job-config-dbo";
import { JobStatusEnum } from "../job-status-enum";

export interface JobDBO {
    _id?: string;
    jobDefinitionId: string;
    config: JobConfigDBO;
    status: JobStatusEnum;
    startDateTime?: Date;
    endDateTime?: Date;
}