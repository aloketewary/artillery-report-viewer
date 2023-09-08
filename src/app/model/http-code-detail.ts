export class HttpCodeDetail {
  key: string;
  value: number;
  details: string;

  constructor(_name: string, _value: number) {
    this.key = _name;
    this.value = _value;
    if(_name.startsWith('2')) {
      this.details = 'Success response as 2XX';
    } else if (_name.startsWith('4')) {
      this.details = 'Bad Request response as 4XX';
    } else if (_name.startsWith('5')) {
      this.details = 'Gateway/Server error response as 5XX';
    } else {
      this.details = 'No standard Http Code found!';
    }
  }
}
