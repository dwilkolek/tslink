import { Readable } from 'stream';
import { JobContext } from './job-context';

export interface ISourceDescription {
    get: (jobContext: JobContext) => Readable;
}
