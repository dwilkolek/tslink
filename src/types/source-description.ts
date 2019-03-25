import { Readable } from 'stream';
import { IJobConfig } from './job-config';

export interface ISourceDescription {
    get: (config: IJobConfig, workspace: string) => Readable;
}
