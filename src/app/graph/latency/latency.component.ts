import { Component, Input, OnInit } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ReportState } from 'src/app/model/report-state';

@Component({
  selector: 'app-latency',
  templateUrl: './latency.component.html',
  styleUrls: ['./latency.component.scss']
})
export class LatencyComponent implements OnInit {

  @Input() reportState?: ReportState;
  options: EChartsOption={};

  mergeOption: any;
  loading = false;
  isDataAvailable: boolean = false;
  @Input() isDarkMode: boolean = false;

  ngOnInit(): void {
    const intermediate = this.reportState?.report?.results?.intermediate ?? [];
    if(intermediate.length === 0) {
      this.isDataAvailable = false;
    } else {
      this.isDataAvailable = true;
    }
    const xAxisData = new Array<string>();
    const min = new Array<number>();
    const max = new Array<number>();
    const median = new Array<number>();
    const p95s = new Array<number>();
    const p99s = new Array<number>();

    intermediate.forEach((item) => {
      let d = new Date(item.timestamp ?? new Date());
      xAxisData.push(d.toLocaleString());
      min.push(item.latency?.min ?? 0);
      max.push(item.latency?.max ?? 0);
      median.push(item.latency?.median ?? 0);
      p95s.push(item.latency?.p95 ?? 0);
      p99s.push(item.latency?.p99 ?? 0);
    });
    this.options = {
      legend: {
        data: ['Min Response Time', 'Max Response Time', 'Median Response Time', '95th Percentile', '99th Percentile'],
        align: 'left',
      },
      tooltip: {},
      toolbox: {
        show: true,
        feature: {
          // magicType: { show: true, type: ['stack', 'tiled'] },
          magicType: {show: true, type: ['stack', 'line', 'bar']},
          saveAsImage: { show: true }
        }
      },
      xAxis: {
        data: xAxisData,
        silent: false,
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value'
      },
      symbol: 'emptyCircle',
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          // start: 1,
          // end: 35
        },
        {
          type: 'inside',
          yAxisIndex: [0],
          // start: 1,
          // end: 35
        }
      ],
      series: [
        {

          name: 'Min Response Time',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: min,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: 'Max Response Time',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: max,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: 'Median Response Time',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: median,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '95th Percentile',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: p95s,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '99th Percentile',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: p99s,
          label: {
            show: false,
            position: 'top',
          },
          animationDelay: idx => idx * 10,
          smooth: true,
        },
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: idx => idx * 5,
    }
  }
}
