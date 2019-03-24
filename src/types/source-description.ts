import { Transform, Readable, Writable } from "stream";
import { JobConfig} from "./job-config";

export interface SourceDescription {
    get: (config: JobConfig, workspace: string) => Readable;
}