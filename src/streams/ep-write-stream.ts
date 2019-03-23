import { Writable } from "stream";
export class EpWriteStream extends Writable {
    constructor(cacheSize: number, private writeProcess: (chunk: Buffer, encoding: string, done: () => void) => void) {
        super({
            highWaterMark: cacheSize
        });
    }

    _write(chunk: Buffer, encoding: string, done: () => void) {
        this.writeProcess(chunk, encoding, done)
    }

}
