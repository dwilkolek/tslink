import { Stream } from "stream";
import { NodeCounter } from "./counters/node-counter";

export class CounterStore {

    constructor(private uuid: string, private jobName: string) { }

    counters: { [key: string]: NodeCounter } = {}

    public init(name: string) {
        this.counters[name] = new NodeCounter(name);
    }

    public putIn(name: string, buff: Buffer) {
        this.counters[name].putIn(buff);
    }

    public putOut(name: string, buff: Buffer) {
        this.counters[name].putOut(buff);
    }

    public putTime(name: string, time: number) {
        this.counters[name].putTime(time);
    }

    public collectCounterIn(name: string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putIn(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }

    public collectCounterOut(name: string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putOut(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }

    public inName(name: string) {
        return this.jobName + ':' + name + '-in';
    }

    public outName(name: string) {
        return this.jobName + ':' + name + '-out';
    }

    get counterNames() {
        return Object.keys(this.counters);
    }

    public prettyPrint() {
        let header = `------------------------------------------------------------\nJob: ${this.jobName}\n`;
        let footer = `\n------------------------------------------------------------\n`;
        let body = this.counterNames.map(name => {
            return '\t' + this.counters[name].prettyPrint();
        }).join('\n');
        return header + body + footer;
    }

    public json() {
        return {
            uuid: this.uuid,
            name: this.jobName,
            processes: this.counterNames.map(counterName => {
                return this.counters[counterName].json();
            })
        }
    }
}

