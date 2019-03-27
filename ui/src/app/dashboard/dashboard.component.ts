import { Component, OnInit } from '@angular/core';
import { BackendService } from '../backend.service';
import { Router } from '@angular/router';

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
        return job;
      });
    });
  }

  goToJob(job: any) {
    this.router.navigate([`job/${job._id}`]);
  }

}
