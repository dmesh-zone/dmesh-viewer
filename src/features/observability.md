---
title: "Observability Feature Specification"
id: AG-OBS-001
version: 1.0.0
status: Draft for Review
date: March 2026
---

# Observability Feature Specification

## 1. Overview

### 1.1 Purpose

This specification defines the Observability feature for the Data Mesh Viewer project Platform 

The Observability feature enables platform operators, data product owners, and consumers to monitor the health and fitness of individual data products in real time, directly within the mesh visualisation — without navigating away from the graph.

### 1.2 Background and Context

Each data product node in the Data Mesh Viewer graph exposes the management port as defined by Bitol ODPS:

- **observability** — runtime health and fitness metrics

The observability management port points to a runtime /observe/metrics endpoint. This specification defines how the platform consumes that endpoint, surfaces results in the mesh graph, and provides drilldown access for operators and consumers.

For runtime efficiency Data Mesh Viewer will expect the /observe/metrics for all data products as part of the DataMeshRegistry payload, /observe/metrics entry indentified as an array element of kind:DataProductObservabilityMetrics

### 1.3 Observability Model

The feature is structured around three observability spaces as defined by Petrella:

| **Space** | **What it measures** | **Examples in /observe/metrics** |
|-----------|---------------------|----------------------------------|
| Physical  | Infrastructure and compute layer          | Pipeline run status, duration, storage size, compute credits       |
| Static    | Schema structure and contract conformance | Schema version, drift detection, column count, contract validation |
| Dynamic   | Runtime data values and fitness           | Volume/row counts, freshness/lag, quality rule pass rates, consumption/latency |

A fourth cross-cutting dimension, Consumption, mirrors the SLA response time objectives declared in the linked ODCS output port contracts and compares them against actuals observed by consumers.

### 1.4 Scope

In scope for this specification:

- Observe Mode toggle and two-level health shading on the mesh graph

- Dimension filter sub-menu (Any / Pipeline / Consumption / Freshness / Quality)

- Animated edge health propagation

- Node drilldown side panel with Metrics and Events tabs

- kind:DataProductObservabilityMetrics array element handling from DataMeshRegistry

- JSON Schema for the src\schemas\odps-observability-metrics-schema-v0.0.1.json

Out of scope for v1.0:

- Historical metric trending and time-series charts


## 2. Requirements

Requirements are expressed as user stories following the standard format: As a [role], I want [capability], so that [outcome]. Each story carries a priority (P0 = must-have, P1 = should-have, P2 = nice-to-have) and an acceptance criteria checklist.

| **Priority** | **Definition** |
| --- | --- |
| P0 — Must Have    | Required for launch. Feature is incomplete without this.             |
| P1 — Should Have  | High value. Should be included unless blocked by time or dependency. |
| P2 — Nice to Have | Desirable. Defer to a future iteration if necessary.                 |

### 2.1 Observe Mode Activation

#### US-01 · Activate Observe Mode

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner, data consumer                                                                                                                               |
| Story     | I want to activate Observe Mode from a persistent floating button on the mesh canvas so that I can see the health of all data products at a glance without leaving the graph view. |
| Priority  | P0                                                                                                                                                                                 |

##### Acceptance Criteria

- An OBSERVE button is permanently visible in the top-right corner of the React Flow canvas regardless of zoom level or pan position.

- Clicking the button toggles Observe Mode on. The button changes appearance to an active state (OBSERVING label, enhanced border, glow) within 200ms.

- Toggling Observe Mode off restores all nodes to their default (default discover mode shading) appearance within 300ms.

- The button state persists across pan and zoom interactions.

- A keyboard shortcut (⌘ + Shift + O / Ctrl + Shift + O) triggers the same toggle.

#### US-02 · Composite Any-Case Health Shading

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator                                                                                                                                                              |
| Story     | I want data product nodes to be shaded in a single composite RAG colour representing the worst health dimension so that I can scan the entire mesh for problems in one glance. |
| Priority  | P0                                                                                                                                                                             |

