import { Transform, Readable, Writable } from "stream";
export interface TransformDescription {
    get: () => Transform;
}