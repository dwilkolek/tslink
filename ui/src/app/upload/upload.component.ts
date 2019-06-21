import { Component, ViewChild, ElementRef } from '@angular/core';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.less']
})
export class UploadComponent {

  @ViewChild('jobDefinitionFile', { static: true })
  jobDefinitionFileInput: ElementRef;

  @ViewChild('jobConfigFile', { static: true })
  jobConfigFileInput: ElementRef;

  constructor(private backend: BackendService) {
  }

  jobDefinitionName: string = '';

  jobName: string = '';


  uploadJobConfig() {
    if (this.jobConfigFileInput.nativeElement.files[0]) {
      this.backend.storeJobConfig(this.jobConfigFileInput.nativeElement.files[0]).subscribe((res: any) => {
        if (res.body && res.body.id) {
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
          alert('Succesful upload');
        }
      }, err => {
        alert('Failed upload');
      });
    } else {
      alert('Select file & name first!');
    }
  }

}