##### Acceptance Criteria

- When Observe Mode is active, each data product node is shaded according to its worst-case health status derived from all four dimensions (Pipeline, Consumption, Freshness, Quality).

- Shading follows this priority: **critical (red) > degraded (amber) > healthy (green) > unknown (dark gray)**

- The colour change includes a background tint, a glowing border, and the node dot indicator.

- The shading transition animates smoothly over 300ms.

- Producer and consumer system nodes are never shaded; only data product nodes receive health colour.

- A legend is shown in the bottom-left corner of the canvas while Observe Mode is active.

#### US-03 · Dimension Pip Indicators on Nodes

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner                                                                                                                                                        |
| Story     | I want to see per-dimension status indicators directly on the node so that I can understand which specific dimension is causing a degraded or critical status without opening the drilldown. |
| Priority  | P1                                                                                                                                                                                           |

##### Acceptance Criteria

- When Observe Mode is active, each data product node displays four small pip icons representing Pipeline (▸), Consumption (◈), Freshness (⧗), and Quality (✦).

- Each pip is independently coloured green, amber, or red based on that dimension's status.

- Pips fade in when Observe Mode activates and fade out when it deactivates.

- When a dimension filter is active, non-active dimension pips are visually de-emphasised (reduced opacity).

- Pips for dimensions for which there are no observability metrics for any data product (hidden from the dimension filter sub-menu) should not be displayed on the node.

#### US-03b · Observe Mode KPIs

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner                                                                                                                                                        |
| Story     | I want to see summary KPIs when Observing mode is on so that I can understand high-level metrics across the mesh. |
| Priority  | P1                                                                                                                                                                                           |

##### Acceptance Criteria

- When Observing mode is on, layout the to the left of the observing menu, but below "All Domains" and "Search" box.
- Each KPI card should be a square, with straight corners, where KPI figures are displayed, each with its own dark color background, showing the number in the center with big bold font and other text above. All text in white
- KPIs to display:
  - N Data sources
  - N Data Products
  - N Output ports
  - N records ingested (aggregate physical.pipeline.recordsProcessed from sourceAligned dataProductTier)
  - N records processed (aggregate physical.pipeline.recordsProcessed from any other dataProductTiers)
- Where numbers are high, use the k, M, B units.
- Calculation will update based on domain/search filtering criteria.

### 2.2 Dimension Filter Sub-Menu

#### US-04 · Dimension Filter Sub-Menu

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner                                                                                                                                                                   |
| Story     | I want a second-level sub-menu that lets me filter node shading to a single dimension so that I can isolate which specific health concern (Pipeline, Consumption, Freshness, or Quality) is affecting the mesh. |
| Priority  | P0                                                                                                                                                                                                      |

##### Acceptance Criteria

- The dimension sub-menu appears below the OBSERVE button immediately when Observe Mode is activated.

- The sub-menu offers up to five options: Any (default), Pipeline, Consumption, Freshness, Quality.

- Show only dimensions for which there are observability metrics, at least for one data product. This allows for data-mesh-viewer users to add dimensions as they see fit, but not showing unprioritised metrics.
- If there is only one specific dimension showing (due to a lack of observability metrics on the others), then do not show the "Any" option.
- Selecting a dimension re-shades all nodes to reflect that dimension's health only, within 200ms.

- The active dimension is visually highlighted in the sub-menu (enhaned border and background).

- Switching dimensions is instantaneous with no loading state required.

- Selecting "Any" (default) returns to composite worst-case shading.

- The sub-menu is hidden when Observe Mode is deactivated.

- If a drilldown panel is open, switching the dimension filter simultaneously updates both the graph shading and the drilldown panel content.
### 2.3 Dimension Filter Configuration

