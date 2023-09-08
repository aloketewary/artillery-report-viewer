import { ReportPayload } from "./report-payload";

export class ReportState {
  hasCustomReportMetrics: boolean;
  isLoaded: boolean;
  report?: ReportMetrics;

  constructor() {
    this.hasCustomReportMetrics = false;
    this.isLoaded = false;
  }
}

export class ReportMetrics {
  name: string;
  version: number;
  results?: ReportPayload;

  constructor(_name: string, _version: number) {
    this.name = _name;
    this.version = _version;
    this.results = new ReportPayload();
  }
}
