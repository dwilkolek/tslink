import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private http: HttpClient) {
  }

  getJobs() {
    return this.http.get(`${environment.apiUrl}job`);
  }

  getJobConfigs() {
    return this.http.get(`${environment.apiUrl}job-config`);
  }

  getJobDefinitions() {
    return this.http.get(`${environment.apiUrl}job-definition`);
  }

  getJob(id: string) {
    return this.http.get(`${environment.apiUrl}job/${id}`);
  }

  storeJobDefinition(name: string, file: File) {
    const formData = new FormData();
    formData.append('job', file);
    formData.append('name', name);
    const params = new HttpParams();

    const options = {
      params: params,
      reportProgress: true,
    };

    const req = new HttpRequest('POST', `${environment.apiUrl}job-definition`, formData, options);
    return this.http.request(req);
  }
  storeJobConfig(file: File) {
    const formData = new FormData();
    formData.append('config', file);

    const params = new HttpParams();

    const options = {
      params: params,
      // reportProgress: true,
      // responseType: 'json'
    };

    const req = new HttpRequest('POST', `${environment.apiUrl}job-config`, formData, options);
    return this.http.request(req);
  }
  startJob(jobId: string, configId: string) {
    let params = new HttpParams();
    params = params.set('jobId', jobId);
    params = params.set('configId', configId);
    const options = {
      params: params,
    };
    return this.http.post(`${environment.apiUrl}job/start`, {'jobId': jobId, 'configId': configId}, options);
  }
}
