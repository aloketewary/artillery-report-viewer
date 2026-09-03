import {Component, Input} from '@angular/core';
import type {ShellPresentation} from '../../presentation';

@Component({
  selector: 'app-brand-block',
  templateUrl: './brand-block.component.html',
  styleUrls: ['./brand-block.component.scss'],
  standalone: false,
})
export class BrandBlockComponent {
  @Input() mode: ShellPresentation['mode'] = 'entry';
}
