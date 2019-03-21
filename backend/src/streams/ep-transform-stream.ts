import { Transform } from "stream";
import { CounterStore } from "../counter-store";
import { TimeCounter } from "../counters/time-counter";

export class EpTransformStream extends Transform {

    constructor(cacheSize: number, private timeCounter: TimeCounter, private transform: (chunk: any, encoding: string) => Buffer | undefined) {
        super({ highWaterMark: cacheSize });
    }
    _transform(chunk: any, encoding: string, done: import("stream").TransformCallback): void {
        setImmediate(() => {
            const start = new Date().getTime();
            const newBuffer = this.transform(chunk, encoding);
            const end = new Date().getTime();
            this.timeCounter.put(end - start);
            done(null, newBuffer);
        })
    }


}