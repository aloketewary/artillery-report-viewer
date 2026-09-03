import {ErrorSurfaceComponent} from './error-surface.component';

describe('ErrorSurfaceComponent', () => {
  it('preserves authoritative totals, grouped counts, and source ranking', () => {
    const component = new ErrorSurfaceComponent();
    component.view = {
      errorCount: 7,
      errorRate: 2.5,
      requests: 280,
      statusCounts: {success: 260, redirects: 13, client: 4, server: 3},
      codes: [
        {code: '500', label: 'Internal Server Error', count: 3, percentage: 1.07, tone: 'critical'},
        {code: '404', label: 'Not Found', count: 4, percentage: 1.43, tone: 'warning'},
      ],
      errors: [
        {name: 'ETIMEDOUT', count: 5, endpoint: '/checkout', sourceKey: 'ETIMEDOUT'},
        {name: 'ECONNRESET', count: 2, endpoint: '/search', sourceKey: 'ECONNRESET'},
      ],
    };

    expect(component.totalErrors.display).toBe('7');
    expect(component.errorRate.display).toBe('2.5');
    expect(component.statusGroups.map((group) => group.count.value)).toEqual([260, 13, 4, 3]);
    expect(component.statusRows.map((row) => row.code)).toEqual(['500', '404']);
    expect(component.failureRows.map((row) => row.name)).toEqual(['ETIMEDOUT', 'ECONNRESET']);
    expect(component.failureRows[0].endpoint?.display).toBe('/checkout');
  });

  it('marks unavailable aggregate values and percentages without inventing them', () => {
    const component = new ErrorSurfaceComponent();
    component.view = {
      errorCount: undefined,
      errorRate: undefined,
      requests: undefined,
      statusCounts: {success: 0, redirects: 0, client: 0, server: 0},
      codes: [],
      errors: [],
    };

    expect(component.totalErrors.display).toBe('N/A');
    expect(component.errorRate.display).toBe('N/A');
    expect(component.statusBarPercentage(component.statusGroups[2].count)).toBe('N/A');
    expect(component.statusBarWidth(component.statusGroups[3].count)).toBe(0);
    expect(component.hasRecordedFailures).toBeFalse();
  });

  it('exposes non-color availability and emits presentation intents for details and raw search', () => {
    const component = new ErrorSurfaceComponent();
    component.view = {
      errorCount: 1,
      errorRate: 1,
      requests: 100,
      statusCounts: {success: 99, redirects: 0, client: 1, server: 0},
      codes: [{code: '404', label: 'Not Found', count: 1, percentage: 1, tone: 'warning'}],
      errors: [{name: 'Not Found', count: 1}],
    };
    const intents: unknown[] = [];
    component.intent.subscribe((intent) => intents.push(intent));

    expect(component.failureRows[0].count.availability).toBe('measured');
    component.toggleStatusCode('404');
    component.toggleError(component.failureRows[0]);
    component.focusRawData('Not Found');

    expect(intents).toEqual([
      {type: 'toggle-status-detail', payload: {code: '404'}},
      {type: 'toggle-error-detail', payload: {key: 'Not Found'}},
      {type: 'focus-raw-data', payload: {query: 'Not Found'}},
    ]);
  });
});
