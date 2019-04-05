import { config } from 'rxjs';

export class JobToProgressBar {

    // [type]="job.progressBar.type" [value]="job.progressBar.value" [striped]="job.progressBar.striped"
    // [animated]="job.progressBar.animated"

    private static statusToColor = {
        KILLED: 'danger',
        FAILED: 'danger',
        FAILED_SYNCHRONIZED: 'danger',
        FAILED_SYNCHRONIZED_RESTORED: 'warn',
        FAILED_TO_START: 'danger',
        FINISHED: 'info',
        FINISHED_SYNCHRONIZED: 'success',
        STORED: 'success',
        PROCESSING: 'success',
        ABANDONED_BY_PROCESS: 'danger',
        ABANDONED_BY_PROCESS_SYNCHRONIZED: 'danger',
        ABANDONED_BY_PROCESS_SYNCHRONIZED_RESTORED: 'warn'
    };



    public static get(job: any) {
        const config = { type: 'success', animated: false, value: 0, striped: false };
        config.type = this.statusToColor[job.status.replace(/ /g, '_')];
        config.animated = job.status === 'PROCESSING';
        config.striped = job.progress === -1;
        config.value = job.progress !== -1 ? job.progress : 100;
        return config;
    }


}
