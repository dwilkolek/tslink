import { IConnection } from './connection';
import { IJobConfig } from './job-config';
import { ISinkDescription } from './sink-description';
import { ISourceDescription } from './source-description';
import { ITransformDescription } from './transform-descriptions';

export interface IJobDefinition {
    name: string;
    connections: IConnection[];
    sources: { [key: string]: ISourceDescription };
    transformers: { [key: string]: ITransformDescription };
    sinks: { [key: string]: ISinkDescription };
    beforeProcessing: (config: IJobConfig, workspace: string, done: () => void) => void;
    afterProcessing: (config: IJobConfig, workspace: string, done: () => void) => void;
}
