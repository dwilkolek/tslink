import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PrettyprintPipe } from './prettyprint.pipe';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BackendService } from './backend.service';
import { JobComponent } from './job/job.component';
import { StatsComponent } from './job/stats/stats.component';
import { TimeCounterComponent } from './job/stats/time-counter/time-counter.component';
import { InOutCounterComponent } from './job/stats/in-out-counter/in-out-counter.component';
import { ManagerComponent } from './manager/manager.component';

@NgModule({
  declarations: [
    AppComponent,
    PrettyprintPipe,
    JobComponent,
    StatsComponent,
    TimeCounterComponent,
    InOutCounterComponent,
    ManagerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
