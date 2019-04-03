import { config } from 'rxjs';

export class JobToProgressBar {

    // [type]="job.progressBar.type" [value]="job.progressBar.value" [striped]="job.progressBar.striped"
    // [animated]="job.progressBar.animated"
    public static get(job: any) {
        const config = { type: 'success', animated: false, value: 0, striped: false };
        if (job.status === 'FINISHED' || job.status === 'PROCESSING') {
            config.type = 'success';
        } else {
            config.type = 'danger';
        }
        config.animated = job.status === 'PROCESSING';
        config.striped = job.progress === -1;
        config.value = job.progress !== -1 ? job.progress : 100;
        return config;
    }


}
