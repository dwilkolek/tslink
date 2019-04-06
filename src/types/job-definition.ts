import { IConnection } from './connection';
import { JobContext } from './job-context';
import { ISinkDescription } from './sink-description';
import { ISourceDescription } from './source-description';
import { ITransformDescription } from './transform-descriptions';

export interface IJobDefinition {
    name: string;
    connections: IConnection[];
    sources: { [key: string]: ISourceDescription };
    transformers: { [key: string]: ITransformDescription };
    sinks: { [key: string]: ISinkDescription };
    beforeProcessing: (jobContext: JobContext, done: () => void) => void;
    afterProcessing: (jobContext: JobContext, done: () => void) => void;
}
