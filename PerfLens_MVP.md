# PerfLens — MVP Product & Technical Specification

**Version:** 0.1  
**Status:** MVP Planning  
**Primary Input:** Artillery JSON  
**Future Inputs:** JMeter XML, k6, Gatling, Locust, and other performance-report formats

---

## 1. Product Definition

PerfLens is a performance-report analysis tool that converts raw load/performance-test output into a clear, actionable dashboard.

The MVP starts with **Artillery JSON** as the first supported input format.

The product must not become an Artillery-specific UI. Artillery is only the first adapter into a normalized performance model.

### Core principle

```text
Performance Test Report
        ↓
    Input Adapter
        ↓
Normalized Performance Model
        ↓
 Metrics / Analysis Engine
        ↓
     PerfLens UI
```

This architecture allows future formats to be added without rewriting the dashboard.

---

## 2. MVP Goal

The MVP should allow a user to:

1. Upload an Artillery JSON report.
2. Parse and validate the report.
3. Transform it into PerfLens's normalized model.
4. Display an executive performance dashboard.
5. Identify latency, throughput, and error problems.
6. Drill into endpoint/scenario performance.
7. Inspect the original raw report.
8. Export/share a human-readable performance report.

The MVP is successful if a developer can upload a report and understand the health of the test within **10 seconds**.

---

## 3. Target Users

### Primary

- Backend developers
- QA engineers
- Performance engineers
- SRE/DevOps engineers
- Engineering teams running load tests

### Secondary

- Engineering managers
- Technical leads
- Developers reviewing CI performance tests

---

## 4. MVP Scope

### P0 — Must Have

#### Input

- Upload Artillery JSON
- Drag-and-drop support
- File validation
- JSON parsing
- Friendly validation errors

#### Dashboard

- Test status
- Test metadata
- Total requests
- Throughput / RPS
- Error rate
- P50
- P90
- P95
- P99
- Test duration

#### Analysis

- Performance health summary
- Endpoint performance table
- Scenario performance
- Error analysis
- Latency distribution
- Performance timeline
- Bottleneck identification

#### Data

- Raw JSON viewer
- Search raw JSON
- Download original JSON

#### UX

- Responsive dashboard
- Light/dark theme
- Empty state
- Loading state
- Error state

---

## 5. Explicitly Out of Scope for MVP

Do not build these initially:

- User accounts
- Team management
- Billing
- Multi-tenant backend
- Real-time test execution
- Running Artillery from PerfLens
- CI/CD integration
- Automatic cloud storage
- Alerting
- AI-generated performance recommendations
- JMeter support
- k6 support
- Gatling support
- Historical database
- Distributed tracing
- Infrastructure monitoring

These can be added after the report-analysis workflow is proven.

---

## 6. Product Flow

```text
Landing Page
    ↓
Upload Performance Report
    ↓
Detect Format
    ↓
Artillery Adapter
    ↓
Validate
    ↓
Normalize
    ↓
Calculate Metrics
    ↓
Generate Insights
    ↓
Performance Dashboard
```

### Upload experience

The landing page should immediately communicate:

> Upload a performance report. Understand what went wrong.

Primary action:

**Upload Report**

Secondary:

**Try Sample Report**

The sample report is important because users should be able to understand the product before preparing their own data.

---

# 7. Dashboard Information Architecture

## Overview

The default page.

Order:

1. Test status
2. KPI cards
3. Performance health
4. Timeline
5. Endpoint performance
6. Latency distribution
7. Errors
8. Bottlenecks / insights
9. Scenario performance
10. Raw data

---

## 8. Header

Display:

- PerfLens logo/name
- Project name if available
- Test name
- Test timestamp
- Input format
- Test status
- Upload another report
- Export report

Example:

```text
PerfLens

Checkout API
Load Test #142

Artillery JSON · 02 Sep 2026 14:32

● PASSED

[Upload New Report] [Export]
```

---

# 9. KPI Cards

The MVP should have six primary cards.

### Requests

```text
1.24M
Requests

+12.4% vs previous
```

### Throughput

```text
1,240
req/s

Peak: 1,480 req/s
```

### Error Rate

```text
0.18%

Healthy
```

### P95 Latency

```text
428 ms

Target < 500 ms
```

### P99 Latency

```text
812 ms

Warning
```

### Duration

```text
16m 42s
```

Cards should support:

- Current value
- Unit
- Context
- Threshold when available
- Status
- Trend when historical comparison exists

Do not display fake comparison data when there is no previous run.

---

# 10. Performance Health

Create a calculated health summary.

Example:

```text
Performance Health

87 / 100
GOOD

Latency       91
Reliability   98
Throughput    82
Stability     87
```

The scoring algorithm must be deterministic and documented.

Do not market the score as an objective industry standard.

The score is a PerfLens heuristic.

---

# 11. Performance Timeline

