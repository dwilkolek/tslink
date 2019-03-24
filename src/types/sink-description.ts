import { Transform, Readable, Writable } from "stream";
export interface SinkDescription {
    get: () => Writable;
}