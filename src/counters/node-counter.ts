import { ProcessingCounter } from './process-counter';

export class NodeCounter {
    public name: string;
    public in: ProcessingCounter;
    public out: ProcessingCounter;

    constructor(name: string) {
        this.name = name;
        this.in = new ProcessingCounter();
        this.out = new ProcessingCounter();
    }

    public putIn(buff: Buffer) {
        this.in.put(buff);
    }

    public putOut(buff: Buffer) {
        this.out.put(buff);
    }

    public prettyPrint() {
        return `Node: ${this.name}:
        \n\tin: ${this.in.prettyPrint()}
        \n\tout: ${this.out.prettyPrint()}`;
    }

    public json() {
        return {
            in: this.in.json(),
            name: this.name,
            out: this.out.json(),
        };
    }

}
