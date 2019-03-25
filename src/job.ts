import { Stream, pipeline } from "stream";
import { CounterStore } from "./counter-store";
import { EpReadStream } from "./streams/ep-read-stream";
import { EpTransformStream } from "./streams/ep-transform-stream";
import { EpWriteStream } from "./streams/ep-write-stream";

import { Readable } from "stream";
import { JobDefinition } from "./types/job-definition";
import { JobConfig } from "./types/job-config";
import { ConnectionNext } from "./types/connection-next";
import { Db } from "./db";


const process = require('process');

export class Job {

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: any[] = [];
    private workingEndPipes = 0;

    constructor(private db:Db, public _id: string, private jobDescription: JobDefinition, private config: JobConfig, private workspaceDirectory: string) {
        console.log('Working on:', process.pid, jobDescription, config)
        this._counterStore = new CounterStore(this._id, this.jobDescription.name);
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

    timeout: any;
    statisticCounter: any;
    run() {

        this.statisticCounter = this.getStatisticCounterTimeout();

        return new Promise<Job>(resolve => {
            this.jobDescription.beforeProcessing(this.config, this.workspaceDirectory, () => {

                this.jobDescription.connections.forEach((connection) => {
                    var streamed = this.getReadStream(connection.from);
                    this.streams[connection.from] = streamed;
                    const readerOutStream = this.counterStore.collectCounterOut(connection.from)
                    streamed = streamed.pipe(readerOutStream)
                    var connectionNext = this.pipeNext(streamed, connection.to);
                    this.pipelines.push(connectionNext);
                })

                this.timeout = this.getTimeoutIsDone(resolve);
            });
        });
    }

    getStatisticCounterTimeout() {
        return setTimeout(() => {
            this.db.updateJob({
                _id:this._id,
                statistics:this.counterStore.json(),
            }, () => {
                this.statisticCounter = this.getStatisticCounterTimeout();
            })
        }, 20000);
    }

    getTimeoutIsDone(resolve: any) {
        return setTimeout(() => {
            if (this.workingEndPipes === 0) {
                clearTimeout(this.statisticCounter);
                this.jobDescription.afterProcessing(this.config, this.workspaceDirectory, () => {
                    resolve(this);
                })
            } else {
                this.timeout = this.getTimeoutIsDone(resolve);
            }

        }, 5000);
    }
    private pipeNext(stream: any, connectionNext: ConnectionNext): any {
        if (connectionNext) {
            var transform = this.getTransformStream(connectionNext.name);
            var write = this.getWriteStream(connectionNext.name);
            const isTransform = transform != null;

            const inStream = this.counterStore.collectCounterIn(connectionNext.name);

            var streamNext = stream
                .pipe(inStream);
            streamNext = isTransform ? streamNext.pipe(transform) : streamNext.pipe(write);
            if (!isTransform) {
                this.workingEndPipes++;
                streamNext.on('finish', () => {
                    this.workingEndPipes--;
                })
            }
            if (isTransform) {
                const outStream = this.counterStore.collectCounterOut(connectionNext.name);
                streamNext = streamNext.pipe(outStream);
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
            return this.jobDescription.sinks[name].get(this.config, this.workspaceDirectory)
        }
        return null;
    }

    private getTransformStream(name: string) {
        const transformNode = this.jobDescription.transformers[name];
        if (transformNode) {
            return transformNode.get(this.config, this.workspaceDirectory);
        }
        return null;
    }

    private getReadStream(name: string): Readable {
        return this.jobDescription.sources[name].get(this.config, this.workspaceDirectory);

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
