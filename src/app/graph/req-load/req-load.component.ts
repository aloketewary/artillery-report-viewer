import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { EChartsOption } from 'echarts';
import { ReportState } from 'src/app/model/report-state';

@Component({
  selector: 'app-req-load',
  templateUrl: './req-load.component.html',
  styleUrls: ['./req-load.component.scss']
})
export class ReqLoadComponent {
  @Input() reportState?: ReportState;
  options: EChartsOption={};

  mergeOption: any;
  loading = false;
  isDataAvailable: boolean = false;
  selectedHttpCodes = new FormControl(['2xx']);

  httpCodeLists: string[] = ['1xx', '2xx', '3xx', '4xx', '5xx'];
  @Input() isDarkMode: boolean = false;

  ngOnInit(): void {
    this.setChartConfig();
    this.selectedHttpCodes.valueChanges.subscribe((_)=> this.setChartConfig())
  }

  setChartConfig() {
    const intermediate = this.reportState?.report?.results?.intermediate ?? [];
    if(intermediate.length === 0) {
      this.isDataAvailable = false;
    } else {
      this.isDataAvailable = true;
    }
    const xAxisData = new Array<string>();
    const rpsCount = new Array<number>();
    const avgRpsCount = new Array<number>();
    const responseCount = new Array<number>();

    intermediate.forEach((item) => {
      let d = new Date(item.timestamp ?? new Date());
      xAxisData.push(d.toLocaleString());
      rpsCount.push(item.rps?.count ?? 0);
      avgRpsCount.push(item.rps?.mean ?? 0);
      let resp = 0;
      const selectedValues: Array<string> = this.selectedHttpCodes.value ?? [];
      Object.getOwnPropertyNames(item.codes).map((id) => {
        if(selectedValues.includes(id.slice(0, -2) + 'xx')) {
          resp += (item as any).codes[id] as number ?? 0;
        }
      });
      responseCount.push(resp);
    });
    this.options = {
      legend: {
        data: ['Requests/sec', 'Avg Requests/sec', 'Median Response/sec'],
        align: 'left',
      },
      tooltip: {},
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
      toolbox: {
        show: true,
        feature: {
          // magicType: { show: true, type: ['stack', 'tiled'] },
          magicType: {show: true, type: ['stack', 'line', 'bar']},
          saveAsImage: { show: true }
        }
      },
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

          name: 'Requests/sec',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: rpsCount,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: 'Avg Requests/sec',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: avgRpsCount,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: 'Median Response/sec',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: responseCount,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: idx => idx * 5,
    }
  }
}