Chart:

- P50
- P90
- P95
- P99
- RPS
- Error rate

Users can toggle metrics.

Hover information:

```text
14:32:15

Requests: 1,240
RPS: 1,240

P50: 82 ms
P95: 428 ms
P99: 812 ms

Errors: 0.18%
```

Anomalies should be marked visually.

---

# 12. Endpoint Performance

Sortable and filterable table.

Columns:

```text
Method
Endpoint
Requests
RPS
Avg
P50
P95
P99
Error %
Status
```

Example:

```text
GET   /users       124K   420   82ms   64ms   182ms   320ms   0.02%  Healthy
POST  /checkout     82K   280  210ms  184ms   428ms   812ms   0.18%  Warning
POST  /payment      64K   220  318ms  240ms   612ms  1200ms   1.24%  Critical
```

Default sorting should prioritize problems:

1. Critical status
2. Error rate
3. P99
4. P95

---

# 13. Error Analysis

Display:

- Total errors
- Error rate
- 4xx count
- 5xx count
- Error distribution
- Most frequent failures

Example:

```text
500 Internal Server Error
1,284 occurrences
POST /payment

429 Too Many Requests
842 occurrences
POST /checkout
```

---

# 14. Scenario Analysis

Display:

```text
Scenario
Requests
RPS
P95
P99
Errors
Status
```

Clicking a scenario should provide a deeper view when the Artillery report contains sufficient information.

---

# 15. Bottleneck Detection

The MVP should include deterministic rule-based insights.

Examples:

### High P99

```text
POST /payment has high tail latency.

P99: 1.2s
P95: 612ms
```

### High Error Rate

```text
POST /checkout exceeds the configured error threshold.

Error rate: 2.1%
```

### Throughput

```text
Peak throughput reached 1,480 req/s.
```

### Latency Degradation

When timeline data allows:

```text
Latency increased significantly during the final stage of the test.
```

Do not use an LLM for these insights in MVP.

Rule-based analysis is cheaper, deterministic, testable, and easier to trust.

---

# 16. Raw Data

Provide an advanced section:

```text
Raw Artillery Data

[Search]

{
  ...
}
```

Actions:

- Search
- Expand/collapse
- Copy
- Download

Raw data is a debugging tool, not the primary experience.

---

# 17. Normalized Data Model

PerfLens must not expose Artillery's schema directly to the UI.

Create a format-neutral internal model.

Conceptual model:

```text
PerformanceReport
├── metadata
│   ├── name
│   ├── format
│   ├── startedAt
│   ├── duration
│   └── environment
│
├── summary
│   ├── requests
│   ├── successfulRequests
│   ├── failedRequests
│   ├── throughput
│   └── errorRate
│
├── latency
│   ├── average
│   ├── p50
│   ├── p90
│   ├── p95
│   └── p99
│
├── endpoints[]
│
├── scenarios[]
│
├── errors[]
│
├── timeline[]
│
└── rawData
```

The UI consumes only this model.

---

# 18. Adapter Architecture

Use an adapter interface.

```text
PerformanceReportParser

parse(input)
validate(input)
normalize(input)
getFormat()
```

Initial implementation:

```text
ArtilleryParser
```

Future:

```text
JMeterParser
K6Parser
GatlingParser
LocustParser
```

Architecture:

```text
                ┌── ArtilleryParser
                │
Input ── Router ├── JMeterParser
                │
                ├── K6Parser
                │
                └── FutureParser
                         ↓
              Normalized PerformanceReport
                         ↓
                Analysis Engine
                         ↓
                     PerfLens
```

---

# 19. Recommended MVP Architecture

For the first version, avoid building an unnecessary distributed backend.

Recommended:

```text
Frontend
  │
  ├── Upload
  ├── Parser
  ├── Normalizer
  ├── Metrics Engine
  └── Dashboard
```

A client-side MVP is sufficient if reports are processed locally.

Advantages:

- No infrastructure cost
- No database
- Better privacy
- Fast feedback
- Simple deployment
- Easy development
- Users can analyze sensitive performance reports without uploading them

The browser should process the uploaded JSON locally whenever practical.

---

# 20. Suggested Technology

### Frontend

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts or Apache ECharts

### Data validation

Use:

- Zod

### State

Start with:

- React state
- URL state where useful

Avoid introducing Redux unless actual complexity appears.

### Testing

Use:

- Vitest
- React Testing Library
- Playwright

---

# 21. Project Structure

