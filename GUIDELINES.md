# Data Mesh Viewer Development Standards

## 1. Project Overview
A React-based visualization tool for Data Mesh registries, utilizing React Flow (`@xyflow/react`) for graph rendering, Material UI (MUI) for standardized UI components, and AJV for schema validation against ODCS (Open Data Contract Standard) and ODPS (Open Data Product Specification).

## 2. Coding Conventions

### File Headers
All source files (`.js`, `.jsx`, `.css`) must begin with the Apache 2.0 license header:
```javascript
/*
 * Copyright 2026 Joao Vicente
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

### React Components
- **Functional Components**: Use arrow function components.
- **Performance**: Wrap React Flow nodes and expensive visuals in `memo`.
- **Props**: Destructure props directly in the component signature.
- **Naming**: Use `PascalCase` for component files and names (e.g., `DataProductNode.jsx`).
- **Styles**: Prefer a mix of M3 CSS variables for theme and inline styles for dynamic node properties.

### Styling Strategy
- **Global Tokens & Theming**: The application relies on MUI dynamic theming and CSS variables. Theming is configurable via `public/config.yaml` and CSS theme files (e.g., `public/themes/custom-theme.css`).
- **Inline Styles**: Use for node-specific layout (width, height, dynamic background colors).
- **Interactive Elements**: Use CSS classes for hover effects and shared UI components (e.g., `.yaml-pill`, `.output-ports-pill`).

## 3. Communication Patterns

### Event-Driven Logic
Avoid tight coupling between nodes and the main `Flow.jsx`. Use `CustomEvent` via the `window` object for cross-component communication:
- `open-side-panel`: Triggers the side panel with YAML or tabular data.
- `navigate-to-node`: Handled by Flow to center/zoom on a specific node.

Example:
```javascript
const event = new CustomEvent('open-side-panel', {
    detail: { 
        id: data.id, 
        type: 'data-product-yaml', 
        content: data.originalData 
    }
});
window.dispatchEvent(event);
```

## 4. Data & Validation

### Schema Standards
- **ODCS**: Open Data Contract Standard (stored in `src/schemas/odcs-...`).
- **ODPS**: Open Data Product Specification (stored in `src/schemas/odps-...`).
- **Validation**: All registry items should be validated via `src/ValidationService.js`.

### Validation Service Logic
When adding new validation rules:
- Ensure errors are mapped back to line numbers using `YAML.LineCounter`.
- Maintain the `instancePath` tracking to allow the UI to highlight specific fields in the YAML view.

## 5. UI/UX Principles
- **Pill Badges**: Use rounded badges for counts, statuses, and navigation shortcuts.
- **Banners**: Nodes must include a colored banner displaying the object type or domain name.
- **Typography**: Typography is customizable via CSS themes. Custom fonts can be loaded from the `public/fonts` directory and defined in the active theme CSS. `Inter` serves as the default fallback.
- **Elevation**: Follow M3 elevation levels (`--m3-elevation-1` through `3`) for cards and modals.

## 6. Security and CI/CD

- **Static Analysis**: The codebase is continuously scanned for vulnerabilities using GitHub CodeQL.
- **Dependency Management**: Dependencies are regularly updated via Dependabot.
- **Vulnerability Scanning**: Snyk GitHub Actions are integrated to check for vulnerabilities in `package.json` dependencies (requires `SNYK_TOKEN` repository secret).
- **Pull Requests**: All new code and PRs must successfully pass these security workflows before merging into `main`.