#### US-05 · Dimension Filter Configuration

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner                                                                                                                                                                   |
| Story     | I want a a configuration option that allows me to hide healthy nodes from the graph. |
| Priority  | P0                                                                                                                                                                                                      |

##### Acceptance Criteria

- The configuration option is available as a cog icon in the dimension sub-menu.

- By default, healthy nodes are visible in the graph.

- When the filter is active, both nodes with a "healthy" status and nodes with an "unknown" status (insufficient data) are hidden from the graph.

- There is also an option to "Hide KPIs", which is unchecked by default. Checking it hides all Observe mode KPI cards.

- Configuration option is applicable to all dimensions.

### 2.4 Edge Health Propagation

#### US-06 · Animated Edge Health Colouring

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator                                                                                                                                                                |
| Story     | I want edges between nodes to be coloured and animated according to the health of the nodes they connect so that I can see how health issues propagate across the mesh topology. |
| Priority  | P1                                                                                                                                                                               |

##### Acceptance Criteria

- When Observe Mode is active, edges are animated with a dashed flow animation.

- Each edge is coloured based on the worst health status of its two connected data product nodes.

- Edge colour follows the same RAG palette as node shading.

- Edges connecting only producer/consumer system nodes to unhealthy data product nodes also inherit the data product's colour.

- When a dimension filter is active, edge colouring reflects that dimension's health.

- Edge animation and colouring deactivates when Observe Mode is turned off.

### 2.5 Node Drilldown Panel

#### US-07 · Open Drilldown Panel

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner, data consumer                                                                                                                  |
| Story     | I want to click a data product node in Observe Mode to open a contextual drilldown panel so that I can inspect detailed health metrics without leaving the mesh view. |
| Priority  | P0                                                                                                                                                                    |

##### Acceptance Criteria

- Clicking any data product node while Observe Mode is active opens the drilldown panel.

- The panel slides in from the right side of the canvas, preserving graph visibility.

- The panel header shows the data product name, a DATA PRODUCT label, and the active dimension filter if one is set.

- The selected node receives a visible selection indicator (blue outline).

- Clicking the same node again, or the ✕ button, closes the panel.

- Clicking a different node while the panel is open switches the panel to that node's data.

- Clicking a node outside Observe Mode has no drilldown effect (standard React Flow node click behaviour applies).

#### US-08 · Metrics Tab

| **Field** | **Detail** |
| --- | --- |
| Role      | Data product owner, platform operator                                                                                                                                                                           |
| Story     | I want a Metrics tab in the drilldown panel that shows the current Pipeline, Consumption, Freshness, and Quality health for the selected data product so that I can understand the current operational state in detail. |
| Priority  | P0                                                                                                                                                                                                              |

##### Acceptance Criteria

- The Metrics tab is the default active tab when the panel opens.

- When no dimension filter is active, dimension cards (Pipeline, Consumption, Freshness, Quality) are displayed only if observability metrics exist for that dimension in at least one data product.

- When a dimension filter is active, only the card for that dimension is displayed.

- Each card shows: dimension name and icon, a PASSING/FAILING badge, the relevant metric values (e.g. "Uptime: 99.8% (threshold 99.5%)"), and for Quality a visual progress bar showing rule pass rate.

- Cards reveal with a staggered animation (100ms delay between cards) when the panel opens.

- All metric values are sourced from the /observe/metrics response for the selected output port's contractId.

