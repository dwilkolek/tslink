import { Stream } from "stream";
import { CounterStore } from "./counter-store";
import { EpReadStream } from "./streams/ep-read-stream";
import { EpTransformStream } from "./streams/ep-transform-stream";
import { EpWriteStream } from "./streams/ep-write-stream";
import { JobConfigDBO } from "./db/job-config-dbo";
const uuid = require('uuid/v4');
const process = require('process');
const cluster = require('cluster');
import { Readable } from "stream";
import { JobDefinitionInterface } from "./types/job-definition-interface";
import { ConnectionNext } from "./types/connection-next";

export class Job {

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: any[] = [];
    private uuid: string;
    constructor(private jobDescription: JobDefinitionInterface, private config?:JobConfigDBO) {
        console.log('Working on:', process.pid, jobDescription, config)
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


    }
    private jobRunning: any;
    run() {
        this.jobRunning = setInterval(() => {
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.warn(`${this.jobDescription.name} \t>> The script uses approximately ${Math.round(used * 100) / 100} MB`);
        }, 5000)


        return new Promise(resolve => {
            this.jobDescription.connections.forEach((connection) => {
                var streamed = this.getReadStream(connection.from);
                this.streams[connection.from] = streamed;
                var connectionNext = this.pipeNext(streamed, connection.to);
                this.pipelines.push(connectionNext);
            })
        });
        // const promisses: Promise<CounterStore>[] = [];
        // this.sourceNames.forEach((name) => {
        //     const sourceNode = this.jobDescription.sources[name]
        //     promisses.push(new Promise(resolve => {

        //         // sourceNode.produce((data) => {
        //         //     this.counterStore.putOut(name, data);
        //         //     (<any>this.streams[name]).push(data);
        //         // }, () => {
        //         //     resolve(this.counterStore);
        //         // });


        //     }))
        // })

        // Promise.all(promisses).then((counterStorages: CounterStore[]) => {
        //     clearInterval(this.jobRunning);
        //     counterStorages.forEach(counterStorage => {
        //         console.log(counterStorage.prettyPrint());
        //     })
        // })

        // setTimeout(() => {}, 10000)
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
        if (sinkNode) {
            return this.jobDescription.sinks[name].get()
        }
        return null;
    }

    private getTransformStream(name: string) {
        const transformNode = this.jobDescription.transformers[name];
        if (transformNode) {
            return transformNode.get();
        }
        return null;
    }

    private getReadStream(name: string): Readable {
        return this.jobDescription.sources[name].get();

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

// const promisses = [];
// for (let i = 0; i < 4; i++)
//     promisses.push(new Promise(resolve => {
//         setTimeout(() => {
//             resolve('resolve=' + i);
//         }, 10 * 60 * 1000);
//         new Job({
//             name: 'jobs1',
//             sources: {
//                 sources1: {
//                     produce: function () {
//                         // console.log('produce')
//                         return Buffer.from(Math.random().toString());
//                     }
//                 }

//             },
//             sinks: {
//                 s3: {
//                     write: function (data: any, encoding: any, done: any) {
//                         done();
//                     }
//                 }
//             },
//             transformers: {
//                 s2: {
//                     transform: function (data: any, encoding: any) {

//                         // console.log('transform', data.toString())
//                         var num = parseFloat(data.toString());
//                         return Math.random() > 0.5 ? Buffer.from((num * 10) + 'asdasdsa') : undefined;
//                     }
//                 }
//             },
//             connections: [{
//                 from: 'sources1',
//                 to: {
//                     name: 's2',
//                     to: {
//                         name: 's3'
//                     }
//                 }
//             }]
//         }).run();
//     }));

