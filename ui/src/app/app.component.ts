import { Component } from '@angular/core';
import { BackendService } from './backend.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
})
export class AppComponent {
  title = 'frontend';
  stats = [];
  date = new Date();
  // constructor(private backend: BackendService) {
  //   console.log('_');
  //   // this.backend.getStats().subscribe(data => {
  //   //   this.stats = <any[]>data;
  //   //   this.date = new Date();
  //   // });
  //   // setInterval(() => {
  //   //   this.backend.getStats().subscribe(data => {
  //   //     this.stats = <any[]>data;
  //   //     this.date = new Date();
  //   //   });
  //   // }, 10000)

  // }


}
