# Weather Carbon Optimization Flow Plan

## Objective

Build a new flow that ingests live hourly weather and UK carbon intensity data, models historical and forecast carbon impact, combines those signals with local operations data, and delivers an interactive dashboard for operations leaders.

This file is a planning artifact only. No flow implementation is included yet.

## Proposed Flow Name

`weather_carbon_optimization`

## Scope Requested

1. Ingest the last 30 days of hourly weather and carbon intensity data using custom Python read components.
2. Build a historical hourly model relating weather and time-of-day to carbon impact and carbon cost.
3. Ingest weather forecast data and generate 7-day hourly predictive carbon impact output.
4. Combine predictions with local operations data to identify financially and environmentally beneficial rescheduling windows.
5. Create an interactive dashboard artifact for operations leaders.

## Required Inputs

### Live API sources

- OpenMeteo endpoint family at `https://open-meteo.ascend.dev/`
- UK Carbon Intensity endpoint family at `https://uk-carbon-intensity.ascend.dev/intensity`

### Hard-coded weather coordinates

These will be embedded directly in the OpenMeteo read component logic:

- Manchester: `(53.4808, -2.2426)`
- Birmingham: `(52.4862, -1.8904)`
- Leeds: `(53.8008, -1.5491)`
- Bristol: `(51.4545, -2.5879)`
- London: `(51.5074, -0.1278)`

### Local operations data

- `data/read_facilities.csv`
- `data/read_machines.csv`
- `data/read_production_schedule.csv`

Observed local file schemas from the checked-in CSVs:

- Facilities: `facility_id`, `facility_name`, `city`, `region`, `latitude`, `longitude`, `annual_energy_kwh`, `avg_carbon_intensity_gco2`
- Machines: `machine_id`, `machine_name`, `machine_type`, `facility_id`, `kwh_per_hour`, `min_runtime_hours`, `max_daily_runtime_hours`, `schedulable`
- Production schedule: `facility_id`, `machine_id`, `day_of_week`, `shift`, `scheduled_hour`, `runtime_hours`, `energy_kwh`

## Implementation Principles

- Use only live API responses; never mock or fabricate source data.
- Inspect real HTTP payloads from the exact endpoints to be implemented before writing parser logic.
- Build iteratively and validate schemas before building downstream components.
- When fixing an error, run only the affected component instead of the full flow.
- Run the full flow end-to-end only after all components are implemented and individually validated.
- Use schema-evolution-friendly patterns for Python reads and downstream models.
- Add retries with exponential backoff and explicit handling for transient HTTP failures and rate limits.

## Proposed High-Level Architecture

### 1) Source ingestion layer

Custom Python read components:

- `read_weather_history.py`
  - Pull 30 days of hourly historical weather for the five hard-coded coordinates.
  - Include metadata columns for city/coordinate identity.
  - Handle pagination or windowing if needed based on actual endpoint behavior.

- `read_carbon_history.py`
  - Pull 30 days of hourly UK carbon intensity data.
  - Normalize timestamps and observed intensity fields from the live payload.

- `read_weather_forecast.py`
  - Pull next 7 days of hourly forecast weather for the same five hard-coded coordinates.

Local YAML read components for operations data:

- `read_facilities.yaml`
- `read_machines.yaml`
- `read_production_schedule.yaml`

### 2) Standardization layer

Transform components to:

- Normalize timestamps to a common hourly grain.
- Standardize city/facility matching logic.
- Derive weather features needed for modeling.
- Derive time-of-day bucket labels for tariff assignment.

### 3) Historical modeling layer

Transforms to create a historical training/model dataset by joining:

- weather history
- carbon history
- time-of-day features
- tariff assumptions

Model outputs should include at minimum:

- hourly carbon intensity / impact baseline
- carbon cost using `£85/ton CO2`
- tariff bucket and electricity price per kWh
- explanatory weather and temporal features

### 4) Forecast scoring layer

Transforms to score next 7 days of hourly forecast data using the historical model from step 2.

Expected outputs:

- predicted hourly carbon impact
- predicted carbon cost
- predicted tariff bucket and energy price assumptions

### 5) Operations optimization layer

Transforms combining:

- forecast predictions
- facilities
- machines
- production schedule

Optimization logic will:

- evaluate only machines where `schedulable = true`
- compare current scheduled windows against alternative candidate windows
- maximize:

  `total_savings_gbp = energy_cost_savings_gbp + carbon_cost_savings_gbp`

- recommend rescheduling only where:
  - `total_savings_gbp > 0`
  - `carbon_savings_kg > 0`

### 6) Presentation layer

Interactive dashboard artifact showing:

- total combined savings
- facility-level summary savings
- machine-level recommended windows
- energy cost savings
- carbon savings in kg
- carbon cost savings

## Proposed Component Sequence

### Ingestion

1. `read_weather_history.py`
2. `read_carbon_history.py`
3. `read_weather_forecast.py`
4. `read_facilities.yaml`
5. `read_machines.yaml`
6. `read_production_schedule.yaml`

### Standardization and feature engineering

7. `weather_history_enriched.py`
8. `carbon_history_enriched.py`
9. `historical_weather_carbon_features.sql` or `.py`
10. `forecast_weather_features.py`