- **Pipeline Metric Card Specifics:**
  - If `physical.pipeline.status` equals failed, pipeline status should be CRITICAL. "Failure reason: <errorMessage>" will be shown in the card using the value from `physical.pipeline.errorMessage`.
  - In Pipeline Status card show "Last run: <asOf>" as the first line below status
  - If `physical.pipeline.status` is healthy (i.e. not "failed"), and `physical.pipeline.durationInSeconds` and `physical.pipeline.recordsProcessed` are available, they should be shown in the card's detail section, as "Duration: <duration>" and "Records processed: <records>", one in each line
  - Duration is formatted as `Nh Nm` (e.g., 1h 30m, 0h 45m).
  - "Records processed: " should prefix the formatted number of records. Records are formatted concisely: 
    - `< 1000`: `nnn` 
    - `< 1,000,000`: `Nk.N` (e.g., 1.5k)
    - `< 1,000,000,000`: `NM.N` (e.g., 1.5M)
    - `≥ 1,000,000,000`: `NB.N` (e.g., 1.5B)
  - `MTBF (Mean Time Between Failures): x days` (value color: x < 7 Red, 7 < x < 14 Amber, x > 14 Green)
  - `MTTR (Mean Time To Recover): x minutes/hours` (value color: x < 120 Green, 120 < x < 360 Amber, x > 360 Red) showing minutes if number less than 60 and hours otherwise
    
- **Consumption Metric Card Specifics:**
  - Instead of a single primary value and unit, the Consumption card should display a distinct primary value:
    - `{dynamic.responseTime.actualP95Ms} ms` labelled with "Response time"
  - The detail reference text below the values should display: 
    - `Target response time: {dynamic.responseTime.objectiveMs} ms`
    - If usage data is available: `Active consumers: {usage.activeConsumers}, Query count: {usage.queryCount}`



#### US-09 · Events Tab

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform operator, data product owner                                                                                                                                       |
| Story     | I want an Events tab that shows a chronological feed of recent incidents and pipeline events for the selected data product so that I can understand what happened and when. |
| Priority  | P0                                                                                                                                                                          |

##### Acceptance Criteria

- The Events tab displays a reverse-chronological list of events from the /observe/metrics response.

- Each event shows a severity badge (CRIT / WARN / OK), an event message, a timestamp, and a type label (pipeline / consumption / freshness / quality).

- Severity badges are colour-coded: CRIT = red, WARN = amber, OK = green.

- When a dimension filter is active, the Events tab is filtered to show only events of the matching type.

- Events reveal with a staggered animation (120ms delay) when the tab is first activated.

- If there are no events, a "No events in the observation period" message is displayed.

- The tab label shows a badge count of critical events if any exist (e.g. "EVENTS (2)").

#### US-13 · View observability metrica as YAML via a an observability panel tab

| **Field** | **Detail** |
| --- | --- |
| Role      | Developer, technical operator                                                                                                                                                             |
| Story     | I want a YAML tab that shows the raw metric data in YAML format for the selected data product so that I can debug and inspect the underlying data source directly. |
| Priority  | P2                                                                                                                                                                                                                       |

##### Acceptance Criteria

- The YAML tab is available alongside the Metrics and Events tabs.

- It displays the currently loaded `DataProductObservabilityMetrics` object in a syntax-highlighted YAML format.

- The data shown matches what is currently stored in memory (including any runtime date adjustments if Test Mode is active).

- Reuses the existing YAML inspection component and style used in other UI panels (e.g. Data Product / Data Contract details).


### 2.5 API Integration

#### US-10 · Fetch /observe/metrics on Observe Mode Activation

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform (system story)                                                                                                                                                          |
| Story     | When Observe Mode is activated, the platform fetches kind:DataProductObservabilityMetrics from the DataMeshRegistry for all visible data product nodes in parallel so that health shading is applied without sequential delay. |
| Priority  | P0                                                                                                                                                                               |

##### Acceptance Criteria

- On Observe Mode activation, the platform identifies all data product nodes in the current viewport.

- Nodes for which a response is pending display a grey "unknown" state with a pulsing indicator.


- Nodes are updated individually as responses arrive, rather than waiting for all responses.

- Nodes for which a response is not availble after full refresh result in the node being shaded grey with an error indicator.

- Successful responses are cached for the duration of the Observe Mode session. A manual refresh button allows re-fetching all nodes.

#### US-11 · /observe/metrics Schema Conformance

