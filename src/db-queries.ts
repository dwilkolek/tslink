import { Collection, Db, FindOneAndUpdateOption, MongoClient, ObjectID } from 'mongodb';
import { ConfigProvider } from './config-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { IJobDefinitionDBO } from './types/job-definition-dbo';

export class DBQueries {

    public storeJobDefinition(jobDefinitionDBO: IJobDefinitionDBO, callback: (jobDefinitionDBO: IJobDefinitionDBO) => void) {
        this.jobsDefinitions.then((collection) => {
            collection.insertOne(jobDefinitionDBO, (result) => {
                callback(jobDefinitionDBO);
            });
        });
    }

    public storeJobConfig(jobConfig: IJobConfig, callback: (JobConfig: IJobConfig) => void) {
        this.jobsConfigs.then((collection) => {
            collection.insertOne(jobConfig, (result) => {
                callback(jobConfig);
            });
        });
    }

    public updateJob(jobDBO: IJobDBO, callback?: (jobDBO: IJobDBO) => void) {
        this.jobs.then((collection) => {
            collection.updateOne({ _id: jobDBO._id }, { $set: jobDBO }, (result) => {
                if (callback) {
                    callback(jobDBO);
                }
            });
        });
    }

    public storeJob(job: IJobDBO, callback: (job: IJobDBO) => void) {
        this.jobs.then((collection) => {
            collection.insertOne(job, (result) => {
                callback(job);
            });
        });
    }

    public findJobByStatusAndRun(status: JobStatusEnum): Promise<IJobDBO> {
        const options: FindOneAndUpdateOption = {};
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

    public findJobDefinition(_id: string): Promise<IJobDefinitionDBO> {
        return this.jobsDefinitions.then((collection) => {
            return new Promise<IJobDefinitionDBO>((resolve) => {
                collection.findOne({ _id: new ObjectID(_id) }, {}).then((data) => {
                    resolve(data as IJobDefinitionDBO);
                });
            });
        });
    }

    public findJobConfig(_id: string): Promise<IJobConfig> {
        return this.jobsConfigs.then((collection: Collection<IJobConfig>) => {
            return new Promise<IJobConfig>((resolve) => {
                collection.findOne({ _id: new ObjectID(_id) }, {}).then((data) => {
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
            MongoClient.connect(ConfigProvider.get().db.url).then((client: MongoClient) => {
                resolve(client.db(ConfigProvider.get().db.name));
            });
        });

    }

}
