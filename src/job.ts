import * as process from 'process';
import { Stream, Transform, Writable } from 'stream';
import { Readable } from 'stream';
import { CounterStore } from './counter-store';
import { DBQueries } from './db-queries';
import { IConnectionNext } from './types/connection-next';
import { IJobConfig } from './types/job-config';
import { IJobDefinition } from './types/job-definition';

export class Job {

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

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: Stream[] = [];
    private workingEndPipes = 0;

    private timeout?: NodeJS.Timeout;
    private statisticCounter?: NodeJS.Timeout;

    constructor(private db: DBQueries, public _id: string, private jobDescription: IJobDefinition,
                private config: IJobConfig, private workspaceDirectory: string) {
        console.log('Working on:', process.pid, jobDescription, config);
        this._counterStore = new CounterStore(this._id, this.jobDescription.name);
        this.sourceNames.forEach((source) => {
            this._counterStore.init(source);
        });
        this.transformerNames.forEach((transform) => {
            this.counterStore.init(transform);
        });
        this.sinkNames.forEach((sink) => {
            this.counterStore.init(sink);
        });
    }

    public run() {

        this.statisticCounter = this.getStatisticCounterTimeout();

        return new Promise<Job>((resolve) => {
            this.jobDescription.beforeProcessing(this.config, this.workspaceDirectory, () => {

                this.jobDescription.connections.forEach((connection) => {
                    let streamed = this.getReadStream(connection.from);
                    this.streams[connection.from] = streamed;
                    const readerOutStream = this.counterStore.collectCounterOut(connection.from);
                    streamed = streamed.pipe(readerOutStream);
                    const connectionNext = this.pipeNext(streamed, connection.to);
                    this.pipelines.push(connectionNext);
                });

                this.timeout = this.getTimeoutIsDone(resolve);
            });
        });
    }

    private getStatisticCounterTimeout() {
        return setTimeout(() => {
            this.db.updateJob({
                _id: this._id,
                statistics: this.counterStore.json(),
            }, () => {
                this.statisticCounter = this.getStatisticCounterTimeout();
            });
        }, 20000);
    }

    private getTimeoutIsDone(resolve: (value?: Job | PromiseLike<Job>) => void ) {
        return setTimeout(() => {
            if (this.workingEndPipes === 0) {
                console.log('Finishin job:', this._id);
                if (this.statisticCounter) {
                    clearTimeout(this.statisticCounter);
                }
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                this.jobDescription.afterProcessing(this.config, this.workspaceDirectory, () => {
                    resolve(this);
                });
            } else {
                this.timeout = this.getTimeoutIsDone(resolve);
            }

        }, 5000);
    }
    private pipeNext(stream: Stream, connectionNext: IConnectionNext): Stream {
        if (connectionNext) {
            const transform = this.getTransformStream(connectionNext.name);
            const write = this.getWriteStream(connectionNext.name);

            const inStream = this.counterStore.collectCounterIn(connectionNext.name);

            let streamNext: Stream = stream
                .pipe(inStream);

            if (transform) {
                streamNext = streamNext.pipe(transform);
                const outStream = this.counterStore.collectCounterOut(connectionNext.name);
                streamNext = streamNext.pipe(outStream);
            }
            if (!transform && write) {
                streamNext = streamNext.pipe(write);
                this.workingEndPipes++;
                write.on('close', () => {
                    this.workingEndPipes--;
                });
            }

            if (connectionNext.to) {
                return this.pipeNext(streamNext, connectionNext.to);
            }
            return streamNext;
        }
        return stream;
    }

    private getWriteStream(name: string): Writable | null {
        const sinkNode = this.jobDescription.sinks[name];
        if (sinkNode) {
            return this.jobDescription.sinks[name].get(this.config, this.workspaceDirectory);
        }
        return null;
    }

    private getTransformStream(name: string): Transform | null {
        const transformNode = this.jobDescription.transformers[name];
        if (transformNode) {
            return transformNode.get(this.config, this.workspaceDirectory);
        }
        return null;
    }

    private getReadStream(name: string): Readable {
        return this.jobDescription.sources[name].get(this.config, this.workspaceDirectory);

    }

}
