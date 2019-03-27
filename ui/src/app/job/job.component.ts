import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.less']
})
export class JobComponent {

  hidden = true;
  job: any = null;
  constructor(private backend: BackendService, private activeRoute: ActivatedRoute) {
    this.activeRoute.params.subscribe(data => {
      console.log(data);
      this.backend.getJob(data.id).subscribe(data => {
        this.job = data;
      });
    });
  }

  toggle() {
    this.hidden = !this.hidden;
  }

}