| **Field** | **Detail** |
| --- | --- |
| Role      | Platform (system story)                                                                                                                                           |
| Story     | The platform validates each /observe/metrics response against  odps-observability-metrics-schema-v0.0.1.json JSON Schema so that malformed or non-conformant responses are handled gracefully. |
| Priority  | P1                                                                                                                                                                |

##### Acceptance Criteria

- Each API response is validated against odps-observability-metrics-schema-v0.0.1.json JSON Schema before being applied to the UI state.

- Validation failures are logged as per other DataMeshRegistry elements and the affected node is shaded grey with a "Schema mismatch" tooltip.

- The platform supports partial responses where optional top-level objects (physical, static, usage) are absent.

- The schemaVersion field is checked; responses with unsupported schema versions are flagged in the developer console but are not rejected.

### 2.6 Testability

#### US-12 · Internal Test Mode

| **Field** | **Detail** |
| --- | --- |
| Role      | Developer, QA, platform operator                                                                                                                                                          |
| Story     | I want a testing mode so that I can easily verify edge cases and demonstrate observability behaviours using static mocked data. |
| Priority  | P0                                                                                                                                                                               |

##### Acceptance Criteria

- Testing mode is controlled by appending a `#test` fragment to the URL.

- Only when in test mode, the configuration option cog (US-05) shows an additional "Adjust metrics time" checkbox.

- When "Adjust metrics time" is active, dynamically adjust all dates and timestamps within the loaded observability data at runtime so that the view correctly simulates a 24-hour window ending at the current real-world time.

## 3. UI/UX Design

### 3.1 Design Principles

| **Principle** | **Application to Observability** |
| --- | --- |
| Non-intrusive            | Observe Mode is opt-in. The graph remains fully navigable (pan, zoom, click) while active. The drilldown panel never covers more than 35% of the canvas width.                                    |
| Progressive disclosure   | The first level (node shading) communicates worst-case status. The second level (dimension filter) reveals root dimension. The third level (drilldown) reveals specific metric values and events. |
| Spatial continuity       | The drilldown panel slides in from the right, keeping the selected node visible in the remaining canvas.                                                                                          |
| Consistent RAG semantics | Green / amber / red status colours are used consistently across node shading, edge colours, pip indicators, metric card borders, and event severity badges.                                       |

### 3.2 Observe Mode States

The following state machine governs the Observe Mode lifecycle:

| **State** | **Trigger** | **Visual change** |
| --- | --- | --- |
| Idle                 | Default / Observe Mode off                 | No shading. Edges static. No legend. No pips.                                                                              |
| Fetching             | Observe Mode activated, requests in flight | Nodes shimmer dark gray. Spinner on OBSERVE button.                                                                             |
| Observing (Any)    | All fetches complete, no dimension filter  | Full RAG shading. Animated edges. Pips visible. Legend shown.                                                              |
| Observing (Filtered) | Dimension selected in sub-menu             | RAG shading re-computed for active dimension only. Sub-menu highlights active item. Pips de-emphasise inactive dimensions. |
| Drilldown open       | Node clicked in any Observing state        | Panel slides in. Node receives selection ring. Panel respects active dimension filter.                                     |
| Error                | Fetch failure for one or more nodes        | Affected nodes shaded dark gray with ! indicator. Tooltip on hover explains the error.                                          |

### 3.3 Health Status Colour Palette

| **Status** | **Enum value** | **Node border** | **Node background** | **Edge colour** | **Usage** |
| --- | --- | --- | --- | --- | --- |
| Healthy    | healthy        | \#22C55E        | \#0D2B1A            | \#22C55E88      | All response times met, no quality failures, pipeline healthy             |
| Degraded   | degraded       | \#F59E0B        | \#2B1D05            | \#F59E0B88      | Response time near breach, elevated lag, minor quality issues         |
| Critical   | critical       | \#EF4444        | \#2B0A0A            | \#EF444488      | Response time breached, pipeline failed, or critical quality rule failing |
| Unknown    | unknown        | \#9CA3AF        | \#4B5563            | \#9CA3AF66      | No /observe data available, fetch failed, or schema mismatch    |

