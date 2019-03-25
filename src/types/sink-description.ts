import { Readable, Transform, Writable } from 'stream';
import { IJobConfig } from './job-config';

export interface ISinkDescription {
    get: (config: IJobConfig, workspace: string) => Writable;
}