```text
perflens/
│
├── src/
│   ├── adapters/
│   │   ├── artillery/
│   │   │   ├── parser.ts
│   │   │   ├── validator.ts
│   │   │   └── normalizer.ts
│   │   ├── parser.ts
│   │   └── registry.ts
│   │
│   ├── domain/
│   │   ├── performance-report.ts
│   │   ├── metrics.ts
│   │   └── insights.ts
│   │
│   ├── analysis/
│   │   ├── health-score.ts
│   │   ├── bottlenecks.ts
│   │   ├── anomalies.ts
│   │   └── thresholds.ts
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   ├── tables/
│   │   ├── cards/
│   │   └── raw-data/
│   │
│   ├── pages/
│   │   ├── upload/
│   │   └── report/
│   │
│   └── app/
│
├── tests/
│   ├── adapters/
│   ├── analysis/
│   └── fixtures/
│
└── public/
    └── samples/
```

---

# 22. Testing Strategy

The parser is the highest-risk component.

Create fixtures for:

1. Valid Artillery report
2. Empty report
3. Invalid JSON
4. Missing metrics
5. Multiple scenarios
6. Multiple endpoints
7. High error rate
8. Zero errors
9. Very large report
10. Different Artillery report structures

Tests must verify:

```text
Artillery JSON
     ↓
Normalized Model
```

and independently:

```text
Normalized Model
     ↓
Metrics
     ↓
Insights
```

This prevents UI tests from becoming the only validation mechanism.

---

# 23. Large Report Handling

Performance reports can become large.

Do not assume every report is a few KB.

MVP requirements:

- Avoid unnecessary JSON duplication in memory
- Virtualize large tables
- Lazy-render raw JSON
- Avoid rendering thousands of timeline points directly
- Downsample chart data when necessary

Set a reasonable initial browser upload limit and make it configurable.

---

# 24. Error Handling

The UI must distinguish:

### Invalid JSON

```text
This file is not valid JSON.
```

### Unsupported format

```text
PerfLens couldn't identify this performance report format.
```

### Valid JSON but unsupported schema

```text
This looks like JSON, but it isn't a supported Artillery report.
```

### Missing metrics

```text
P99 latency is unavailable in this report.
```

Never invent unavailable values.

Use `N/A`.

---

# 25. MVP Export

Allow users to export the dashboard as:

- Printable HTML
- PDF

The exported report should include:

1. Test summary
2. KPI metrics
3. Health score
4. Timeline
5. Endpoint table
6. Errors
7. Insights

Raw JSON does not need to be included in the PDF.

---

# 26. Future Roadmap

## V0.1

Artillery JSON → dashboard

## V0.2

Historical reports

```text
Run #140
Run #141
Run #142
```

Compare performance between runs.

## V0.3

JMeter XML support.

```text
JMeter XML
   ↓
JMeter Adapter
   ↓
Normalized Model
```

## V0.4

k6 support.

## V0.5

CI/CD integration.

Example:

```text
GitHub Actions
     ↓
Performance Test
     ↓
PerfLens
     ↓
Performance Report
```

## V1.0

Team/project capabilities:

- Projects
- Test history
- Baselines
- Regression detection
- Threshold policies
- Shareable reports

## Future Intelligence

Only after deterministic analysis is mature:

- AI-assisted root-cause hypotheses
- Natural-language report summaries
- Performance regression explanations
- Suggested investigation areas

AI should sit on top of the normalized model rather than directly interpreting arbitrary raw JSON.

---

# 27. MVP Definition of Done

PerfLens MVP is complete when a user can:

- [ ] Open PerfLens
- [ ] Upload Artillery JSON
- [ ] Receive validation feedback
- [ ] See test status
- [ ] See six KPI cards
- [ ] See performance health
- [ ] Explore latency timeline
- [ ] Sort/filter endpoints
- [ ] Inspect scenarios
- [ ] Analyze errors
- [ ] See deterministic bottleneck insights
- [ ] View raw JSON
- [ ] Download original JSON
- [ ] Export a report
- [ ] Use the dashboard on desktop and tablet
- [ ] Switch light/dark mode
- [ ] Analyze a large report without the UI becoming unusable

---

# 28. Product Success Criteria

The MVP should optimize for three things:

### Time to insight

User uploads report → understands the primary issue in <10 seconds.

### Trust

Every displayed metric can be traced back to the source report.

### Extensibility

Adding JMeter should require implementing an adapter, not redesigning the dashboard.

---

# 29. First Development Milestone

Build in this order:

```text
1. Define normalized domain model
          ↓
2. Create Artillery fixture files
          ↓
3. Build Artillery parser
          ↓
4. Build normalization layer
          ↓
5. Build metrics engine
          ↓
6. Build deterministic insight engine
          ↓
7. Build upload screen
          ↓
8. Build KPI dashboard
          ↓
9. Build charts
          ↓
10. Build endpoint/scenario tables
          ↓
11. Build raw JSON viewer
          ↓
12. Add export
          ↓
13. Add responsive UX
          ↓
14. End-to-end testing
```

Do not start by building every dashboard screen.

Start with:

**Artillery JSON → Normalized Model → Metrics → One excellent Overview page.**

That gives PerfLens a stable foundation before the UI grows.
