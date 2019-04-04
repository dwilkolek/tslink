import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InOutCounterComponent } from './in-out-counter.component';
import { DashboardComponent } from 'src/app/dashboard/dashboard.component';
import { UploadComponent } from 'src/app/upload/upload.component';
import { ManagerComponent } from 'src/app/manager/manager.component';
import { JobComponent } from '../../job.component';
import { StatsComponent } from '../stats.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from 'src/app/app-routing.module';

describe('InOutCounterComponent', () => {
  let component: InOutCounterComponent;
  let fixture: ComponentFixture<InOutCounterComponent>;

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
    fixture = TestBed.createComponent(InOutCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
