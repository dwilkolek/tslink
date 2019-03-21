import { Component, OnInit, Input } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-time-counter',
  templateUrl: './time-counter.component.html',
  styleUrls: ['./time-counter.component.less']
})
export class TimeCounterComponent implements OnInit {

  @Input() counter;
  @Input() title;

  constructor() { }

  ngOnInit() {
  }

}
