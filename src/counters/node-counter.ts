import { ProcessingCounter } from "./process-counter";
import { TimeCounter } from "./time-counter";

export class NodeCounter {
    name: string;
    in: ProcessingCounter;
    out: ProcessingCounter;
    time: TimeCounter;

    constructor(name: string) {
        this.name = name;
        this.in = new ProcessingCounter();
        this.out = new ProcessingCounter();
        this.time = new TimeCounter();
    }

    putIn(buff: Buffer) {
        this.in.put(buff)
    }

    putOut(buff: Buffer) {
        this.out.put(buff)
    }

    putTime(time: number) {
        this.time.put(time);
    }

    prettyPrint() {
        return `Node: ${this.name}:\n\tin: ${this.in.prettyPrint()} \n\tout: ${this.out.prettyPrint()}\n\ttime: ${this.time.prettyPrint()}\n\n`
    }

}