import { Component, Input, OnInit } from '@angular/core';
import { ReportState } from '../model/report-state';
import { ReportPayload } from '../model/report-payload';
import { HttpCodeDetail } from '../model/http-code-detail';

@Component({
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss']
})
export class ScenarioComponent implements OnInit  {

  @Input() reportState?: ReportState = new ReportState();
  report?: ReportPayload;
  httpCodeDetails: Array<HttpCodeDetail>;
  networkErrors: Array<HttpCodeDetail>;

  constructor() {
    this.httpCodeDetails = new Array<HttpCodeDetail>();
    this.networkErrors = new Array<HttpCodeDetail>();
  }

  ngOnInit(): void {
    this.report = this.reportState?.report?.results;
    this.convertCodesList();
  }

  convertCodesList() {
    if (this.report) {
      Object.getOwnPropertyNames(this.report.aggregate?.codes).map((item) => {
        this.httpCodeDetails.push(new HttpCodeDetail(item, (this.report?.aggregate as any).codes[item] as number ?? 0));
      });
      Object.getOwnPropertyNames(this.report.aggregate?.errors).map((item) => {
        this.networkErrors.push(new HttpCodeDetail(item, (this.report?.aggregate as any).errors[item] as number ?? 0));
      });
    }
  }

  formatNumber(num?: number) {
    if (!num) { return null}
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  formatDate(date: any) {
    if (!date) { return null }
    return new Date(date).toLocaleString();
  }
}
