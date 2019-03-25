import { ConfigProvider } from "./config-provider";

import { JobStatusEnum } from "./job-status-enum";
import { JobDefinitionDBO } from "./types/job-definition-dbo";
import { JobDBO } from "./types/job-dbo";
import { JobConfig } from "./types/job-config";

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

    public storeJobConfig(jobConfig: JobConfig, callback: (JobConfig: JobConfig) => void) {
        this.jobsConfigs.then((collection: any) => {
            collection.insertOne(jobConfig, (err: any, res: any) => {
                callback(jobConfig);
            });
        })
    }

    public updateJob(jobDBO: JobDBO, callback?: (jobDBO: JobDBO) => void) {
        this.jobs.then((collection: any) => {
            collection.updateOne({ _id: jobDBO._id }, { $set: jobDBO }, function (err, res) {
                callback && callback(jobDBO);
            })
        });
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
                        collection.findOneAndUpdate({ "status": status }, { $set: { "status": JobStatusEnum.PROCESSING, startDateTime: new Date() } }, { returnNewDocument: true }, (err: any, doc: any) => {
                            resolve(<JobDBO>doc.value);
                        });
                    })
                })
            }

    public findJobDefinition(_id: string): Promise < JobDefinitionDBO > {
                return this.jobsDefinitions.then((collection: any) => {
                    return new Promise<JobDefinitionDBO>(resolve => {
                        collection.findOne({ "_id": new ObjectId(_id) }, (err: any, doc: JobDefinitionDBO) => {
                            resolve(<JobDefinitionDBO>doc);
                        });
                    })
                })
            }

    public findJobConfig(_id: string): Promise < JobConfig > {
                return this.jobsConfigs.then((collection: any) => {
                    return new Promise<JobConfig>(resolve => {
                        collection.findOne({ "_id": new ObjectId(_id) }, (err: any, doc: JobConfig) => {
                            resolve(<JobConfig>doc);
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

    private get db(): Promise < any > {
                return new Promise(resolve => {
                    if (!this._db) {
                        MongoClient.connect(ConfigProvider.get().db.url, (err: any, client: any) => {
                            this._db = client.db(ConfigProvider.get().db.name);
                            resolve(this._db);
                        });
                    } else {
                        resolve(this._db);
                    }

                })

            }

}