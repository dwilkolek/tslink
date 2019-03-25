import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-in-out-counter',
  templateUrl: './in-out-counter.component.html',
  styleUrls: ['./in-out-counter.component.less']
})
export class InOutCounterComponent {
  @Input() counter;
  @Input() title;

}
