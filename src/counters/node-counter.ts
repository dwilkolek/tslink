import { ProcessingCounter } from './process-counter';
import { TimeCounter } from './time-counter';

export class NodeCounter {
    public name: string;
    public in: ProcessingCounter;
    public out: ProcessingCounter;
    public time: TimeCounter;

    constructor(name: string) {
        this.name = name;
        this.in = new ProcessingCounter();
        this.out = new ProcessingCounter();
        this.time = new TimeCounter();
    }

    public putIn(buff: Buffer) {
        this.in.put(buff);
    }

    public putOut(buff: Buffer) {
        this.out.put(buff);
    }

    public putTime(time: number) {
        this.time.put(time);
    }

    public prettyPrint() {
        return `Node: ${this.name}:
        \n\tin: ${this.in.prettyPrint()}
        \n\tout: ${this.out.prettyPrint()}
        \n\ttime: ${this.time.prettyPrint()}\n\n`;
    }

    public json() {
        return {
            in: this.in.json(),
            name: this.name,
            out: this.out.json(),
            time: this.time.json(),
        };
    }

}
