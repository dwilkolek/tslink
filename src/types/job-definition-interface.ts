import { Connection } from "./connection";
import { SourceDescription } from "./source-description";
import { TransformDescription } from "./transform-descriptions";
import { SinkDescription } from "./sink-description";
import { JobConfig } from "./job-config";

export interface JobDefinitionInterface {
    name: string,
    connections: Connection[];
    sources: { [key: string]: SourceDescription };
    transformers: { [key: string]: TransformDescription };
    sinks: { [key: string]: SinkDescription };
    isDone: (config: JobConfig, workspace: string) => boolean;
    beforeProcessing: (config: JobConfig, workspace: string, done:() => void) => void;
}







