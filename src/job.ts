import { JobDescription, SourceDescription, TransformDescription, SinkDescription, ConnectionNext, Connection } from "./job-description";
import { Stream } from "stream";
import { stringify } from "querystring";
const debug = false;
export class Job {
    streams: { [key: string]: Stream } = {};
    pipelines: any[] = [];
    constructor(private jobDescription: JobDescription) {
        // this.sourceNames.forEach(source => {
        //     this.streams[source] = this.getReadStream(source);
        // });
        // this.transformerNames.forEach(transform => {
        //     this.streams[transform] = this.getTransformStream(transform);
        // });
        // this.sinkNames.forEach(sink => {

        //     this.streams[sink] = sinkStream;
        // });

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
        const promisses: Promise<any>[] = [];
        this.sourceNames.forEach((name) => {
            const sourceNode = this.jobDescription.sources[name]
            promisses.push(new Promise(resolve => {

                sourceNode.produce((data) => {
                    (<any>this.streams[name]).push(data);
                }, () => {
                    resolve();
                });


            }))
        })

        Promise.all(promisses).then((data) => {
            console.log('done', data)
        })
    }

    pipeNext(stream: any, connectionNext: ConnectionNext): any {
        if (connectionNext) {
            const transform = this.getTransformStream(connectionNext.name);
            const write = this.getWriteStream(connectionNext.name);
            if (connectionNext.to) {
                return this.pipeNext(stream.pipe(transform || write), connectionNext.to);
            }
            return stream.pipe(transform || write);
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
            const newBuffer = transformNode.transform(chunk, encoding);
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

export class Source {

}

export class Transform {

}


export class Sink {

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
                debug && console.log(count)
                next(Buffer.from(Math.random().toString()));
                if (count >= 120000) {
                    clearInterval(interval);
                    finished();
                }
            })
        }
    }
}
const transformers: { [key: string]: TransformDescription } = {
    's2': {
        transform: (data: Buffer, encoding: string) => {
            const num = parseFloat(data.toString());
            return Buffer.from((num * 10) + '');
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
new Job({
    name: 'job2',
    connections: connections,
    sources: sources,
    transformers: transformers,
    sinks: sinks
}).run();