import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-in-out-counter',
  templateUrl: './in-out-counter.component.html',
  styleUrls: ['./in-out-counter.component.less']
})
export class InOutCounterComponent implements OnInit {
  @Input() counter;
  @Input() title;
  constructor() { }

  ngOnInit() {
  }

}
