import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.less']
})
export class JobComponent implements OnInit {

  hidden = true;

  @Input() job: any;
  constructor() { }

  ngOnInit() {
  }

  toggle() {
    this.hidden = !this.hidden;
  }

}
