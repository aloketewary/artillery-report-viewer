import { Component, Input, OnInit } from '@angular/core';
import { Overview } from '../../../model/overview';
import { ReportItem } from '../../../model/report-item';
import { ReportState } from '../../../model/report-state';
import { ReportPayload } from '../../../model/report-payload';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit {
  overview: Overview;
  @Input() reportState?: ReportState = new ReportState();
  @Input() isDarkMode = false;

  constructor() {
    this.overview = new Overview();
  }

  ngOnInit(): void {
    const result = this.reportState?.report?.results;
    this.overview.avgLoad = result?.aggregate?.rps?.mean ?? 0;
    this.overview.responseTime = result?.aggregate?.latency?.median ?? 0;
    this.overview.badReqCount = this.getBadRequestCount(result?.aggregate);
    this.overview.serverErrCount = this.getServerErrorCount(result?.aggregate);
    this.overview.httpCodeCount = this.getHttpCodeCount(result?.aggregate);
    this.overview.networkErrCount = this.getNetworkErrorCount(result?.aggregate);
    this.overview.successPercent = this.getSuccessPercent(result?.aggregate);
    this.overview.health = this.calculateHealthData(result);
    this.overview.performance = this.calculatePerfData(result);
    this.overview.overallRating = this.calculateOverAllRating();
  }

  calculateOverAllRating(): number {
    let overallRate = 0;
    const healthText = this.convertHealthRatingToText(this.overview.health ?? 0);
    const perfText = this.convertPerfRatingToText(this.overview.performance ?? 0);
    if (healthText === 'Healthy' && perfText === 'Lightning') {
      overallRate = 5;
    } else if ((healthText === 'Moderate' && perfText === 'Lightning') || (healthText === 'Healthy' && perfText === 'Fast')) {
      overallRate = 4.5;
    } else if (healthText === 'Moderate' && perfText === 'Fast') {
      overallRate = 4;
    } else if ((healthText === 'Somewhat Healthy' && perfText === 'Fast') || (healthText === 'Moderate' && perfText === 'Moderate')) {
      overallRate = 3.5;
    } else if (healthText === 'Somewhat Healthy' && perfText === 'Moderate') {
      overallRate = 3;
    } else if ((healthText === 'Unstable' && perfText === 'Moderate') || (healthText === 'Somewhat Healthy' && perfText === 'Slow')) {
      overallRate = 2;
    } else if (healthText === 'Unhealthy' && perfText === 'Slow') {
      overallRate = 1;
    }
    return overallRate;
  }

  calculateHealthData(result?: ReportPayload): number {
    const networkErrorCount = this.getNetworkErrorCount(result?.aggregate);
    return this.healthStatusRating(this.overview.successPercent ?? 0, networkErrorCount);
  }

  calculatePerfData(result?: ReportPayload): number {
    const rpsPoint = 250;
    const rpsGain = 20;
    const responseTimeCost = 120;
    let rpsTotal = 0;
    let totalResponseTimePoint = 0;

    result?.intermediate?.forEach((item) => {
      rpsTotal += ((item.rps?.mean ?? 0) / 5) * rpsPoint;
      const currentResponseTime = item.latency?.median ?? 0;
      if (currentResponseTime >= 30000) {
        totalResponseTimePoint -= 1000;
      } else if (currentResponseTime > 500) {
        totalResponseTimePoint -= 80;
      } else {
        totalResponseTimePoint += 150;
      }
    });

    return totalResponseTimePoint - ((rpsTotal / rpsGain) - responseTimeCost);
  }

  healthStatusRating(successRate: number, networkIssueCount: number): number {
    const baseRating = 1000;
    const networkErrorCost = 20;
    const successRatingCost = 120;
    const successRateDetraction = Math.floor((100 - Math.floor(successRate)) / 10) * successRatingCost;
    return baseRating - successRateDetraction - (networkIssueCount * networkErrorCost);
  }

  getSuccessPercent(aggregate?: ReportItem): number {
    if (!aggregate) {
      return 0;
    }
    const totalErrors = (this.overview.badReqCount ?? 0)
      + (this.overview.serverErrCount ?? 0)
      + (this.overview.networkErrCount ?? 0);
    const reportedResponses = (this.overview.httpCodeCount ?? 0) + (this.overview.networkErrCount ?? 0);
    const totalRequests = reportedResponses || aggregate.requestsCompleted || 0;
    if (totalRequests === 0) {
      return 0;
    }
    return Math.max(0, Math.round(((totalRequests - totalErrors) / totalRequests) * 100));
  }

  getBadRequestCount(aggregate?: ReportItem): number {
    return this.sumCodes(aggregate, (code) => code >= 400 && code < 500);
  }

  getServerErrorCount(aggregate?: ReportItem): number {
    return this.sumCodes(aggregate, (code) => code >= 500 && code < 600);
  }

  getHttpCodeCount(aggregate?: ReportItem): number {
    return this.sumCodes(aggregate, () => true);
  }

  getNetworkErrorCount(aggregate?: ReportItem): number {
    return Object.values(aggregate?.errors ?? {}).reduce((total, value) => total + this.toCount(value), 0);
  }

  formatNumber(num?: number): string | null {
    if (num === undefined || num === null) {
      return null;
    }
    return num.toLocaleString();
  }

  convertHealthRatingToText(num: number): string {
    if (num > 900) { return 'Healthy'; }
    if (num > 700) { return 'Moderate'; }
    if (num > 500) { return 'Somewhat Healthy'; }
    if (num < 0) { return 'Unstable'; }
    return 'Unhealthy';
  }

  convertPerfRatingToText(num: number): string {
    if (num > 2000) { return 'Lightning'; }
    if (num > 1000) { return 'Fast'; }
    if (num > 500) { return 'Moderate'; }
    return 'Slow';
  }

  private sumCodes(aggregate: ReportItem | undefined, predicate: (code: number) => boolean): number {
    return Object.entries(aggregate?.codes ?? {}).reduce((total, [key, value]) => {
      const code = Number(key);
      return Number.isFinite(code) && predicate(code) ? total + this.toCount(value) : total;
    }, 0);
  }

  private toCount(value: unknown): number {
    const count = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(count) ? count : 0;
  }
}
