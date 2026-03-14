# Data Mesh Registry Visualizer

A React-based visualization tool for exploring Data Mesh registries, Data Products, Data Contracts, and Data Usage Agreements.

Live demo: https://joaovicente.github.io/data-mesh-viewer

## Features

- **Interactive Visualization**: Browse Data Products, their relationships, and contracts
- **Domain Filtering**: Filter by domain and search by name
- **Data Contract View**: Explore schema details with primary keys and foreign key relationships
- **Data Quality Rules**: View quality rules and validation criteria
- **Configurable**: Customize icons, colors, and tiers via `config.yaml`

## Configuration

The application is configured through `./public/config.yaml`. This file controls the default registry URL, visual appearance, and data product tiers.

### Configuration File Structure

```yaml
defaultDataMeshRegistryUrl: /DataMeshRegistry.yaml
iconMap:
  ...
domainPalette:
  - ...
tiers:
  ...
```

### Required Fields

#### `defaultDataMeshRegistryUrl` (required)

The path or URL to your Data Mesh registry YAML or JSON file.

**Examples:**
local file: 
```yaml
defaultDataMeshRegistryUrl: /DataMeshRegistryPetsExample.yaml
```

remote file:
```yaml
defaultDataMeshRegistryUrl: https://www.example.com/DataMeshRegistryPetsExample.yaml
```

### Optional Fields

#### `iconMap` (optional)

Maps technology names to icon file paths. Icons should be placed in `public/icons/`.

**Example:**
```yaml
iconMap:
  databricks: /icons/databricks.svg
  powerBi: /icons/powerbi.svg
  oracle: /icons/oracle.svg
```

**Default**: Empty object (uses fallback icons)

#### `domainPalette` (optional)

Array of hex color codes for domain backgrounds. Colors are assigned to domains in order.

**Example:**
```yaml
domainPalette:
  - "#fee2e2"
  - "#f3e8ff"
  - "#fef3c7"
  - "#ffedd5"
```

**Default**: `["#fee2e2", "#f3e8ff", "#fef3c7", "#ffedd5", "#e0e7ff", "#dbeafe", "#dcfce7"]`

#### `tiers` (optional)

Defines visual styling and positioning for Data Product tiers.

**Example:**
```yaml
tiers:
  sourceAligned:
    label: DATA PRODUCT (SOURCE ALIGNED)
    color: "#bfdbfe"
    bannerColor: "#93c5fd"
    columnNumber: 1
```

**Properties:**
- `label`: Display text for the tier banner
- `color`: Background color (hex code)
- `bannerColor`: Banner background color (hex code)
- `columnNumber`: Column position (1, 2, 3, 4, 5...) for auto-layout. Spacing is automatically calculated at 450px per column. All nodes in a column have a consistent width of 280px.

**Default**: Includes `dataSource`, `sourceAligned`, `curated`, `consumerAligned`, and `application` tiers

## Local Development

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher

### Installation
Clone or download the repository and then install dependencies

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173` (or the next available port).

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Observability Simulation

A standalone simulation module is available to generate realistic observability metrics for testing.

### Runtime Simulation

When running the application in test mode (append `#test` to the URL), you can enable real-time metric simulation from the **Observability Settings (cog icon)** sub-menu. This will generate metrics for:
- Pipeline Status
- SLOs
- Freshness
- Quality

Simulated health follows a distribution of 70% Healthy, 20% Degraded, and 10% Critical.

### CLI Simulation

You can use the simulation module to generate metrics for a registry file from the command line:

```bash
# Generate simulated metrics for all dimensions
node src/ObsSimulation.js public/MyRegistry.yaml

# Generate specific dimensions
node src/ObsSimulation.js public/MyRegistry.yaml Pipeline,SLOs
```

This will create a new file `public/MyRegistry-with-sim-metrics.yaml` containing the original data plus the simulated observability metrics.

## Troubleshooting

### Configuration Errors

If you see a red "Configuration Error" banner:

**"Failed to load config.yaml"**
- Ensure `public/config.yaml` exists
- Check that the file is valid YAML (proper indentation, no tabs)
- Verify file permissions

**"config.yaml is empty"**
- Add configuration settings to the file
- See the Configuration section above for the required structure

**"config.yaml contains invalid YAML syntax"**
- Check indentation (use spaces, not tabs)
- Ensure colons have spaces after them
- Validate your YAML using an online validator

**"config.yaml is missing required field 'defaultDataMeshRegistryUrl'"**
- Add the `defaultDataMeshRegistryUrl` field to your config.yaml
- Example: `defaultDataMeshRegistryUrl: /DataMeshRegistry.yaml`

**"config.yaml must contain a valid YAML document"**
- Ensure the file is not empty
- Check that the file contains valid YAML structure
- Use a YAML validator to check syntax

### Registry Loading Errors

**"Failed to fetch registry"**
- Verify the registry URL in `defaultDataMeshRegistryUrl` is correct
- Ensure the registry file exists at the specified path
- Check browser console for CORS errors if loading from external URL

**"Invalid YAML format"**
- Validate your registry YAML file
- Ensure proper indentation (use spaces, not tabs)
- Check for syntax errors in the YAML

### No Data Products Displayed

- Check that domains are selected in the Domain Selector dropdown
- Verify your registry contains Data Products with `kind: DataProduct`
- Use the global filter to search for specific products

### Icons Not Displaying

- Ensure icon files exist in `public/icons/`
- Verify paths in `iconMap` start with `/icons/`
- Check that icon file names match exactly (case-sensitive)

## Registry File Format

The application expects a YAML file containing an array of Data Mesh entries that must conform with one of the following standards and specifications:
* [Open Data Product Standard](https://bitol-io.github.io/open-data-product-standard/v1.0.0)
* [Open Data Contract Standard](https://bitol-io.github.io/open-data-contract-standard/v3.0.1) 
* [Data Usage Agreement specification](https://datausageagreement.com/)

**Supported Entity Types:**
- `DataProduct`: Data products with metadata, output ports, and contracts
- `DataContract`: Schema definitions with columns, types, and relationships
- `DataUsageAgreement`: Agreements between providers and consumers

See the included `public/DataMeshPetsRegistry.yaml` for a complete example.

## Browser Compatibility

- Chrome/Edge: Version 90+
- Firefox: Version 88+
- Safari: Version 14+

## License

Copyright 2026 Joao Vicente

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) file for details.
