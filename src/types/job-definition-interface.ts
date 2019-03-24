import { Connection } from "./connection";
import { SourceDescription } from "./source-description";
import { TransformDescription } from "./transform-descriptions";
import { SinkDescription } from "./sink-description";
import { Transform, Readable, Writable } from "stream";
export interface JobDefinitionInterface {
    name: string,
    connections: Connection[];
    sources: { [key: string]: SourceDescription };
    transformers: { [key: string]: TransformDescription };
    sinks: { [key: string]: SinkDescription };
}







