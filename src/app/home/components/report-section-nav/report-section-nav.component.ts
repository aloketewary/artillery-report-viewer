import {Location} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
import {
  REPORT_SECTION_NAVIGATION,
  ReportAnchorId,
  ReportContextPresentation,
  ReportSectionNavigationItem,
  ShellIntent,
} from '../../presentation';

@Component({
  selector: 'app-report-section-nav',
  templateUrl: './report-section-nav.component.html',
  styleUrls: ['./report-section-nav.component.scss'],
  standalone: false,
})
export class ReportSectionNavComponent {
  @Input() items: readonly ReportSectionNavigationItem[] = REPORT_SECTION_NAVIGATION;
  @Input() activeAnchor: ReportAnchorId = 'overview';
  @Input() context?: Readonly<ReportContextPresentation>;
  @Output() intent = new EventEmitter<ShellIntent>();

  constructor(
    private readonly router: Router,
    private readonly location: Location,
  ) {}

  readonly navIcons: Readonly<Record<ReportAnchorId, string>> = {
    overview: '@tui.layout-grid',
    performance: '@tui.clock',
    endpoints: '@tui.link',
    scenarios: '@tui.file',
    errors: '@tui.circle-alert',
    comparison: '@tui.chevrons-up-down',
    insights: '@tui.info',
    'raw-data': '@tui.code',
  };

  hrefFor(anchor: ReportAnchorId): string {
    const urlTree = this.router.createUrlTree(['/home/report'], {fragment: anchor});
    return this.location.prepareExternalUrl(this.router.serializeUrl(urlTree));
  }

  navigate(anchor: ReportAnchorId): void {
    this.intent.emit({type: 'navigate', payload: {anchor}});
  }
}