### Modeling and prediction

11. `historical_carbon_model.py`
12. `forecast_carbon_predictions.py`

### Optimization

13. `operations_schedule_baseline.py`
14. `operations_reschedule_candidates.py`
15. `operations_optimization_recommendations.py`
16. `facility_savings_summary.sql` or `.py`

### Presentation

17. Dashboard application in `applications/`

## Detailed Delivery Plan

### Phase 1 — Discovery and source validation

Before implementation:

1. Inspect exact live HTTP responses for:
   - historical weather endpoint to be used
   - forecast weather endpoint to be used
   - carbon intensity endpoint to be used
2. Record observed response shapes, timestamp fields, and nullable fields.
3. Finalize parser design from observed payloads rather than docs.

Deliverable:

- Confirmed endpoint URLs and observed schema notes

### Phase 2 — Source components

Build and validate custom Python read components for:

- weather history
- carbon history
- weather forecast

Requirements:

- exponential backoff retries
- graceful rate-limit handling
- live HTTP reads only
- schema change tolerance (`on_schema_change="sync_all_columns"` or equivalent compatible pattern)
- explicit logging of fetch window and row counts

Validation approach:

- Run each read component independently
- inspect output schema and representative sample rows

### Phase 3 — Operations data ingestion

Build local read YAMLs for the CSV inputs and validate each independently.

Validation approach:

- run each component alone
- verify data types and row counts against the CSVs

### Phase 4 — Historical model dataset and pricing logic

Build transforms that:

- join historical weather and carbon data at hourly grain
- derive tariff bucket by hour
- assign fixed tariff values:
  - off-peak: `£0.135/kWh`
  - mid-peak: `£0.145/kWh`
  - on-peak: `£0.155/kWh`
- calculate carbon cost using `£85/ton CO2`

Validation approach:

- run only the new model dataset component
- inspect hourly outputs for sensible bucket assignment and cost calculations

### Phase 5 — Predictive model

Build a practical predictive model in Python using the historical dataset.

Planned approach:

- start with an interpretable baseline model using weather features plus time-of-day features
- keep implementation deterministic and inspectable
- persist prediction-ready outputs in downstream tables

Validation approach:

- verify forecast scoring shape and row counts
- compare predicted ranges against recent historical values for sanity

### Phase 6 — Optimization logic

Build transforms that:

- represent current production schedule cost/carbon baseline
- enumerate feasible rescheduling windows
- compute baseline vs candidate energy and carbon costs
- filter to only positive-value recommendations

Validation approach:

- run each optimization component independently
- inspect several machine examples to confirm recommendation logic

### Phase 7 — Dashboard artifact

Build an interactive application that reads final optimization outputs and presents:

- executive KPI cards
- facility comparison
- machine recommendation table
- savings breakdowns

Validation approach:

- confirm queries run sequentially if multiple queries are needed
- include a top-level Refresh button
- verify displayed metrics reconcile to final tables

### Phase 8 — End-to-end validation

After all components validate individually:

1. wait for the latest build to be ready
2. run the full flow end to end
3. inspect final outputs and dashboard metrics

## Modeling Notes To Confirm During Build

These items should be finalized during implementation after inspecting live payloads and sample data:

- Exact hourly alignment strategy between weather timestamps and carbon timestamps
- Mapping from facility rows to the nearest hard-coded weather city/coordinate
- Final definition of tariff hour buckets
- Final predictive feature set based on observed weather fields
- Candidate rescheduling search space constraints for each machine and schedule row

## Risks and Mitigations

### API rate limits or transient failures

- Mitigation: exponential backoff, bounded retries, clear logging, fail with actionable error if source is unavailable.

### Schema drift in API payloads

- Mitigation: inspect payloads first, normalize defensively, enable schema evolution-friendly settings, preserve raw nullable fields where useful.

### Timestamp mismatches across sources

- Mitigation: standardize to explicit hourly timestamps and test joins with real samples before building the model.

### Forecast model over-complexity

- Mitigation: begin with a simple interpretable model that can be validated quickly, then refine only if necessary.

### Unrealistic rescheduling recommendations

- Mitigation: enforce schedulable-only filtering, runtime constraints, and positive savings thresholds.

## Files Expected To Be Added Later

### Flow

- `flows/weather_carbon_optimization/weather_carbon_optimization.yaml`

### Components

- `flows/weather_carbon_optimization/components/read_weather_history.py`
- `flows/weather_carbon_optimization/components/read_carbon_history.py`
- `flows/weather_carbon_optimization/components/read_weather_forecast.py`
- `flows/weather_carbon_optimization/components/read_facilities.yaml`
- `flows/weather_carbon_optimization/components/read_machines.yaml`
- `flows/weather_carbon_optimization/components/read_production_schedule.yaml`
- downstream transform/model components to be finalized during implementation

### Application

- `applications/weather-carbon-optimization-<id>/...`

### Documentation

- update `flows/README.md`
- possibly add `flows/weather_carbon_optimization/README.md`

## Approval Gate

Pending your approval, the next step will be to start Phase 1 by inspecting live API responses from the exact weather-history, weather-forecast, and carbon-intensity endpoint URLs that the implementation will use.