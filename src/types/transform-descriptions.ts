import { Readable, Transform, Writable } from 'stream';
import { IJobConfig } from './job-config';
import { JobContext } from './job-context';

export interface ITransformDescription {
    get: (jobContext: JobContext) => Transform;
}
