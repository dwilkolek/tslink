import { Stream } from 'stream';
import { ConfigProvider } from './config-provider';
import { NodeCounter } from './counters/node-counter';
import { ProcessingCounter } from './counters/process-counter';

export class CounterStore {
    get counterNames() {
        return Object.keys(this.counters);
    }

    public counters: { [key: string]: NodeCounter } = {};

    private lasUpdateDb = 0;
    constructor(private jobId: string, private jobName: string) { }

    public init(name: string) {
        this.counters[name] = new NodeCounter(name);
    }

    public putIn(name: string, buff: Buffer) {
        this.counters[name].putIn(buff);
    }

    public putOut(name: string, buff: Buffer) {
        this.counters[name].putOut(buff);
    }

    public collectCounterIn(name: string, objectMode: boolean) {
        const transformStream = new Stream.Transform({ objectMode, highWaterMark: 100 });
        transformStream._transform = (chunk: any, encoding: string, done) => {
            if (this.counterExpired()) {
                setImmediate(() => {
                    if (typeof chunk === 'object') {
                        this.putIn(name, Buffer.from(JSON.stringify(chunk)));
                    } else if (typeof chunk === 'string') {
                        this.putIn(name, Buffer.from(chunk));
                    } else if (chunk instanceof Buffer) {
                        this.putIn(name, Buffer.from(chunk));
                    } else {
                        console.warn('Cannot process in counter', name, chunk);
                    }

                    done(null, chunk);
                });
            } else {
                // if (typeof chunk === 'object') {
                //     this.putIn(name, Buffer.from(JSON.stringify(chunk)));
                // } else if (typeof chunk === 'string') {
                //     this.putIn(name, Buffer.from(chunk));
                // } else if (chunk instanceof Buffer) {
                //     this.putIn(name, Buffer.from(chunk));
                // } else {
                //     console.warn('Cannot process in counter', name, chunk);
                // }

                done(null, chunk);
            }
        };
        return transformStream;
    }
    public collectCounterOut(name: string, objectMode: boolean) {
        const transformStream = new Stream.Transform({ objectMode, highWaterMark: 100 });
        transformStream._transform = (chunk: any, encoding: string, done) => {
            if (this.counterExpired()) {
                setImmediate(() => {
                    if (typeof chunk === 'object') {
                        this.putOut(name, Buffer.from(JSON.stringify(chunk)));
                    } else if (typeof chunk === 'string') {
                        this.putOut(name, Buffer.from(chunk));
                    } else if (chunk instanceof Buffer) {
                        this.putOut(name, Buffer.from(chunk));
                    } else {
                        console.warn('Cannot process out counter', name, chunk);
                    }
                    done(null, chunk);
                });
            } else {
                if (typeof chunk === 'object') {
                    this.putOut(name, Buffer.from(JSON.stringify(chunk)));
                } else if (typeof chunk === 'string') {
                    this.putOut(name, Buffer.from(chunk));
                } else if (chunk instanceof Buffer) {
                    this.putOut(name, Buffer.from(chunk));
                } else {
                    console.warn('Cannot process out counter', name, chunk);
                }
                done(null, chunk);
            }
        };
        return transformStream;
    }

    public inName(name: string) {
        return this.jobName + ':' + name + '-in';
    }

    public outName(name: string) {
        return this.jobName + ':' + name + '-out';
    }

    public prettyPrint() {
        const header = `------------------------------------------------------------\nJob: ${this.jobName}\n`;
        const footer = `\n------------------------------------------------------------\n`;
        const body = this.counterNames.map((name) => {
            return '\t' + this.counters[name].prettyPrint();
        }).join('\n');
        return header + body + footer;
    }

    public json(updateDb: boolean = false) {
        if (updateDb) {
            this.lasUpdateDb = Date.now();
        }
        return {
            jobId: this.jobId,
            name: this.jobName,
            processes: this.counterNames.map((counterName) => {
                return this.counters[counterName].json();
            }),
        };
    }
    private counterExpired() {
        const now = Date.now();
        const expired = process.memoryUsage().heapUsed / 1024 / 1024 > ConfigProvider.get().forceSlowDownOnMemory
            || (now - this.lasUpdateDb > 60 * 1000);
        return expired;
    }

}
