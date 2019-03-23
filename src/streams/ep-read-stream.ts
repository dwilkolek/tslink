import { Readable } from "stream";

export class EpReadStream extends Readable {
    
    constructor(cacheSize: number, produce: () => Buffer) {
        super({
            highWaterMark: cacheSize
        });
        this.produce = produce;
    }

    produce: () => Buffer;
    _read(size:number) {
        this.push(this.produce())
    }
}