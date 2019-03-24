import { Transform, Readable, Writable } from "stream";
export interface SourceDescription {
    get: () => Readable;
}