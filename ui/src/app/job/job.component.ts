import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../backend.service';
import * as shape from 'd3-shape';
import { JobToProgressBar } from './jobToProgressBar';

declare var flowchart: any;

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.less']
})
export class JobComponent {


  curve: any = shape.curveBasis;
  view: any[];
  autoZoom: boolean = false;
  panOnZoom: boolean = false;
  enableZoom: boolean = false;
  autoCenter: boolean = true;
  showLegend: boolean = false;
  draggingEnabled: boolean = false;
  colorScheme: any = {
    domain: ['#5AA454']
  };

  hidden = true;
  job: any = null;

  updateInterval = null;

  constructor(private backend: BackendService, private activeRoute: ActivatedRoute) {

    console.log(shape);
    this.activeRoute.params.subscribe(data => {
      console.log('init');
      this.getJob(data);
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => {
        this.getJob(data);
      }, 10000);

    });
  }

  nodes: { id: string, label: string }[] = [];
  links: { source: string, target: string }[] = [];
  progressBarConfig = {};

  getJob(data) {
    this.backend.getJob(data.id).subscribe(data => {
      this.job = data;
      this.job.status = this.job.status.replace(/_/g, ' ');
      this.progressBarConfig = JobToProgressBar.get(this.job);
      this.dataForDiagram();
    });
  }

  toggle() {
    this.hidden = !this.hidden;
  }
  process = null;
  select($event) {
    this.process = $event;
  }
  dataForDiagram() {
    this.links = null;
    this.nodes = null;
    if (this.job && this.job.statistics && this.job.statistics.processes) {
      this.nodes = [];
      this.links = [];
      this.nodes = this.job.statistics.processes.map(proc => {
        proc.id = proc.name;
        proc.label = proc.name;
        return proc;
      });

      this.job.connections.forEach(element => {
        this.pushNextConnectionsToLink(element.from, element.to);
      });

      if (this.process != null) {
        const filteredNodes = this.nodes.filter(node => node.id === this.process.id);
        this.process = filteredNodes.length === 1 ? filteredNodes[0] : null;
      }
      console.log(this.links, this.nodes);
    }
  }

  private pushNextConnectionsToLink(source: string, to: any) {
    if (to) {
      to.forEach(t => {
        this.links.push({ source: source, target: t.name });
        if (t.to) {
          this.pushNextConnectionsToLink(t.name, t.to);
        }
      });
    }
  }

}
