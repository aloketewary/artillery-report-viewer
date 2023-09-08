import { ReportPhase } from "./report-phase";

export class ReportItem {
  timestamp?: Date;
  scenariosCreated?: number;
  scenariosCompleted?: number;
  requestsCompleted?: number;
  histograms?: object;
  latency?: Latency;
  rps?: Rps;
  scenarioDuration?: ScenarioDuration;
  scenarioCounts?: object;
  errors?: object;
  codes?: object;
  matches?: number;
  customStats?: object;
  counters?: object;
  scenariosAvoided?: number;
  phases?: Array<ReportPhase>;


  constructor() {
    this.latency = new Latency();
    this.rps = new Rps();
    this.scenarioCounts = {};
    this.errors = {};
    this.codes = {};
    this.counters = {};
    this.customStats = {};
    this.histograms = {};
    this.scenarioDuration = new ScenarioDuration();
    this.phases = new Array<ReportPhase>();
  }
}

export class Latency {
  min?: number;
  max?: number;
  median?: number;
  p95?: number;
  p99?: number;
  p50?: number;
}

export class Rps {
  count?: number;
  mean?: number;
}

export class ScenarioDuration {
  min?: number;
  max?: number;
  median?: number;
  p95?: number;
  p99?: number;
}
