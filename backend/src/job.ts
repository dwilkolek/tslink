import { JobDescription, ConnectionNext } from "./job-description";
import { Stream } from "stream";
import { CounterStore } from "./counter-store";
const uuid = require('uuid/v4');

export class Job {

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: any[] = [];
    private uuid: string;
    constructor(private jobDescription: JobDescription) {
        this.uuid = uuid();
        this._counterStore = new CounterStore(this.uuid, this.jobDescription.name);
        this.sourceNames.forEach(source => {
            this._counterStore.init(source);
        });
        this.transformerNames.forEach(transform => {
            this.counterStore.init(transform);
        });
        this.sinkNames.forEach(sink => {
            this.counterStore.init(sink);
        });

        this.jobDescription.connections.forEach((connection) => {
            var streamed = this.getReadStream(connection.from);
            this.streams[connection.from] = streamed;
            var connectionNext = this.pipeNext(streamed, connection.to);
            this.pipelines.push(connectionNext);
        })


    }
    private jobRunning: any;
    run() {
        this.jobRunning = setInterval(() => {
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.warn(`${this.jobDescription.name} \t>> The script uses approximately ${Math.round(used * 100) / 100} MB`);
        }, 1000)
        const promisses: Promise<CounterStore>[] = [];
        this.sourceNames.forEach((name) => {
            const sourceNode = this.jobDescription.sources[name]
            promisses.push(new Promise(resolve => {

                sourceNode.produce((data) => {
                    this.counterStore.putOut(name, data);
                    (<any>this.streams[name]).push(data);
                }, () => {
                    resolve(this.counterStore);
                });


            }))
        })

        Promise.all(promisses).then((counterStorages: CounterStore[]) => {
            clearInterval(this.jobRunning);
            counterStorages.forEach(counterStorage => {
                console.log(counterStorage.prettyPrint());
            })
        })
    }

    private pipeNext(stream: any, connectionNext: ConnectionNext): any {
        if (connectionNext) {
            var transform = this.getTransformStream(connectionNext.name);
            var write = this.getWriteStream(connectionNext.name);
            const isTransform = transform != null;
            var streamNext = stream
                .pipe(this.counterStore.collectCounterIn(connectionNext.name));
            streamNext = isTransform ? streamNext.pipe(transform) : streamNext.pipe(write);
            if (isTransform) {
                streamNext = streamNext.pipe(this.counterStore.collectCounterOut(connectionNext.name));
            }
            if (connectionNext.to) {
                return this.pipeNext(streamNext, connectionNext.to);
            }
            return streamNext;
        }
        return stream;
    }

    private getWriteStream(name: string) {
        const sinkNode = this.jobDescription.sinks[name];
        if (!sinkNode) {
            return null;
        }
        const sinkStream = new Stream.Writable();
        sinkStream._write = (chunk: Buffer, encoding: string, done) => {
            sinkNode.write(chunk, encoding, done)
        }
        return sinkStream;
    }

    private getTransformStream(name: string) {
        const transformNode = this.jobDescription.transformers[name];
        if (!transformNode) {
            return null;
        }
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            const start = new Date().getTime();
            const newBuffer = transformNode.transform(chunk, encoding);
            const end = new Date().getTime();
            this.counterStore.putTime(name, end - start);
            done(null, newBuffer);
        }
        return transformStream;
    }

    private getReadStream(name: string) {
        const sourceNode = this.jobDescription.sources[name];
        const readStream = new Stream.Readable();
        readStream._read = (size) => { }
        return readStream;
    }

    private get sourceNames() {
        return Object.keys(this.jobDescription.sources);
    }

    private get transformerNames() {
        return Object.keys(this.jobDescription.transformers);
    }

    private get sinkNames() {
        return Object.keys(this.jobDescription.sinks);
    }

    public get counterStore(): CounterStore {
        return this._counterStore;
    }
}