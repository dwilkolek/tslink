import { Component } from '@angular/core';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.less']
})
export class ManagerComponent {

  constructor(private backend: BackendService) { }

  name: string;
  jobId: string;
  configId: string;
  jobDBO: any;

  storeJob($event) {
    if ($event.target.files[0]) {
      this.backend.storeJob(this.name, $event.target.files[0]).subscribe((res: any) => {
        if (res.body && res.body.id) {
          this.jobId = res.body.id;
        }
      });
    }
  }

  storeConfig($event) {
    if ($event.target.files[0]) {
      this.backend.storeConfig($event.target.files[0]).subscribe((res: any) => {
        if (res.body && res.body.id) {
          this.configId = res.body.id;
        }
      });
    }
  }

  startJob() {
    this.backend.startJob(this.jobId, this.configId).subscribe((res: any) => {
      if (res) {
        this.jobDBO = res;
      }
    });
  }
}
