import { Component, Input } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ThemeOption } from 'ngx-echarts';
import { ReportState } from 'src/app/model/report-state';

@Component({
  selector: 'app-http-code',
  templateUrl: './http-code.component.html',
  styleUrls: ['./http-code.component.scss']
})
export class HttpCodeComponent {
  @Input() reportState?: ReportState;
  options: EChartsOption = {};
  options2: EChartsOption = {};
  theme: string | ThemeOption = 'dark';
  theme2: string | ThemeOption = 'macarons';

  mergeOption: any;
  loading = false;
  isDataAvailable: boolean = false;
  @Input() isDarkMode: boolean = false;

  ngOnInit(): void {
    const intermediate = this.reportState?.report?.results?.intermediate ?? [];
    if (intermediate.length === 0) {
      this.isDataAvailable = false;
    } else {
      this.isDataAvailable = true;
    }
    const xAxisData = new Array<string>();
    const info = new Array<number>();
    const good = new Array<number>();
    const redirects = new Array<number>();
    const badRequests = new Array<number>();
    const serverError = new Array<number>();

    const graphData = new Array<{ value: number, name: string }>();
    Object.getOwnPropertyNames(this.reportState?.report?.results?.aggregate?.codes).map((id) => {
      graphData.push({ value: (this.reportState?.report?.results?.aggregate as any).codes[id] as number ?? 0, name: id });
    });

    intermediate.forEach((item) => {
      let d = new Date(item.timestamp ?? new Date());
      xAxisData.push(d.toLocaleString());
      let http100s = 0;
      let http200s = 0;
      let http300s = 0;
      let http400s = 0;
      let http500s = 0;

      Object.getOwnPropertyNames(item?.codes).map((p) => {
       let val = parseInt(p, 0);
       let amount = (item as any).codes[p];
       if (val >= 100 && val < 200) {
        http100s += amount;
       }
       if (val >= 200 && val < 300) {
        http200s += amount;
       }
       if (val >= 300 && val < 400) {
        http300s += amount;
       }
       if (val >= 400 && val < 500) {
        http400s += amount;
       }
       if (val >= 500 && val < 600) {
        http500s += amount;
       }
      });
      info.push(http100s);
      good.push(http200s);
      redirects.push(http300s);
      badRequests.push(http400s);
      serverError.push(http500s);
    });
    this.options = {
      legend: {
        data: xAxisData,
        align: 'left',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)',
      },
      toolbox: {
        show: true,
        feature: {
          // magicType: {show: true, type: ['stack', 'line', 'bar']},
          saveAsImage: { show: true }
        }
      },
      calculable: true,
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
          name: 'Response Codes',
          type: 'pie',
          radius: '60%',
          center: ['50%', '50%'],
          roseType: 'area',
          // label: {
          //   color: 'rgba(255, 255, 255, 0.3)'
          // },
          // labelLine: {
          //   lineStyle: {
          //     color: 'rgba(255, 255, 255, 0.3)'
          //   },
          //   smooth: 0.2,
          //   length: 10,
          //   length2: 20
          // },
          itemStyle: {
            color: '#c23531',
            shadowBlur: 200,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: function (idx) {
            return Math.random() * 200;
          },
          data: graphData,
        },
      ],

    };


    this.options2 = {
      legend: {
        data: ['100s', '200s', '300s', '400s', '500s'],
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
          magicType: { show: true, type: ['stack', 'line', 'bar'] },
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

          name: '100s',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: info,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '200s',
          type: 'line',
          // stack: 'counts',
          // areaStyle: {},
          data: good,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '300s',
          type: 'line',
          // stack: 'counts',
          // areaStyle: r{},
          data: redirects,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '400s',
          type: 'line',
          // stack: 'counts',
          // areaStyle: r{},
          data: badRequests,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
        {
          name: '500s',
          type: 'line',
          // stack: 'counts',
          // areaStyle: r{},
          data: serverError,
          animationDelay: idx => idx * 10,
          smooth: true,
        },
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: idx => idx * 5,
    };
  }
}
