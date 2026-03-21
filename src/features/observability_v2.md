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
- Per dimension drilldown health check (array of squares)
- Per dimension drilldown secondary metrics (show metrics on hover)

DONE
- Ability to uppercase metric value using config.yaml case: upper, lower
- Enable KPI definitions, including aggregation and visualization rules from DataProductObservability data ensuring Standard behavior for DATA SOURCES, DATA PRODUCTS, OUTPUT PORTS (counting visible objects) and custom - Custom behavior for RECORDS INGESTED, RECORDS PROCESSED, using aggregation configuration defined in config.yaml. Configuration objects should have visible: true/false to control visibility and aggregation rules to control aggregation behavior, depending on criteria. For example, RECORDS INGESTED would be configured as sum of pipelineRecordsProcessed, where data DataProduct dataProductTier value is sourceAligned