import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsComponent } from './stats.component';
import { DashboardComponent } from 'src/app/dashboard/dashboard.component';
import { UploadComponent } from 'src/app/upload/upload.component';
import { ManagerComponent } from 'src/app/manager/manager.component';
import { JobComponent } from '../job.component';
import { InOutCounterComponent } from './in-out-counter/in-out-counter.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from 'src/app/app-routing.module';

describe('StatsComponent', () => {
  let component: StatsComponent;
  let fixture: ComponentFixture<StatsComponent>;

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
    fixture = TestBed.createComponent(StatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
