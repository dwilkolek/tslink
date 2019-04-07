import { Stream, Transform } from 'stream';
import { NodeCounter } from './counters/node-counter';

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

    public collectCounterIn(streams: { [key: string]: Stream }, name: string, objectMode: boolean): Transform {
        if (!streams[this.inName(name)]) {
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
                }
            };
            streams[this.inName(name)] = transformStream;
        }
        return streams[this.inName(name)] as Transform;
    }
    public collectCounterOut(streams: { [key: string]: Stream }, name: string, objectMode: boolean): Transform {
        if (!streams[this.outName(name)]) {
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
            streams[this.outName(name)] = transformStream;
        }
        return streams[this.outName(name)] as Transform;
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

    private inName(name: string) {
        return 'in#' + name;
    }

    private outName(name: string) {
        return 'out#' + name;
    }

    private mergedInName(name: string) {
        return 'mergedIn#' + name;
    }

    private counterExpired() {
        return Date.now() - this.lasUpdateDb > 60 * 1000;
    }

}
