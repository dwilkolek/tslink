import * as cluster from 'cluster';
import { FilterQuery } from 'mongodb';
import { setInterval } from 'timers';
import { JobStatusEnum } from './job-status-enum';
import { IJobDBO } from './types/job-dbo';
import { TSlinkWorker } from './worker';

export class DbJobProcessor extends TSlinkWorker {

    private Q_OUT_OF_SYNC_JOBS: FilterQuery<IJobDBO> = {
        status: {
            $in: [JobStatusEnum.PROCESSING, JobStatusEnum.FAILED, JobStatusEnum.FINISHED, JobStatusEnum.ABANDONED_BY_PROCESS],
        },
    };

    private Q_FIND_SYNCHRONIZED_JOBS_TO_RECOVER: FilterQuery<IJobDBO> = {
        $and:
            [
                { 'config.recoverOnFail': true },
                { status: { $in: [JobStatusEnum.FAILED_SYNCHRONIZED, JobStatusEnum.ABANDONED_BY_PROCESS_SYNCHRONIZED] } },
            ],
    };

    private deleteRedisKeysStatus = [
        JobStatusEnum.FINISHED, JobStatusEnum.ABANDONED_BY_PROCESS, JobStatusEnum.FAILED,
    ];

    private chainTimeout?: NodeJS.Timeout;
    constructor(private masterPid: number) {
        super();

    }

    public start() {
        this.runChain().then(() => {
            this.chainTimeout = this.setTimeoutChain();
        });
    }

    private Q_FIND_ABBANDONED_JOBS(): FilterQuery<IJobDBO> {
        return {
            $and:
                [
                    {
                        processId: {
                            $nin: Object.keys(cluster.workers).map((workerKey) => {

                                let pid = -1;
                                const worker = cluster.workers[workerKey];
                                if (worker != null) {
                                    if (this.masterPid !== worker.process.pid) {
                                        pid = worker.process.pid;
                                    }
                                }
                                return pid;
                            }),
                        },

                    },
                    {
                        status: JobStatusEnum.PROCESSING,
                    },
                ],
        };
    }
    private setTimeoutChain() {
        return setTimeout(() => {
            this.runChain().then(() => {
                this.chainTimeout = this.setTimeoutChain();
            });
        }, 10000);
    }

    private runChain() {
        return this.abbandonJobs().then(() => {
            return this.updateJobsOutOfSync();
        }).then(() => {
            return this.recoverSynchronizedJobs();
        });
    }

    private async updateJobsOutOfSync() {
        const cursor = await this.db.findJobs(this.Q_OUT_OF_SYNC_JOBS);

        while (await cursor.hasNext()) {
            const jobdbo = await cursor.next();
            if (jobdbo != null && jobdbo._id != null) {
                const redisValue = await this.redis.get().get(jobdbo._id);
                if (jobdbo.status != null) {
                    const updateJobObj = {
                        _id: jobdbo._id, offset: redisValue != null ? JSON.parse(redisValue) : null, status: jobdbo.status,
                    };
                    if (JobStatusEnum.FINISHED === jobdbo.status) {
                        updateJobObj.status = JobStatusEnum.FINISHED_SYNCHRONIZED;
                    }
                    if (JobStatusEnum.ABANDONED_BY_PROCESS === jobdbo.status) {
                        updateJobObj.status = JobStatusEnum.ABANDONED_BY_PROCESS_SYNCHRONIZED;
                    }
                    if (JobStatusEnum.FAILED === jobdbo.status) {
                        updateJobObj.status = JobStatusEnum.FAILED_SYNCHRONIZED;
                    }
                    const updatedOffset = await this.db.updateJob(updateJobObj);
                    if (jobdbo.status != null && this.deleteRedisKeysStatus.indexOf(jobdbo.status) > -1) {
                        await this.redis.get().del(jobdbo._id);
                    }
                }
            }
        }
    }

    private async recoverSynchronizedJobs() {
        const cursor = await this.db.findJobs(this.Q_FIND_SYNCHRONIZED_JOBS_TO_RECOVER);
        while (await cursor.hasNext()) {
            const jobdbo = await cursor.next();
            if (jobdbo != null) {
                if (jobdbo.status === JobStatusEnum.FAILED_SYNCHRONIZED) {
                    jobdbo.status = JobStatusEnum.FAILED_SYNCHRONIZED_RESTORED;
                }
                if (jobdbo.status === JobStatusEnum.ABANDONED_BY_PROCESS_SYNCHRONIZED) {
                    jobdbo.status = JobStatusEnum.ABANDONED_BY_PROCESS_SYNCHRONIZED_RESTORED;
                }
                jobdbo.endDateTime = new Date();
                await this.db.updateJob(jobdbo);
                console.log(`moved to abandoned ${jobdbo._id} and restore later`);
                const jobCopy = JSON.parse(JSON.stringify(jobdbo)) as IJobDBO;
                delete jobCopy._id;
                jobCopy.status = JobStatusEnum.STORED;
                jobCopy.previousJob_id = jobdbo._id;
                await this.db.storeJob(jobCopy);
                console.log(`restored job ${jobdbo._id} -> ${jobCopy._id}`);
            }
        }
    }

    private async abbandonJobs() {
        const cursor = await this.db.findJobs(this.Q_FIND_ABBANDONED_JOBS());
        while (await cursor.hasNext()) {
            const jobdbo = await cursor.next();
            if (jobdbo != null) {
                jobdbo.endDateTime = new Date();
                jobdbo.status = JobStatusEnum.ABANDONED_BY_PROCESS;
                await this.db.updateJob(jobdbo);
                console.log(`moved to abandoned ${jobdbo._id}, ${jobdbo.status}`);
            }
        }
    }
}