### 3.4 Dimension Icons and Labels

| **Dimension** | **Icon** | **Scope** | **Source in /observe/metrics** |
| --- | --- | --- | --- |
| Pipeline      | ▸        | Most recent pipeline run status and duration    | physical.pipeline.status                                      |
| Consumption   | ◈        | Overall consumption response time objective evaluation | dynamic.responseTime |
| Freshness     | ⧗        | Data lag vs. max allowed lag from ODCS contract | dynamic.freshness.lagMinutes vs maxAllowedLagMinutes          |
| Quality       | ✦        | Quality rule pass rate from ODCS contract rules | dynamic.quality.rulesPassed / rulesTotal                      |

### 3.5 Drilldown Panel Layout

The drilldown panel follows similar layout to the existing Data Product Details panel. . It contains the following zones:

| **Zone** | **Height** | **Content** |
| --- | --- | --- |
| Header   | 64px fixed            | DATA PRODUCT label, product name (bold, 15px), active dimension filter badge (if set), close button |
| Tab bar  | 40px fixed            | METRICS, EVENTS, and YAML tabs. Tab switch is instantaneous with no re-fetch.                              |
| Body     | Remaining, scrollable | Metric cards (Metrics tab), event feed (Events tab), or YAML viewer (YAML tab)                                               |


> **NOTE:** The panel width (320px) is chosen to leave at least 65% of an 1280px viewport available for the graph — sufficient to keep the selected node visible and maintain mesh context.

### 3.6 Metric Card Anatomy

Each dimension metric card within the Metrics tab contains:

- **Header row:** dimension icon + name (left) and PASSING/FAILING badge (right)

- **Metric rows:** key-value pairs showing the measured value and the threshold/objective in parentheses

- **Progress bar (Quality only):** animated fill from 0% to the actual pass rate, coloured by status

- **Border colour:** matches the dimension status (green / amber / red)

Cards animate in with a staggered reveal (opacity + translateY) with 100ms between each card.

### 3.7 Responsive Behaviour

| **Viewport width** | **Drilldown panel**                 | **Dimension sub-menu**        |
|--------------------|-------------------------------------|-------------------------------|
| ≥ 1280px           | 320px fixed slide-in                | Full labels visible           |
| 1024–1279px        | 280px fixed slide-in                | Full labels visible           |
| \< 1024px          | Full-screen modal sheet from bottom | Icon-only, labels in tooltips |

## 4. API Contract

### 4.1 Data Product Observability Metrics sourcing

The Data Product Observability Metrics are sourced from the DataMeshRegistry that exposes other nodes such kind:DataProduct and kind:DataContract

## 5. Health Status Derivation

### 5.1 Composite Status Algorithm

The composite status field on each node is not taken directly from the API response status field. It is derived client-side from the four dimension statuses, enabling the dimension filter to re-shade nodes without an additional API call:

```javascript
function deriveStatus(metrics, dimension) {
  const dims = dimension ? [dimension] : ['pipeline', 'consumption', 'freshness', 'quality'];
  for (const d of dims) {
    if (isDimCritical(metrics, d)) return 'critical';
  }
  for (const d of dims) {
    if (isDimDegraded(metrics, d)) return 'degraded';
  }
  return dims.every(d => isDimHealthy(metrics, d)) ? 'healthy' : 'unknown';
}
```

### 5.2 Per-Dimension Thresholds

