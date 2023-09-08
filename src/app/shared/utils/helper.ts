export function getIntegerDate(period: any) {
  if (typeof period === 'string') {
    return parseInt(period);
  } else if (typeof period === 'number') {
    return period;
  } else {
    throw new Error('invalid type of property period.');
  }
}
