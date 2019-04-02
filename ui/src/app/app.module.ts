import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BackendService } from './backend.service';
import { JobComponent } from './job/job.component';
import { StatsComponent } from './job/stats/stats.component';
import { TimeCounterComponent } from './job/stats/time-counter/time-counter.component';
import { InOutCounterComponent } from './job/stats/in-out-counter/in-out-counter.component';
import { ManagerComponent } from './manager/manager.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DashboardComponent } from './dashboard/dashboard.component';

import defaultLocale from '@angular/common/locales/en';
import { registerLocaleData } from '@angular/common';

import { NgxGraphModule } from '@swimlane/ngx-graph';

registerLocaleData(defaultLocale, 'en');

@NgModule({
  declarations: [
    AppComponent,
    JobComponent,
    StatsComponent,
    TimeCounterComponent,
    InOutCounterComponent,
    ManagerComponent,
    SidebarComponent,
    DashboardComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    NgbModule,
    NgxGraphModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