| **Dimension** | **Critical condition** | **Degraded condition** | **Healthy condition** |
|---|---|---|---|
| Pipeline      | physical.pipeline.status === "failed"                   | N/A                                                          | physical.pipeline.status !== "failed"      |
| Consumption   | (dynamic.responseTime.met=F) AND (actualP95>2×obj) | (dynamic.responseTime.met=F) AND NOT Critical          | dynamic.responseTime.met=T        |
| Freshness     | dynamic.freshness.lagMinutes > 2× maxAllowedLagMinutes | dynamic.freshness.withinExpectation === false                 | withinExpectation === true |
| Quality       | dynamic.quality.rulesFailed > 1                        | dynamic.quality.rulesFailed === 1                             | rulesFailed === 0          |

*Note on Unknown states: A dimension evaluates to `unknown` if there is insufficient metric data available. For Consumption specifically, the dimension is `unknown` if `dynamic.responseTime.met` is null or unavailable.*

## 6. Implementation Notes

### 6.1 React Flow Integration

- **Node shading:** Apply health CSS classes (h-green, h-amber, h-red) to the custom DataProductNode component. Use CSS transitions (300ms ease) on background, border-color, and box-shadow.

- **Edge colouring:** Re-derive edge stroke colour and animated prop on each observe state change. Pass through the edges array prop to ReactFlow.

- **Panel coexistence:** The drilldown panel is rendered outside the ReactFlow component tree, positioned absolutely relative to the canvas wrapper. This avoids z-index conflicts with React Flow's internal overlays.

- **Node click:** Use the onNodeClick React Flow callback. Guard with observeMode state before opening the panel.

### 6.2 State Management

| **State key**   | **Type**                                   | **Description**                                                                            |
|-----------------|--------------------------------------------|--------------------------------------------------------------------------------------------|
| observeMode     | boolean                                    | Whether Observe Mode is currently active                                                   |
| activeDimension | string \| null                             | Active dimension filter: "pipeline" \| "consumption" \| "freshness" \| "quality" \| null (= worst) |
| metricsCache    | Map\<productId, MetricsResponse\>          | Cached /observe/metrics responses for the session                                          |
| fetchStatus     | Map\<productId, "pending"\|"ok"\|"error"\> | Per-node fetch state for loading indicators                                                |
| drillNodeId     | string \| null                             | Currently selected node's productId, or null                                               |
| drillTab        | "metrics" \| "events" \| "yaml"            | Active tab in the drilldown panel                                                          |


### 6.3 Performance Considerations

- Fetch all visible nodes in parallel using Promise.allSettled to avoid a single slow endpoint blocking the rest.

- Apply a 10-second timeout to each individual fetch request.

- Debounce dimension filter changes by 50ms to avoid redundant re-renders during rapid switching.

- The metricsCache is keyed by productId and cleared when Observe Mode is toggled off.

- For large meshes (\> 50 nodes), apply intersection observer-based lazy fetching: only fetch nodes currently visible in the React Flow viewport.

### 6.4 Accessibility

- The OBSERVE button must have a descriptive aria-label that reflects its current state: "Activate observe mode" or "Deactivate observe mode".

- Node health status must be communicated via aria-label on the node element, not only via colour (e.g. aria-label="Inventory — Critical health").

- The drilldown panel must be a role="dialog" with aria-labelledby pointing to the product name heading.

- Focus must move into the drilldown panel when it opens and return to the triggering node when it closes.

- All status colours must meet WCAG AA contrast ratios against their respective background colours.


7. Visual Test Plan

Create a DataMeshRegistryObservability.yaml derived with the exact same Data Product and Data Contracts as DataMeshRegistryPetsExample.yaml that illustrates the various features of the observability feature.
When creating test data, create a sample view that shows metrics for a 24 hour window ending on the 2nd of March 2026 (dates will normally become stale but this will be mitigated dynamically via the #test mode logic).
Ensure that in DataMeshRegistryObservability.yaml Data Sources and Applications data products (dataSource and application data product tiers) don't have observability data, so unknown status can be visually verified.
Ensure that DataMeshRegistryObservability.yaml is valid against all schemas in src/schemas.