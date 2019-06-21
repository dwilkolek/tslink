import { Component, ViewChild, ElementRef } from '@angular/core';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.less']
})
export class ManagerComponent {

  @ViewChild('jobDefinitionFile', { static: false })
  jobDefinitionFileInput: ElementRef;

  @ViewChild('jobConfigFile', { static: false })
  jobConfigFileInput: ElementRef;

  constructor(private backend: BackendService) {
    this.refreshAll();
  }


  jobDefinitions: any[];
  jobConfigs: any[];


  selectedJobConfig: string = null;
  selectedJobDefinition: string = null;

  jobDefinitionName: string = '';

  jobName: string = '';

  startJob() {
    if (this.selectedJobDefinition && this.selectedJobConfig && (this.jobName || '').length > 3) {
      this.backend.startJob(this.selectedJobDefinition, this.selectedJobConfig, this.jobName).subscribe((res: any) => {
        this.selectedJobConfig = null;
        this.selectedJobDefinition = null;
        alert('Job stored for execution.');
      });
    } else {
      alert('Input name and select job & config ');
    }
  }


  selectJobConfig($event, id) {
    if (id === this.selectedJobConfig) {
      this.selectedJobConfig = null;
    } else {
      this.selectedJobConfig = id;
    }
  }
  selectJobDefinition($event, id) {
    if (id === this.selectedJobDefinition) {
      this.selectedJobDefinition = null;
    } else {
      this.selectedJobDefinition = id;
    }
  }

  refreshAll() {
    this.refreshJobConfigs();
    this.refreshJobDefinitions();
  }

  refreshJobConfigs() {
    this.backend.getJobConfigs().subscribe((data) => {
      this.jobConfigs = <any[]>data;
    });
  }

  refreshJobDefinitions() {
    this.backend.getJobDefinitions().subscribe((data) => {
      this.jobDefinitions = <any[]>data;
    });
  }



  uploadJobConfig() {
    if (this.jobConfigFileInput.nativeElement.files[0]) {
      this.backend.storeJobConfig(this.jobConfigFileInput.nativeElement.files[0]).subscribe((res: any) => {
        if (res.body && res.body.id) {
          this.refreshJobConfigs();
          alert('Succesful upload');
        }
      }, err => {
        alert('Failed upload');
      });
    } else {
      alert('Select file first!');
    }
  }

  uploadJobDefinition() {
    if (this.jobDefinitionFileInput.nativeElement.files[0] && (this.jobDefinitionName || '').length > 3) {
      this.backend.storeJobDefinition(this.jobDefinitionName, this.jobDefinitionFileInput.nativeElement.files[0]).subscribe((res: any) => {
        if (res.body && res.body.id) {
          this.refreshJobDefinitions();
          alert('Succesful upload');
        }
      }, err => {
        alert('Failed upload');
      });
    } else {
      alert('Select file & name first!');
    }
  }

  // storeJob($event) {
  //   if ($event.target.files[0]) {
  //     this.backend.storeJobDefinition(this.name, $event.target.files[0]).subscribe((res: any) => {
  //       if (res.body && res.body.id) {
  //         this.jobId = res.body.id;
  //       }
  //     });
  //   }
  // }

  // storeConfig($event) {
  //   if ($event.target.files[0]) {
  //     this.backend.storeJobConfig($event.target.files[0]).subscribe((res: any) => {
  //       if (res.body && res.body.id) {
  //         this.configId = res.body.id;
  //       }
  //     });
  //   }
  // }

}
