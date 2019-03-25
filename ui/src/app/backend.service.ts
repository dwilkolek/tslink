import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private http: HttpClient) {
  }

  getStats() {
    return this.http.get(`${environment.apiUrl}stats`);
  }

  storeJob(name: string, file: File) {
    const formData = new FormData();
    formData.append('job', file);
    formData.append('name', name);
    const params = new HttpParams();

    const options = {
      params: params,
      reportProgress: true,
    };

    const req = new HttpRequest('POST', `${environment.apiUrl}job`, formData, options);
    return this.http.request(req);
  }
  storeConfig(file: File) {
    const formData = new FormData();
    formData.append('config', file);

    const params = new HttpParams();

    const options = {
      params: params,
      // reportProgress: true,
      // responseType: 'json'
    };

    const req = new HttpRequest('POST', `${environment.apiUrl}config`, formData, options);
    return this.http.request(req);
  }
  startJob(jobId: string, configId: string) {
    let params = new HttpParams();
    params = params.set('jobId', jobId);
    params = params.set('configId', configId);
    const options = {
      params: params,
    };
    return this.http.post(`${environment.apiUrl}job/start`, {}, options);
  }
}
