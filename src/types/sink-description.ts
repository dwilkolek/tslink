import { Transform, Readable, Writable } from "stream";
import { JobConfig } from "./job-config";

export interface SinkDescription {
    get: (config: JobConfig, workspace: string) => Writable;
}