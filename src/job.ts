import { Stream, pipeline } from "stream";
import { CounterStore } from "./counter-store";
import { EpReadStream } from "./streams/ep-read-stream";
import { EpTransformStream } from "./streams/ep-transform-stream";
import { EpWriteStream } from "./streams/ep-write-stream";

import { Readable } from "stream";
import { JobDefinitionInterface } from "./types/job-definition-interface";
import { JobConfig } from "./types/job-config";
import { ConnectionNext } from "./types/connection-next";


const process = require('process');

export class Job {

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: any[] = [];

    constructor(public _id: string, private jobDescription: JobDefinitionInterface, private config: JobConfig, private workspaceDirectory: string) {
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
    run() {
        return new Promise<Job>(resolve => {
            this.jobDescription.beforeProcessing(this.config, this.workspaceDirectory, () => {

                this.jobDescription.connections.forEach((connection) => {
                    var streamed = this.getReadStream(connection.from);
                    this.streams[connection.from] = streamed;
                    var connectionNext = this.pipeNext(streamed, connection.to);
                    this.pipelines.push(connectionNext);
                })

                this.timeout = this.getTimeoutIsDone(resolve);
            });
        });
    }

    getTimeoutIsDone(resolve: any) {
        return setTimeout(() => {
            if (this.jobDescription.isDone(this.config, this.workspaceDirectory)) {
                this.pipelines.forEach(pipeline => {
                    console.log('should close pipes...')
                });
                clearTimeout(this.timeout);
                resolve(this);
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
