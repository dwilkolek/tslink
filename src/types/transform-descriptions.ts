import { Readable, Transform, Writable } from 'stream';
import { IJobConfig } from './job-config';

export interface ITransformDescription {
    get: (config: IJobConfig, workspace: string) => Transform;
}
