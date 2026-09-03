import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TuiButton, TuiIcon} from '@taiga-ui/core';
import {AppShellComponent} from './components/app-shell/app-shell.component';
import {BrandBlockComponent} from './components/brand-block/brand-block.component';
import {GlobalActionsComponent} from './components/global-actions/global-actions.component';
import {ReportContextComponent} from './components/report-context/report-context.component';
import {ReportSectionNavComponent} from './components/report-section-nav/report-section-nav.component';
import {ReportAppBarComponent} from './components/report-app-bar/report-app-bar.component';

@NgModule({
  declarations: [
    AppShellComponent,
    BrandBlockComponent,
    GlobalActionsComponent,
    ReportContextComponent,
    ReportSectionNavComponent,
    ReportAppBarComponent,
  ],
  imports: [CommonModule, TuiButton, TuiIcon],
  exports: [AppShellComponent],
})
export class HomeShellModule {}
