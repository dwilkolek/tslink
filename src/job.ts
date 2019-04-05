import * as process from 'process';
import { Stream, Transform, Writable } from 'stream';
import { Readable } from 'stream';
import { CounterStore } from './counter-store';
import { DBQueries } from './db-queries';
import { IConnectionNext } from './types/connection-next';
import { JobContext } from './types/job-context';
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
    private killCb?: () => void;

    private killIt = false;

    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};
    private pipelines: Stream[] = [];
    private workingEndPipes = 0;

    private timeout?: NodeJS.Timeout;
    private statisticCounter?: NodeJS.Timeout;

    constructor(private db: DBQueries, public _id: string, private jobDescription: IJobDefinition,
                private jobContext: JobContext, private getStoredProgress: () => number) {
        this._counterStore = new CounterStore(this._id, this.jobDescription.name);

        this.sourceNames.forEach((source) => {
            this.counterStore.init(source);
        });
        this.transformerNames.forEach((transform) => {
            this.counterStore.init(transform);
        });
        this.sinkNames.forEach((sink) => {
            this.counterStore.init(sink);
        });
    }

    public kill(cb: () => void) {
        this.killCb = cb;
        this.killIt = true;
    }
    public run() {

        this.statisticCounter = this.getStatisticCounterTimeout();
        console.log('JOB CONFIG: ', this.jobContext.jobConfig);
        return new Promise<Job>((resolve, reject) => {
            this.jobDescription.beforeProcessing(this.jobContext, () => {

                this.jobDescription.connections.forEach((connection) => {
                    const streamed = this.getReadStream(connection.from);
                    this.streams[connection.from] = streamed;
                    // const readerOutStream = this.counterStore.collectCounterOut(connection.from, this.jobContext.jobConfig.objectMode);
                    // streamed = streamed.pipe(readerOutStream);
                    connection.to.forEach((connTo) => {
                        const connectionNext = this.pipeNext(streamed, connTo);
                        connectionNext.forEach((_conn) => {
                            this.pipelines.push(_conn);
                        });
                    });

                });

                this.timeout = this.getTimeoutIsDone(resolve, reject);
            });
        });
    }

    private getStatisticCounterTimeout() {
        return setTimeout(() => {
            this.db.updateJob({
                _id: this._id,
                progress: this.getStoredProgress(),
                statistics: this.counterStore.json(true),
            }).then(() => {
                this.statisticCounter = this.getStatisticCounterTimeout();
            });
        }, 30000);
    }

    private getTimeoutIsDone(resolve: (value?: Job | PromiseLike<Job>) => void, reject: (reason?: any) => void) {
        return setTimeout(() => {
            if (this.killIt) {
                if (this.statisticCounter) {
                    clearTimeout(this.statisticCounter);
                }
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                this.jobDescription.afterProcessing(this.jobContext, () => {
                    reject({ killCb: this.killCb });
                });
            }
            if (this.workingEndPipes === 0) {
                console.log('Finishin job:', this._id);
                if (this.statisticCounter) {
                    clearTimeout(this.statisticCounter);
                }
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                this.jobDescription.afterProcessing(this.jobContext, () => {
                    resolve(this);
                });
            } else {
                this.timeout = this.getTimeoutIsDone(resolve, reject);
            }

        }, 25000);
    }
    private pipeNext(stream: Stream, connectionNext: IConnectionNext): Stream[] {
        if (connectionNext) {
            const transform = this.getTransformStream(connectionNext.name);
            const write = this.getWriteStream(connectionNext.name);

            const inStream = this.counterStore.collectCounterIn(connectionNext.name, this.jobContext.jobConfig.objectMode);

            let streamNext: Stream = stream
                .pipe(inStream);
            if (transform) {
                streamNext = streamNext.pipe(transform);
                const outStream = this.counterStore.collectCounterOut(connectionNext.name, this.jobContext.jobConfig.objectMode);
                streamNext = streamNext.pipe(outStream);
            }
            if (!transform && write) {
                streamNext = streamNext.pipe(write);
                this.workingEndPipes++;
                write.on('finish', () => {
                    this.workingEndPipes--;
                });

            }

            if (connectionNext.to) {
                const nextStreams: Stream[] = [];
                connectionNext.to.forEach((connNextTo) => {
                    this.pipeNext(streamNext, connNextTo).forEach((subStream) => {
                        nextStreams.push(subStream);
                    });
                });
                return nextStreams;
            }
            return [streamNext];
        }
        return [stream];
    }

    private getWriteStream(name: string): Writable | null {
        const sinkNode = this.jobDescription.sinks[name];
        if (sinkNode) {
            return this.jobDescription.sinks[name].get(this.jobContext);
        }
        return null;
    }

    private getTransformStream(name: string): Transform | null {
        const transformNode = this.jobDescription.transformers[name];
        if (transformNode) {
            return transformNode.get(this.jobContext);
        }
        return null;
    }

    private getReadStream(name: string): Readable {
        return this.jobDescription.sources[name].get(this.jobContext);

    }

}
