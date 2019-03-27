import { Collection, Cursor, Db, FindOneAndUpdateOption, InsertOneWriteOpResult, MongoClient, ObjectID, UpdateWriteOpResult } from 'mongodb';
import { ConfigProvider } from './config-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { IJobDefinitionDBO } from './types/job-definition-dbo';

export class DBQueries {

    private mongoDb?: Db;

    public findJobDefinitions(): Promise<Cursor<IJobDefinitionDBO>> {
        return this.jobsDefinitions.then((collection) => {
            return new Promise<Cursor<IJobDefinitionDBO>>((resolve) => {
                resolve(collection.find({}, {}));
            });
        });
    }

    public findJobConfigs(): Promise<Cursor<IJobConfig>> {
        return this.jobsConfigs.then((collection) => {
            return new Promise<Cursor<IJobConfig>>((resolve) => {
                resolve(collection.find({}, {}));
            });
        });
    }

    public findJobs(): Promise<Cursor<IJobConfig>> {
        return this.jobs.then((collection) => {
            return new Promise<Cursor<IJobConfig>>((resolve) => {
                resolve(collection.find({}, {}));
            });
        });
    }

    public storeJobDefinition(jobDefinitionDBO: IJobDefinitionDBO, callback: (insertResult: InsertOneWriteOpResult) => void) {
        this.jobsDefinitions.then((collection) => {
            collection.insertOne(jobDefinitionDBO, (err, result) => {
                callback(result);
            });
        });
    }

    public storeJobConfig(jobConfig: IJobConfig, callback: (insertResult: InsertOneWriteOpResult) => void) {
        this.jobsConfigs.then((collection) => {
            collection.insertOne(jobConfig, (err, result) => {
                callback(result);
            });
        });
    }

    public updateJob(jobDBO: IJobDBO, callback?: (updateResult: UpdateWriteOpResult) => void) {
        this.jobs.then((collection) => {
            collection.updateOne({ _id: new ObjectID(jobDBO._id) }, { $set: jobDBO }, (err, result) => {
                if (callback) {
                    callback(result);
                }
            });
        });
    }

    public storeJob(job: IJobDBO, callback: (inserResult: InsertOneWriteOpResult) => void) {
        this.jobs.then((collection) => {
            collection.insertOne(job, (err, result) => {
                callback(result);
            });
        });
    }

    public findJobByStatusAndRun(status: JobStatusEnum): Promise<IJobDBO> {
        const options: FindOneAndUpdateOption = { returnOriginal: true };
        return this.jobs.then((collection) => {
            return new Promise<IJobDBO>((resolve) => {
                collection.findOneAndUpdate({ status },
                    {
                        $set:
                            { status: JobStatusEnum.PROCESSING, startDateTime: new Date() },
                    }, options).then((data) => {
                        resolve(data.value);
                    });
            });
        });
    }

    public findJob(id: string) {
        return this.jobs.then((collection) => {
            return new Promise<IJobDBO>((resolve) => {
                collection.findOne({ _id: new ObjectID(id) }, {}).then((data) => {
                    resolve(data as IJobDBO);
                });
            });
        });
    }

    public findJobDefinition(id: string): Promise<IJobDefinitionDBO> {
        return this.jobsDefinitions.then((collection) => {
            return new Promise<IJobDefinitionDBO>((resolve) => {
                collection.findOne({ _id: new ObjectID(id) }, {}).then((data) => {
                    resolve(data as IJobDefinitionDBO);
                });
            });
        });
    }

    public findJobConfig(id: string): Promise<IJobConfig> {
        return this.jobsConfigs.then((collection: Collection<IJobConfig>) => {
            return new Promise<IJobConfig>((resolve) => {
                collection.findOne({ _id: new ObjectID(id) }, {}).then((data) => {
                    resolve(data as IJobConfig);
                });
            });
        });
    }

    private get jobsDefinitions(): Promise<Collection<IJobDefinitionDBO>> {
        return this.db.then((db) => {
            return new Promise<Collection<IJobDefinitionDBO>>((resolve) =>
                resolve(db.collection('job-definitions') as Collection<IJobDefinitionDBO>),
            );
        });
    }

    private get jobsConfigs(): Promise<Collection<IJobConfig>> {
        return this.db.then((db) => {
            return new Promise<Collection<IJobConfig>>((resolve) =>
                resolve(db.collection('job-configs') as Collection<IJobConfig>),
            );
        });
    }

    private get jobs(): Promise<Collection<IJobDBO>> {
        return this.db.then((db) => {
            return new Promise<Collection<IJobDBO>>((resolve) =>
                resolve(db.collection('job') as Collection<IJobDBO>),
            );
        });
    }

    private get db(): Promise<Db> {
        return new Promise<Db>((resolve) => {
            if (this.mongoDb) {
                resolve(this.mongoDb);
            } else {
                MongoClient.connect(ConfigProvider.get().db.url, { useNewUrlParser: true }).then((client: MongoClient) => {
                    this.mongoDb = client.db(ConfigProvider.get().db.name);
                    resolve(this.mongoDb);
                });
            }
        });
    }
}
