import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from './dashboard.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from '../app-routing.module';
import { UploadComponent } from '../upload/upload.component';
import { ManagerComponent } from '../manager/manager.component';
import { JobComponent } from '../job/job.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { StatsComponent } from '../job/stats/stats.component';
import { InOutCounterComponent } from '../job/stats/in-out-counter/in-out-counter.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

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
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
