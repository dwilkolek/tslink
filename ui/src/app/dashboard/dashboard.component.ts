import { Component, OnInit } from '@angular/core';
import { BackendService } from '../backend.service';
import { Router } from '@angular/router';
import { JobToProgressBar } from '../job/job-to-progress-bar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less']
})
export class DashboardComponent implements OnInit {

  constructor(private backend: BackendService, private router: Router) { }

  jobs: any[] = [];

  ngOnInit() {
    this.refreshJobs();

    setInterval(() => {
      this.refreshJobs();
    }, 10000);
  }

  refreshJobs() {
    this.backend.getJobs().subscribe((data) => {
      const _jobs = <any[]>data;
      this.jobs = _jobs.map(job => {
        job.startDatTime = job.startDatTime && new Date(job.startDatTime);
        job.endDateTime = job.endDateTime && new Date(job.endDateTime);
        job.status = job.status && job.status.replace(/_/g, ' ');
        job.progressBar = JobToProgressBar.get(job);
        return job;
      });
    });
  }

  goToJob(job: any, $event: MouseEvent) {
    if (!($event.target instanceof HTMLButtonElement)) {
      this.router.navigate([`job/${job._id}`]);
    }
  }

  private runningOperation = false;

  kill(jobId: string) {
    if (!this.runningOperation) {
      this.runningOperation = true;
      this.backend.killJob(jobId).subscribe(() => {
        this.runningOperation = false;
        alert('Killed!');
      });
    }
  }
  restoreJob(jobId: string) {
    if (!this.runningOperation) {
      this.runningOperation = true;
      this.backend.restoreJob(jobId).subscribe(() => {
        this.runningOperation = false;
        alert('Stored copy of your job!');
      });
    }
  }


}
