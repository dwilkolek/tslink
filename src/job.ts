import { JobDescription, SourceDescription, TransformDescription, SinkDescription, ConnectionNext, Connection } from "./job-description";
import { Stream } from "stream";
import { stringify } from "querystring";
import { CounterStorage } from "./counter-staroge";
const debug = false;
const md5 = require('md5')
export class Job {

    counterStorage: CounterStorage;
    streams: { [key: string]: Stream } = {};
    pipelines: any[] = [];
    constructor(private jobDescription: JobDescription) {
        this.counterStorage = new CounterStorage(this.jobDescription.name);
        this.sourceNames.forEach(source => {
            this.counterStorage.init(source);
        });
        this.transformerNames.forEach(transform => {
            this.counterStorage.init(transform);
        });
        this.sinkNames.forEach(sink => {
            this.counterStorage.init(sink);
        });

        this.jobDescription.connections.forEach((connection) => {
            var streamed = this.getReadStream(connection.from);
            this.streams[connection.from] = streamed;
            var connectionNext = this.pipeNext(streamed, connection.to);
            this.pipelines.push(connectionNext);
        })


    }
    jobRunning: any;
    run() {
        this.jobRunning = setInterval(() => {
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.warn(`${this.jobDescription.name} \t>> The script uses approximately ${Math.round(used * 100) / 100} MB`);
        }, 1000)
        const promisses: Promise<CounterStorage>[] = [];
        this.sourceNames.forEach((name) => {
            const sourceNode = this.jobDescription.sources[name]
            promisses.push(new Promise(resolve => {

                sourceNode.produce((data) => {
                    this.counterStorage.putOut(name, data);
                    (<any>this.streams[name]).push(data);
                }, () => {
                    resolve(this.counterStorage);
                });


            }))
        })

        Promise.all(promisses).then((counterStorages:CounterStorage[]) => {
            clearInterval(this.jobRunning);
            counterStorages.forEach(counterStorage => {
                console.log(counterStorage.prettyPrint());
            })
        })
    }

    pipeNext(stream: any, connectionNext: ConnectionNext): any {
        if (connectionNext) {
            var transform = this.getTransformStream(connectionNext.name);
            var write = this.getWriteStream(connectionNext.name);
            const isTransform = transform != null;
            var streamNext = stream
                .pipe(this.counterStorage.collectCounterIn(connectionNext.name));
            streamNext =  isTransform ? streamNext.pipe(transform) : streamNext.pipe(write);
            if (isTransform) {
                streamNext = streamNext.pipe(this.counterStorage.collectCounterOut(connectionNext.name));
            }
            if (connectionNext.to) {
                return this.pipeNext(streamNext, connectionNext.to);
            }
            return streamNext;
        }
        return stream;
    }
    getWriteStream(name: string) {
        const sinkNode = this.jobDescription.sinks[name];
        if (!sinkNode) {
            return null;
        }
        const sinkStream = new Stream.Writable();
        sinkStream._write = (chunk: Buffer, encoding: string, done) => {
            debug && console.log('\t\twriting...', chunk.toString())
            sinkNode.write(chunk, encoding, done)
        }
        return sinkStream;
    }
    getTransformStream(name: string) {
        const transformNode = this.jobDescription.transformers[name];
        if (!transformNode) {
            return null;
        }
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            debug && console.log('\t\ttransforming...', chunk.toString())
            const start = new Date().getTime();
            const newBuffer = transformNode.transform(chunk, encoding);
            const end = new Date().getTime();
            this.counterStorage.putTime(name, end-start);
            done(null, newBuffer);
        }
        return transformStream;
    }



    getReadStream(name: string) {
        const sourceNode = this.jobDescription.sources[name];
        const readStream = new Stream.Readable();
        readStream._read = (size) => { }
        return readStream;
    }

    get sourceNames() {
        return Object.keys(this.jobDescription.sources);
    }

    get transformerNames() {
        return Object.keys(this.jobDescription.transformers);
    }

    get sinkNames() {
        return Object.keys(this.jobDescription.sinks);
    }
}

const connections: Connection[] = [{
    from: 's1',
    to: {
        name: 's2',
        to: {
            name: 's3'
        }
    }
}];
const sources: { [key: string]: SourceDescription } = {
    's1': {
        produce: (next, finished) => {
            let count = 0
            var interval = setInterval(() => {
                count++;
                (debug || count % 1000 == 0) && console.log(count)
                next(Buffer.from(Math.random().toString()));
                if (count >= 500) {
                    clearInterval(interval);
                    finished();
                }
            })
        }
    }
}
const sources2: { [key: string]: SourceDescription } = {
    's1': {
        produce: (next, finished) => {
            let count = 0
            var interval = setInterval(() => {
                count++;
                (debug || count % 10 == 0) && console.log(count)
                next(Buffer.from(Math.random().toString()));
                if (count >= 100) {
                    clearInterval(interval);
                    finished();
                }
            }, 10)
        }
    }
}
const ipsum = "No opinions answered oh felicity is resolved hastened. Produced it friendly my if opinions humoured. Enjoy is wrong folly no taken. It sufficient instrument insipidity simplicity at interested. Law pleasure attended differed mrs fat and formerly. Merely thrown garret her law danger him son better excuse. Effect extent narrow in up chatty. Small are his chief offer happy had. Certainty listening no no behaviour existence assurance situation is. Because add why not esteems amiable him. Interested the unaffected mrs law friendship add principles. Indeed on people do merits to. Court heard which up above hoped grave do. Answer living law things either sir bed length. Looked before we an on merely. These no death he at share alone. Yet outward the him compass hearted are tedious. Eat imagine you chiefly few end ferrars compass. Be visitor females am ferrars inquiry. Latter law remark two lively thrown. Spot set they know rest its. Raptures law diverted believed jennings consider children the see. Had invited beloved carried the colonel. Occasional principles discretion it as he unpleasing boisterous. She bed sing dear now son half. ";
console.log(Buffer.from(ipsum).byteLength)
const transformers: { [key: string]: TransformDescription } = {
    's2': {
        transform: (data: Buffer, encoding: string) => {
            const num = parseFloat(data.toString());
            for (let i = 0; i< 1000; i++) {
                md5(i+ipsum)
            }
            return Math.random() > 0.5 ? Buffer.from((num * 10) + ipsum) : undefined;
        }
    }
}
const sinks: { [key: string]: SinkDescription } = {
    's3': {
        write: (data: Buffer, encoding: string, done: () => void) => {
            
            debug && console.log(data.toString());
            done();
        }
    }
}
new Job({
    name: 'job1',
    connections: connections,
    sources: sources,
    transformers: transformers,
    sinks: sinks
}).run();