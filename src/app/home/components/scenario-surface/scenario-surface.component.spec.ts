import {ScenarioSurfaceComponent} from './scenario-surface.component';

describe('ScenarioSurfaceComponent', () => {
  it('preserves available scenario counters and performance values', () => {
    const component = new ScenarioSurfaceComponent();
    component.view = {
      scenarios: [{
        name: 'checkout flow',
        requests: 240,
        virtualUsersCreated: 12,
        virtualUsersCompleted: 10,
        virtualUsersFailed: 1,
        virtualUsersSkipped: 1,
        rps: 24,
        p95: 85.25,
        p99: 140.5,
        errors: 2,
        errorRate: 0.83,
        status: 'critical',
      }],
    };

    const row = component.filteredRows[0];
    expect(row.name).toBe('checkout flow');
    expect(component.formatCompact(row.requests)).toBe('240');
    expect(component.formatCompact(row.virtualUsersCreated)).toBe('12');
    expect(component.formatCompact(row.virtualUsersCompleted)).toBe('10');
    expect(component.formatCompact(row.virtualUsersFailed)).toBe('1');
    expect(component.formatCompact(row.virtualUsersSkipped)).toBe('1');
    expect(component.formatNumber(row.rps)).toBe('24');
    expect(component.formatMs(row.p95)).toBe('85.3 ms');
    expect(component.formatMs(row.p99)).toBe('140.5 ms');
    expect(component.formatCompact(row.errors)).toBe('2');
    expect(component.formatPercent(row.errorRate)).toBe('0.83%');
    expect(component.toneLabel(row.status)).toBe('Critical');
  });

  it('keeps missing values as N/A without inferring them from other fields', () => {
    const component = new ScenarioSurfaceComponent();
    component.view = {
      scenarios: [{name: 'partial flow', virtualUsersCreated: 0, virtualUsersCompleted: 0, status: 'neutral'}],
    };

    const row = component.filteredRows[0];
    expect(component.formatCompact(row.virtualUsersCreated)).toBe('0');
    expect(component.formatCompact(row.virtualUsersCompleted)).toBe('0');
    expect(component.formatCompact(row.requests)).toBe('N/A');
    expect(component.formatNumber(row.rps)).toBe('N/A');
    expect(component.formatMs(row.p95)).toBe('N/A');
    expect(component.formatMs(row.p99)).toBe('N/A');
    expect(component.formatCompact(row.errors)).toBe('N/A');
    expect(component.formatPercent(row.errorRate)).toBe('N/A');
    expect(component.hasMeasuredPerformance(row)).toBeFalse();
  });

  it('filters and toggles detail through UI-only state while emitting existing intents', () => {
    const component = new ScenarioSurfaceComponent();
    component.view = {scenarios: [{name: 'checkout', status: 'neutral'}, {name: 'search', status: 'neutral'}]};
    const intents: unknown[] = [];
    component.intent.subscribe((intent) => intents.push(intent));

    component.setSearch('check');
    component.toggleScenario('checkout');
    expect(component.filteredRows.map((row) => row.name)).toEqual(['checkout']);
    expect(component.selectedRow?.name).toBe('checkout');
    component.closeDetails();

    expect(intents).toEqual([
      {type: 'filter-change', payload: {filter: 'scenario-search', value: 'check'}},
      {type: 'toggle-scenario-detail', payload: {scenario: 'checkout'}},
      {type: 'toggle-scenario-detail', payload: {scenario: 'checkout'}},
    ]);
    expect(component.selectedScenario).toBeUndefined();
  });

  it('reports explicit empty and no-match states through row collections', () => {
    const component = new ScenarioSurfaceComponent();
    expect(component.scenarioRows).toEqual([]);
    expect(component.filteredRows).toEqual([]);

    component.view = {scenarios: [{name: 'checkout', status: 'neutral'}]};
    component.search = 'missing';
    expect(component.scenarioRows.length).toBe(1);
    expect(component.filteredRows).toEqual([]);
  });
});
