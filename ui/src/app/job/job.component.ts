import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.less']
})
export class JobComponent {

  hidden = true;

  @Input() job: any;

  toggle() {
    this.hidden = !this.hidden;
  }

}
