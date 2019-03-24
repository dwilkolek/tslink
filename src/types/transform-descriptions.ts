import { Transform, Readable, Writable } from "stream";
import { JobConfig } from "./job-config";

export interface TransformDescription {
    get: (config: JobConfig, workspace: string) => Transform;
}