import { Readable } from 'stream';
import { Stream, Transform, Writable } from 'stream';
import { CounterStore } from './counter-store';
import { DBQueries } from './db-queries';
import { JobContext } from './types/job-context';
import { IJobDefinition } from './types/job-definition';
import { ISinkDescription } from './types/sink-description';
import { ISourceDescription } from './types/source-description';
import { ITransformDescription } from './types/transform-descriptions';

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

    public rejectCb?: (rejectInfo: any) => void;
    public resolveCb?: () => void;
    private _counterStore: CounterStore;
    private streams: { [key: string]: Stream } = {};

    private createdConnections: Array<{ from: string, to: string }> = [];

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

    public kill(command: string) {
        console.log('kill');
        if (this.rejectCb) {
            console.log('call reject');
            this.rejectCb(command);
        }
    }
    public done() {
        if (this.resolveCb) {
            this.resolveCb();
        }
    }
    public run() {

        this.statisticCounter = this.getStatisticCounterTimeout();
        return new Promise<Job>((resolve, reject) => {
            this.jobDescription.beforeProcessing(this.jobContext, () => {

                this.sourceNames.forEach((name) => {
                    this.getOrCreateReadableStream(name, this.jobDescription.sources[name])
                        .pipe(this.counterStore.collectCounterOut(this.streams, name, true), {end: false});
                });

                this.transformerNames.forEach((name) => {
                    const inS = this.counterStore.collectCounterIn(this.streams, name, true);
                    const transS = this.getOrCreateTransformStream(name, this.jobDescription.transformers[name]);
                    const outS = this.counterStore.collectCounterOut(this.streams, name, true);
                    inS.pipe(transS, {end: false}).pipe(outS, {end: false});
                });

                this.sinkNames.forEach((name) => {
                    const inS = this.counterStore.collectCounterIn(this.streams, name, true);
                    const writeS = this.getOrCreateWritableStream(name, this.jobDescription.sinks[name]);
                    inS.pipe(writeS, {end: false});
                });
                this.transformerNames.forEach((name) => {
                    const inS = this.counterStore.collectCounterIn(this.streams, name, true);
                    this.jobDescription.transformers[name].readFrom.forEach((rd) => {
                        this.createdConnections.push({from: rd, to: name});
                        this.counterStore.collectCounterOut(this.streams, rd, true).pipe(inS, {end: false});
                    });
                });
                this.sinkNames.forEach((name) => {
                    const inS = this.counterStore.collectCounterIn(this.streams, name, true);
                    this.jobDescription.sinks[name].readFrom.forEach((rd) => {
                        this.createdConnections.push({from: rd, to: name});
                        this.counterStore.collectCounterOut(this.streams, rd, true).pipe(inS, {end: false});
                    });
                });
                this.db.updateJob({_id: this._id, connections: this.createdConnections});
                this.resolveCb = () => {
                    if (this.statisticCounter) {
                        clearTimeout(this.statisticCounter);
                    }
                    this.jobDescription.afterProcessing(this.jobContext, () => {
                        resolve(this);
                    });
                };

                this.rejectCb = (reason: any) => {
                    reject(reason);
                };

            });
        });
    }

    private getOrCreateReadableStream(name: string, streamDef: ISourceDescription): Readable {
        if (!this.streams['r#' + name]) {
            this.streams['r#' + name] = streamDef.get(this.jobContext);
        }
        return this.streams['r#' + name] as Readable;
    }

    private getOrCreateTransformStream(name: string, streamDef: ITransformDescription): Transform {
        if (!this.streams['t#' + name]) {
            if (streamDef) {
                this.streams['t#' + name] = streamDef.get(this.jobContext);
            }
        }
        return this.streams['t#' + name] as Transform;
    }

    private getOrCreateWritableStream(name: string, streamDef: ISinkDescription): Writable {
        if (!this.streams['w#' + name]) {
            if (streamDef) {
                this.streams['w#' + name] = streamDef.get(this.jobContext);
            }
        }
        return this.streams['w#' + name] as Writable;
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

}
