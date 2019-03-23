import { ConfigProvider } from "./config-provider";
import { JobDefinitionDBO } from "./db/job-definition-dbo";
import { JobConfigDBO } from "./db/job-config-dbo";
import { JobStatusEnum } from "./job-status-enum";
import { JobDBO } from "./db/job-dbo";

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const fs = require('fs');

export class Db {
    _db: any;

    public storeJobDefinition(jobDefinitionDBO: JobDefinitionDBO, callback: (jobDefinitionDBO: JobDefinitionDBO) => void) {
        this.jobsDefinitions.then((collection: any) => {
            collection.insertOne(jobDefinitionDBO, (err: any, res: any) => {
                callback(jobDefinitionDBO);
            });
        })
    }

    public storeJobConfig(jobConfig: JobConfigDBO, callback: (jobConfigDBO: JobConfigDBO) => void) {
        this.jobsConfigs.then((collection: any) => {
            collection.insertOne(jobConfig, (err: any, res: any) => {
                callback(jobConfig);
            });
        })
    }

    public storeJob(job: JobDBO, callback: (job: JobDBO) => void) {
        this.jobs.then((collection: any) => {
            collection.insertOne(job, (err: any, res: any) => {
                callback(job);
            });
        })
    }

    public findJobByStatusAndRun(status: JobStatusEnum) {
        return this.jobs.then((collection: any) => {
            return new Promise<JobDBO>(resolve => {
                collection.findOneAndUpdate({ "status": 'READY' }, { $set: { "status": JobStatusEnum.PROCESSING, startDateTime: new Date() } }, { returnNewDocument: true }, (err: any, doc: any) => {
                    resolve(<JobDBO>doc.value);
                });
            })
        })
    }

    public findJobDefinition(_id: string): Promise<JobDefinitionDBO> {
        return this.jobsDefinitions.then((collection: any) => {
            return new Promise<JobDefinitionDBO>(resolve => {
                collection.findOne({ "_id": new ObjectId(_id) }, (err: any, doc: JobDefinitionDBO) => {
                    resolve(<JobDefinitionDBO>doc);
                });
            })
        })
    }

    public findJobConfig(_id: string): Promise<JobConfigDBO> {
        return this.jobsConfigs.then((collection: any) => {
            return new Promise<JobConfigDBO>(resolve => {
                collection.findOne({ "_id": new ObjectId(_id) }, (err: any, doc: JobConfigDBO) => {
                    resolve(<JobConfigDBO>doc);
                });
            })
        })
    }


    private get jobsDefinitions() {
        return this.db.then(db => {
            return new Promise(resolve =>
                resolve(db.collection('job-definitions'))
            );
        })
    }

    private get jobsConfigs() {
        return this.db.then(db => {
            return new Promise(resolve =>
                resolve(db.collection('job-configs'))
            );
        })
    }

    private get jobs() {
        return this.db.then(db => {
            return new Promise(resolve =>
                resolve(db.collection('job'))
            );
        })
    }
    // private get jobs() {

    // }

    private get db(): Promise<any> {
        return new Promise(resolve => {
            if (!this._db) {
                MongoClient.connect(ConfigProvider.get().db.url, (err: any, client: any) => {
                    console.log("Connected successfully to server");
                    this._db = client.db(ConfigProvider.get().db.name);

                    resolve(this._db);
                });
            } else {
                resolve(this._db);
            }

        })

    }

}