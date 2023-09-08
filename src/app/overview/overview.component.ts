import { Component, Input, OnInit } from '@angular/core';
import { Overview } from '../model/overview';
import { ReportItem } from '../model/report-item';
import { ReportState } from '../model/report-state';
import { ReportPayload } from '../model/report-payload';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  overview: Overview;
  @Input() reportState?: ReportState = new ReportState();
  @Input() isDarkMode: boolean = false;

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

  calculateOverAllRating(): any {
    let overAllRate = 0;
    const healthText = this.convertHealthRatingToText(this.overview.health ?? 0);
    const perfText = this.convertPerfRatingToText(this.overview.performance ?? 0);
    if (healthText === 'Healthy' && perfText === 'Lightning') {
      overAllRate = 5;
    } else if ((healthText === 'Moderate' && perfText === 'Lightning') || (healthText === 'Healthy' && perfText === 'Fast')) {
      overAllRate = 4.5;
    } else if (healthText === 'Moderate' && perfText === 'Fast') {
      overAllRate = 4;
    } else if ((healthText === 'Somewhat Healthy' && perfText === 'Fast') || (healthText === 'Moderate' && perfText === 'Moderate')) {
      overAllRate = 3.5;
    } else if (healthText === 'Somewhat Healthy' && perfText === 'Moderate') {
      overAllRate = 3;
    } else if ((healthText === 'Unstable' && perfText === 'Moderate') || (healthText === 'Somewhat Healthy' && perfText === 'Slow')) {
      overAllRate = 2;
    } else if (healthText === 'Unhealthy' && perfText === 'Slow') {
      overAllRate = 1;
    }
    return overAllRate;
  }

  calculateHealthData(result?: ReportPayload): number {
    if(result?.aggregate?.errors === undefined) {
      return 0;
    }
    let networkErrorCount = 0;
    Object.getOwnPropertyNames(result?.aggregate?.errors).map((err, i) => {
      networkErrorCount += parseInt((result.aggregate  as any).errors[err], 0);
    });
    const rating = this.healthStatusRating(
      this.overview.successPercent ?? 0,
      networkErrorCount
    )
    return rating;
  }

  calculatePerfData(result?: ReportPayload): number {
    if(result?.aggregate?.errors === undefined) {
      return 0;
    }
    const baseRating = 1000;
    const rpsGain = 20;
    const respTimeCost = 120;
    const respTimeGain = 200;
    const rpsPt = 250;
    let rpsTotal = 0;
    let totalRespTimePoint = 0;
    result.intermediate?.forEach((item) => {
      rpsTotal += (item.rps?.mean ?? 0 / 5) * rpsPt;
      let currentResp = (item.latency?.median ?? 0);
      if(currentResp >= 30000) {
        totalRespTimePoint -= 1000;
      } else if (currentResp > 500) {
        totalRespTimePoint -= 80;
      } else {
        totalRespTimePoint += 150;
      }
    });
    return totalRespTimePoint - ((rpsTotal/rpsGain) - respTimeCost);
  }

  healthStatusRating(successRate: number, networkIssueCount: number) {
    const baseRating = 1000;
    const networkErrCost = 20;
    const successRatingCost = 120;
    const successRateDetractionRating = Math.floor((100 - Math.floor(successRate)) / 10) * successRatingCost;
    const errorDistractionRate = networkIssueCount * networkErrCost;
    return baseRating - successRateDetractionRating - errorDistractionRate;
  }

  getSuccessPercent(aggrigate?: ReportItem): number {
    if(aggrigate?.requestsCompleted === undefined) {
      return 0;
    }
    const totalErrors = (this.overview.badReqCount ?? 0) + (this.overview.serverErrCount ?? 0) + (this.overview.networkErrCount ?? 0);
    const totalReq = (this.overview.httpCodeCount ?? 0) + (this.overview.networkErrCount ?? 0);
    return Math.round(((totalReq - totalErrors) / totalReq) * 100);
  }

  getBadRequestCount(aggrigate?: ReportItem) {
    let count = 0;
    if (aggrigate) {
      Object.getOwnPropertyNames(aggrigate?.codes).map((item, i) => {
        if(parseInt(item, 0) >= 400 && parseInt(item, 0) < 500) {
          count += parseInt((aggrigate as any).codes[item] ?? 0, 0);
        }
      });
    }
    return count;
  }

  getServerErrorCount(aggrigate?: ReportItem) {
    let count = 0;
    if (aggrigate) {
      Object.getOwnPropertyNames(aggrigate?.codes).map((item, i) => {
        if(parseInt(item, 0) >= 500) {
          count += parseInt((aggrigate as any).codes[item] ?? 0, 0);
        }
      });
    }
    return count;
  }

  getHttpCodeCount(aggrigate?: ReportItem) {
    let count = 0;
    if (aggrigate) {
      Object.getOwnPropertyNames(aggrigate?.codes).map((item, i) => {
        count += parseInt((aggrigate as any).codes[item] ?? 0, 0);
      });
    }
    return count;
  }

  getNetworkErrorCount(aggrigate?: ReportItem) {
    let count = 0;
    if (aggrigate) {
      Object.getOwnPropertyNames(aggrigate?.errors).map((item, i) => {
        count += parseInt((aggrigate as any).errors[item] ?? 0, 0);
      });
    }
    return count;
  }

  formatNumber(num?: number) {
    if (!num) { return null}
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  convertHealthRatingToText(num: number) {
    if(num > 900) {return 'Healthy'}
    if(num > 700) {return 'Moderate'}
    if(num > 500) {return 'Somewhat Healthy'}
    if(num < 0) {return 'Unstable'}
    return 'Unhealthy'

  }

  convertPerfRatingToText(num: number) {
    if(num > 2000) {return 'Lightning'}
    if(num > 1000) {return 'Fast'}
    if(num > 500) {return 'Moderate'}
    return 'Slow'
  }
}
