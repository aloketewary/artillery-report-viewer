import { ReportItem } from "./report-item";

export class ReportPayload {
  aggregate?: ReportItem;
  intermediate?: Array<ReportItem>;

  constructor() {
    this.aggregate = new ReportItem();
    this.intermediate = new Array<ReportItem>();
  }
}
