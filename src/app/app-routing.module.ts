import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: '/home/landing'},
  {path: 'home/report', loadChildren: () => import('./report/report.module').then((module) => module.ReportModule)},
  {path: 'home', pathMatch: 'full', redirectTo: '/home/landing'},
  {path: 'home/landing', loadChildren: () => import('./landing/landing.module').then((module) => module.LandingModule)},
  {path: '**', redirectTo: '/home/landing'},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
