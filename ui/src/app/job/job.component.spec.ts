import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JobComponent } from './job.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { UploadComponent } from '../upload/upload.component';
import { ManagerComponent } from '../manager/manager.component';
import { InOutCounterComponent } from './stats/in-out-counter/in-out-counter.component';
import { StatsComponent } from './stats/stats.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from '../app-routing.module';

describe('JobComponent', () => {
  let component: JobComponent;
  let fixture: ComponentFixture<JobComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardComponent, UploadComponent, ManagerComponent, JobComponent, StatsComponent, InOutCounterComponent],
      imports: [
        NgbModule,
        NgxGraphModule,
        HttpClientModule,
        AppRoutingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
