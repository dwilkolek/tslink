import {
    Collection, Cursor, Db, FilterQuery, FindOneAndUpdateOption,
    InsertOneWriteOpResult, MongoClient, ObjectID, UpdateWriteOpResult,
} from 'mongodb';
import * as process from 'process';
import { ConfigProvider } from './config-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { IJobDefinitionDBO } from './types/job-definition-dbo';

export class DBQueries {

    private mongoDb?: Db;

    public async findJobDefinitions(): Promise<Cursor<IJobDefinitionDBO>> {
        const collection = await this.jobsDefinitions();
        return new Promise((resolve) => { resolve(collection.find({}, {})); });
    }

    public async findJobConfigs(): Promise<Cursor<IJobConfig>> {
        const collection = await this.jobConfigs();
        return new Promise((resolve) => { collection.find({}, {}); });
    }

    public async findJobs(query: FilterQuery<IJobDBO> = {}): Promise<Cursor<IJobDBO>> {
        const collection = await this.jobs();
        return collection.find(query, {});
    }

    public async storeJobDefinition(jobDefinitionDBO: IJobDefinitionDBO) {
        const collection = await this.jobsDefinitions();
        return collection.insertOne(jobDefinitionDBO);
    }

    public async storeJobConfig(jobConfig: IJobConfig) {
        const collection = await this.jobConfigs();
        return collection.insertOne(jobConfig);
    }

    public async updateJob(jobDBO: IJobDBO, callback?: (updateResult: UpdateWriteOpResult) => void) {
        const collection = await this.jobs();
        return collection.updateOne({ _id: new ObjectID(jobDBO._id) }, { $set: jobDBO });
    }

    public async storeJob(job: IJobDBO) {
        const collection = await this.jobs();
        return collection.insertOne(job);
    }

    public async findJobByStatusAndRun(status: JobStatusEnum): Promise<IJobDBO> {
        const options: FindOneAndUpdateOption = { returnOriginal: true };
        const collection = await this.jobs();
        return new Promise<IJobDBO>((resolve) => {
            collection.findOneAndUpdate({ status },
                {
                    $set:
                        { status: JobStatusEnum.PROCESSING, startDateTime: new Date(), processId: process.pid },
                }, options).then((data) => {
                    resolve(data.value);
                });
        });
    }

    public async findJob(id: string): Promise<IJobDBO | null> {
        const collection = await this.jobs();
        return collection.findOne({ _id: new ObjectID(id) }, {});
    }

    public async findJobDefinition(id: string): Promise<IJobDefinitionDBO | null> {
        const collection = await this.jobsDefinitions();
        return collection.findOne({ _id: new ObjectID(id) }, {});
    }

    public async findJobConfig(id: string): Promise<IJobConfig | null> {
        const collection = await this.jobConfigs();
        return collection.findOne({ _id: new ObjectID(id) }, {});
    }

    private async jobsDefinitions(): Promise<Collection<IJobDefinitionDBO>> {
        const db = await this.db;
        return new Promise<Collection<IJobDefinitionDBO>>((resolve) =>
            resolve(db.collection('job-definitions') as Collection<IJobDefinitionDBO>),
        );
    }

    private async jobConfigs(): Promise<Collection<IJobConfig>> {
        const db = await this.db;
        return new Promise<Collection<IJobConfig>>((resolve) =>
            resolve(db.collection('job-configs') as Collection<IJobConfig>),
        );
    }

    private async jobs(): Promise<Collection<IJobDBO>> {
        const db = await this.db;
        return new Promise<Collection<IJobDBO>>((resolve) =>
            resolve(db.collection('job') as Collection<IJobDBO>),
        );
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
