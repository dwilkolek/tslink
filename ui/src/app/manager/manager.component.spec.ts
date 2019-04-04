import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from '../dashboard/dashboard.component';
import { UploadComponent } from '../upload/upload.component';
import { ManagerComponent } from '../manager/manager.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from '../app-routing.module';
import { JobComponent } from '../job/job.component';
import { StatsComponent } from '../job/stats/stats.component';
import { InOutCounterComponent } from '../job/stats/in-out-counter/in-out-counter.component';

describe('ManagerComponent', () => {
  let component: ManagerComponent;
  let fixture: ComponentFixture<ManagerComponent>;

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
    fixture = TestBed.createComponent(ManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
