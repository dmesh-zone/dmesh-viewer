Add enhancements as follows:
Using  src\schemas\odps-observability-json-schema-v0.1.0.json 
Allow for observability configuration as follows
Define visualization configuration
KPI definitions, including aggregation and visualization rules from DataProductObservability data
Define Observability Dimension definitions and associated rules (pipeline, freshness, quality, consumption)
Per dimension health check configuration stating checks which determine health for dimension
Per dimension key result which will show measure in large font
Per dimension secondary metrics showing remaining metrics, using UX names defined in config.yaml
Create equivalent automated observability simulation


TODO: 

- Test behavior by enhancing DataMeshRegistryObservability.yaml with more data and metrics to match previous version
- Test behavior to trigger health:critical using severity:critical
- Ability to uppercase metric value using config.yaml case: upper, lower
- Per dimension drilldown health check (array of squares)
- Per dimension drilldown secondary metrics (show metrics on hover)
- KPI definitions, including aggregation and visualization rules from DataProductObservability data
    - Standard behavior for DATA SOURCES, DATA PRODUCTS, OUTPUT PORTS
    - Custom behavior for RECORDS INGESTED, RECORDS PROCESSED

