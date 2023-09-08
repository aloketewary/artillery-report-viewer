import { Component, Input, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-star',
  templateUrl: './star.component.html',
  styleUrls: ['./star.component.scss']
})
export class StarComponent implements OnInit {
  @Input() rating: number = 0;
  ratings: string[] = ['rating-none', 'rating-none', 'rating-none', 'rating-none', 'rating-none'];

  ngOnInit(): void {
    for (let index = 1; index <= 5; index++) {
      if(this.rating >= index) {
        this.ratings[index-1] = 'rating-full';
      } else if (this.rating.toString().endsWith(index +'.5')) {
        this.ratings[index-1] = 'rating-half';
      }
    }
  }

  checkIsClassApplicable(rate: string, withClass: string) {
    return rate === withClass;
  }
}
