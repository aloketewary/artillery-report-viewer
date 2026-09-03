import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReportComponent } from './components/report/report.component';

const routes: Routes = [
  {path: '', component: ReportComponent},
];

@NgModule({
  declarations: [ReportComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
  ],
})
export class ReportModule {}
