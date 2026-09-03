import {LatencySurfaceComponent} from './latency-surface.component';

describe('LatencySurfaceComponent', () => {
  it('projects exactly P50, P90, P95, and P99 in fixed order', () => {
    const component = new LatencySurfaceComponent();
    component.latency = {p50: 25, p75: 40, p90: 55, p95: 80, p99: 120};

    expect(component.percentiles.map((percentile) => percentile.key)).toEqual(['p50', 'p90', 'p95', 'p99']);
    expect(component.percentiles.map((percentile) => percentile.value.display)).toEqual(['25', '55', '80', '120']);
    expect(component.percentiles.every((percentile) => percentile.value.availability === 'measured')).toBeTrue();
  });

  it('retains available source values and marks each missing percentile as N/A', () => {
    const component = new LatencySurfaceComponent();
    component.latency = {p50: 0, p95: 87.25};

    expect(component.percentiles.map((percentile) => percentile.value.display)).toEqual(['0', 'N/A', '87.3', 'N/A']);
    expect(component.percentiles[0].value.value).toBe(0);
    expect(component.percentiles[2].value.value).toBe(87.25);
    expect(component.percentiles[1].value.availability).toBe('unavailable');
    expect(component.percentiles[3].value.availability).toBe('unavailable');
  });

  it('does not infer values from P75 or non-finite input', () => {
    const component = new LatencySurfaceComponent();
    component.latency = {p75: 75, p90: Number.NaN, p95: Number.POSITIVE_INFINITY};

    expect(component.percentiles.map((percentile) => percentile.value.display)).toEqual(['N/A', 'N/A', 'N/A', 'N/A']);
    expect(component.hasAvailableValue).toBeFalse();
  });

  it('exposes measured and unavailable states independently of color', () => {
    const component = new LatencySurfaceComponent();
    component.latency = {p50: 50};

    expect(component.percentiles[0].value.availability).toBe('measured');
    expect(component.percentiles[0].value.context).toBe('Measured latency percentile');
    expect(component.percentiles[1].value.availability).toBe('unavailable');
    expect(component.percentiles[1].value.context).toBe('Not supplied by the report');
  });
});
