import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-time-counter',
  templateUrl: './time-counter.component.html',
  styleUrls: ['./time-counter.component.less']
})
export class TimeCounterComponent {

  @Input() counter;
  @Input() title;

}
