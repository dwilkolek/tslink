import { JobStatusEnum } from '../job-status-enum';
import { IJobConfig } from './job-config';

export interface IJobDBO {
    _id?: string;
    jobDefinitionId?: string;
    config?: IJobConfig;
    status?: JobStatusEnum;
    startDateTime?: Date;
    endDateTime?: Date;
    statistics?: any;
    error?: any;
}
