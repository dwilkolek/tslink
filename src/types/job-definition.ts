import { Connection } from "./connection";
import { SourceDescription } from "./source-description";
import { TransformDescription } from "./transform-descriptions";
import { SinkDescription } from "./sink-description";
import { JobConfig } from "./job-config";

export interface JobDefinition {
    name: string
    connections: Connection[]
    sources: { [key: string]: SourceDescription }
    transformers: { [key: string]: TransformDescription }
    sinks: { [key: string]: SinkDescription }
    beforeProcessing: (config: JobConfig, workspace: string, done: () => void) => void;
    afterProcessing: (config: JobConfig, workspace: string, done: () => void) => void;
}
