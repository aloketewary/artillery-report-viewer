import { AfterViewInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { HomeComponent } from '../../../home/components/home/home.component';
import { ReportSessionService } from '../../../shared/report/report-session.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  standalone: false,
})
export class ReportComponent implements AfterViewInit {
  @ViewChild('reportHost', {read: ViewContainerRef, static: true})
  private readonly reportHost!: ViewContainerRef;

  constructor(
    private readonly reportSession: ReportSessionService,
    private readonly router: Router,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const session = await this.reportSession.restore();
    if (!session) {
      void this.router.navigate(['/home/landing']);
      return;
    }

    const reportRef = this.reportHost.createComponent(HomeComponent);
    reportRef.changeDetectorRef.detectChanges();
  }
}
