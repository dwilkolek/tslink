import { JobStatusEnum } from '../job-status-enum';
import { IConnection } from './connection';
import { IJobConfig } from './job-config';

export interface IJobDBO {
    _id?: string;
    jobDefinitionId?: string;
    config?: IJobConfig;
    connections?: IConnection[];
    status?: JobStatusEnum;
    startDateTime?: Date;
    endDateTime?: Date;
    statistics?: any;
    error?: any;
    progress?: number;
    processId?: number;
    offset?: any;
    previousJob_id?: string;
    name?: string;
    lastUpdate?: number;
}
