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

import React from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, MarkerType, applyNodeChanges, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DataProductNode from './DataProductNode';
import DataProductDetailNode from './DataProductDetailNode';
import DataContractNode from './DataContractNode';
import InteractiveYaml from './InteractiveYaml';
import InteractiveJson from './InteractiveJson';
import ExampleTable from './ExampleTable';
import QualityTable from './QualityTable';
import RelationshipEdge from './RelationshipEdge';
import { validateRegistry } from './ValidationService';
import YAML from 'yaml';
import * as ObsSim from './ObsSimulation';

import DomainSelector from './DomainSelector';
import GlobalFilter from './GlobalFilter';
import DataProductVisual from './DataProductVisual';
import DataContractVisual from './DataContractVisual';
import DataUsageAgreementVisual from './DataUsageAgreementVisual';
import RegistryModal from './RegistryModal';
import ObservabilityDrilldown from './ObservabilityDrilldown';
import ErrorBoundary from './ErrorBoundary';
import { useThemeContext } from './ThemeContext';
import ThemeToggle from './ThemeToggle';


const HeaderNode = ({ data }) => (
    <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600', width: 250, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {data.label}
    </div>
);

const nodeTypes = {
    selectorNode: DataProductNode,
    lineageNode: DataProductDetailNode,
    dataContractNode: DataContractNode,
    headerNode: HeaderNode
};

const edgeTypes = {
    relationshipEdge: RelationshipEdge,
};

const BASE_URL = import.meta.env.BASE_URL;

const normalizePath = (path) => {
    if (!path) return path;
    
    // If it's the absolute localhost backend, normalize it to the proxy path
    // ONLY in development mode where the Vite proxy is active.
    if (import.meta.env.DEV && path.startsWith('http://localhost:8000/dmesh')) {
        const relativePath = path.replace('http://localhost:8000/', '');
        return `${BASE_URL}${relativePath}`;
    }

    if (path.startsWith('http')) return path;
    
    // If it already starts with BASE_URL, don't normalize again
    if (path.startsWith(BASE_URL)) return path;

    // Prefix relative paths starting with / with BASE_URL
    if (path.startsWith('/')) {
        return `${BASE_URL}${path.slice(1)}`;
    }
    return path;
};

export default Flow;

function Flow() {
    // Theme Context
    const { mode, setThemeFromConfig } = useThemeContext();

    // Registry State - URL will be loaded from config.json
    const [registryUrl, setRegistryUrl] = React.useState('');

    const [dataMeshRegistry, setDataMeshOperationalData] = React.useState([]);
    const [dataMeshRegistryRaw, setDataMeshOperationalDataRaw] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [config, setConfig] = React.useState({ iconMap: {}, tiers: {}, domainPalette: [], defaultDataMeshOperationalDataUrl: '', registries: [], 'single-domain-default-filter': false, 'zoom-to-fit-columns': true }); // Config state
    const [configError, setConfigError] = React.useState(null); // Track config loading errors
    const [showRegistryModal, setShowRegistryModal] = React.useState(false);

    // Load Config
    React.useEffect(() => {
        Promise.all([
            fetch(normalizePath(`/config.yaml?t=${Date.now()}`))
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Failed to load config.yaml (${res.status} ${res.statusText}). Make sure the file exists in the public directory.`);
                    }
                    return res.text();
                }),
            fetch(normalizePath(`/customConfig.yaml?t=${Date.now()}`))
                .then(res => res.ok ? res.text() : null)
                .catch(() => null)
        ])
            .then(([configText, customConfigText]) => {
                if (!configText || configText.trim() === '') {
                    throw new Error('config.yaml is empty. Please add configuration settings to the file.');
                }

                let data;
                try {
                    data = YAML.parse(configText);
                } catch (yamlErr) {
                    throw new Error(`config.yaml contains invalid YAML syntax: ${yamlErr.message}. Please check the file format.`);
                }

                if (!data || typeof data !== 'object') {
                    throw new Error('config.yaml must contain a valid YAML document with configuration settings.');
                }

                if (customConfigText && customConfigText.trim() !== '') {
                    try {
                        const customData = YAML.parse(customConfigText);
                        if (customData && typeof customData === 'object') {
                            Object.keys(customData).forEach(key => {
                                if (customData[key] !== null && typeof customData[key] === 'object' && !Array.isArray(customData[key]) &&
                                    data[key] !== null && typeof data[key] === 'object' && !Array.isArray(data[key])) {
                                    data[key] = { ...data[key], ...customData[key] };
                                } else {
                                    data[key] = customData[key];
                                }
                            });
                        }
                    } catch (yamlErr) {
                        console.warn(`customConfig.yaml contains invalid YAML syntax: ${yamlErr.message}. Ignoring custom config.`);
                    }
                }

                // Validate required fields
                if (!data.defaultDataMeshOperationalDataUrl) {
                    setConfigError('config.yaml is missing required field "defaultDataMeshOperationalDataUrl". Please add this field with the path to your registry YAML file.');
                    return;
                }

                const loadedConfig = {
                    ...data,
                    iconMap: data.iconMap || {},
                    tiers: data.tiers || {},
                    observability: data.observability || {},
                    defaultDataMeshOperationalDataUrl: normalizePath(data.defaultDataMeshOperationalDataUrl),
                    registries: (data.sampleDataMeshOperationalDataUrls || []).map(reg => ({
                        original: reg,
                        normalized: normalizePath(reg)
                    }))
                };
                setConfig(loadedConfig);
                setConfigError(null);

                // Pass theme config to context, but do NOT inject link here
                // We will handle link injection in a dedicated useEffect responding to mode
                if (loadedConfig.theme) {
                    setThemeFromConfig(loadedConfig.theme);
                }
                
                // Keep the initial config.theme name so the useEffect can use it
                // We don't append to DOM here.

                // Set initial registry URL from config
                setRegistryUrl(loadedConfig.defaultDataMeshOperationalDataUrl);
            })
            .catch(err => {
                console.error("Failed to load config.yaml", err);
                setConfigError(err.message);
            });
    }, []);

    // Effect to handle CSS theme file injection based on mode
    React.useEffect(() => {
        if (!config) return;
        
        let activeThemeName = 'light';
        const configThemeName = typeof config.theme === 'string' ? config.theme : 'light';
        
        if (configThemeName === 'light' || configThemeName === 'dark') {
            activeThemeName = mode; // Obey user toggle
        } else {
            // For custom themes, switch to "dark" if dark mode is requested, or fallback to the custom string.
            // Ideally we'd load 'custom-dark' but we'll use 'dark' as the base.
            activeThemeName = mode === 'dark' ? 'dark' : configThemeName;
        }

        let themeLink = document.getElementById('theme-link');
        if (!themeLink) {
            themeLink = document.createElement('link');
            themeLink.id = 'theme-link';
            themeLink.rel = 'stylesheet';
        }
        // Always append it to the end of the head so it takes precedence over Vite's injected <style> tags
        document.head.appendChild(themeLink);
        
        const baseUrl = import.meta.env.BASE_URL || '/';
        const themeUrl = `${baseUrl}/themes/${activeThemeName}-theme.css`.replace('//', '/');
        themeLink.href = import.meta.env.DEV ? `${themeUrl}?t=${Date.now()}` : themeUrl;
    }, [mode, config]);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selection, setSelection] = React.useState({ id: null, kind: null });
    const [hoveredEdgeId, setHoveredEdgeId] = React.useState(null);
    const [hoveredNodeId, setHoveredNodeId] = React.useState(null);
    const [rfInstance, setRfInstance] = React.useState(null);

    // Filter State
    const [selectedDomains, setSelectedDomains] = React.useState([]);
    const [globalFilterText, setGlobalFilterText] = React.useState('');

    // Side Panel State
    const [sidePanelContent, setSidePanelContent] = React.useState(null);
    const [sidePanelType, setSidePanelType] = React.useState('yaml'); // 'yaml' | 'examples'
    const [sidePanelWidth, setSidePanelWidth] = React.useState(500);
    const [sidePanelFilter, setSidePanelFilter] = React.useState(''); // New filter state
    const [sidePanelTab, setSidePanelTab] = React.useState('visual'); // 'visual' | 'yaml' | 'json'
    const [sidePanelAnchor, setSidePanelAnchor] = React.useState(null); // Table anchor
    const [sidePanelNodeId, setSidePanelNodeId] = React.useState(null); // Node ID for side panel
    const [copiedFormat, setCopiedFormat] = React.useState(null); // For copy button
    const [isHoveredBottomLeft, setIsHoveredBottomLeft] = React.useState(false); // Hover state for floating buttons

    // Mobile Responsiveness
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768 || window.innerHeight <= 500);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Observability State
    const [observeMode, setObserveMode] = React.useState(false);
    const [compactMode, setCompactMode] = React.useState(false);
    const [activeDimension, setActiveDimension] = React.useState(null); // null = 'any'
    const [metricsMap, setMetricsMap] = React.useState(new Map());
    const [drillNodeId, setDrillNodeId] = React.useState(null);
    const [hideHealthy, setHideHealthy] = React.useState(false);
    const [hideKpis, setHideKpis] = React.useState(false);
    const [showConfig, setShowConfig] = React.useState(false);
    const [showEventsTab, setShowEventsTab] = React.useState(false);

    const [showDomainLabels, setShowDomainLabels] = React.useState(() => localStorage.getItem('showDomainLabels') === 'true');
    React.useEffect(() => {
        localStorage.setItem('showDomainLabels', showDomainLabels);
    }, [showDomainLabels]);

    const [showDescriptionsExpanded, setShowDescriptionsExpanded] = React.useState(() => {
        const val = localStorage.getItem('showDescriptionsExpanded');
        return val === null ? true : val === 'true';
    });
    React.useEffect(() => {
        localStorage.setItem('showDescriptionsExpanded', showDescriptionsExpanded);
    }, [showDescriptionsExpanded]);
    
    const [showGlobalConfig, setShowGlobalConfig] = React.useState(false);
    const globalConfigMenuRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (globalConfigMenuRef.current && !globalConfigMenuRef.current.contains(event.target)) {
                setShowGlobalConfig(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    const configMenuRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (configMenuRef.current && !configMenuRef.current.contains(event.target)) {
                setShowConfig(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    const availableDimensions = React.useMemo(() => {
        if (!config?.observability?.dimensions) return [];
        const dims = Object.keys(config.observability.dimensions);
        return dims.length > 1 ? ['Any', ...dims] : dims;
    }, [config]);

    // Health Status Derivation Logic
    const deriveStatus = React.useCallback((productId, dimension) => {
        const metrics = metricsMap.get(productId);
        if (!metrics) return 'unknown';

        const dimsConfig = config?.observability?.dimensions;

        if (!dimension || dimension === 'Any') {
            return metrics.health || 'unknown';
        }

        if (!dimsConfig || !dimsConfig[dimension]) return 'unknown';

        const dimConfig = dimsConfig[dimension];
        const healthCheckName = dimConfig.healthCheck;
        if (!healthCheckName) return 'unknown';

        const checksToEvaluate = [healthCheckName];
        if (dimConfig.secondaryMetrics) {
            dimConfig.secondaryMetrics.forEach(sm => checksToEvaluate.push(sm.metric));
        }

        const activeChecks = metrics.results?.filter(r => checksToEvaluate.includes(r.name) && r.type === 'check') || [];
        if (activeChecks.length === 0) return 'unknown';

        let worstStatus = 'healthy';
        activeChecks.forEach(checkResult => {
            if (checkResult.status === 'fail') {
                let s = 'degraded';
                if (checkResult.severity === 'critical') s = 'critical';
                else if (checkResult.severity === 'error') s = 'degraded';
                else if (checkResult.severity === 'warning') s = 'degraded';

                if (worstStatus === 'healthy') worstStatus = s;
                else if (worstStatus === 'degraded' && s === 'critical') worstStatus = 'critical';
            }
        });

        return worstStatus;
    }, [metricsMap, config]);

    // Testability State
    const [isTestMode, setIsTestMode] = React.useState(() => window.location.hash.includes('#test'));
    const [adjustMetricsTime, setAdjustMetricsTime] = React.useState(false);
    const [simulatedDims, setSimulatedDims] = React.useState(new Set());

    // Listen for hash changes to update isTestMode dynamically
    React.useEffect(() => {
        const handleHashChange = () => {
            setIsTestMode(window.location.hash.includes('#test'));
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Ensure activeDimension is valid for the current registry
    React.useEffect(() => {
        if (availableDimensions.length > 0) {
            // Mapping current activeDimension back to labels to check existence
            const currentLabel = activeDimension === null ? 'Any' : activeDimension;

            if (!availableDimensions.includes(currentLabel)) {
                // If current selected dimension is invalid (e.g. 'Any' when only 1 dim exists)
                // Default to the first available dimension
                const firstDim = availableDimensions[0];
                const dimKey = firstDim === 'Any' ? null : firstDim;
                setActiveDimension(dimKey);
            }
        }
    }, [availableDimensions, activeDimension]);

    const [isResizing, setIsResizing] = React.useState(false);

    const processRegistryText = (text) => {
        setDataMeshOperationalDataRaw(text);

        // Check if response is HTML instead of YAML (common when file doesn't exist)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(`Registry file not found or invalid format. The content starts with HTML instead of YAML.`);
        }

        let parsed;
        try {
            parsed = YAML.parse(text);
        } catch (yamlErr) {
            throw new Error(`Invalid YAML format: ${yamlErr.message}`);
        }

        if (!parsed) {
            console.warn("Parsed registry is empty");
            setDataMeshOperationalData([]);
        } else {
            const items = Array.isArray(parsed) ? parsed : [parsed];
            setDataMeshOperationalData(items);
            // Observability Metrics extracted in a separate useEffect
        }
    };

    // Extract and Process Observability Metrics
    React.useEffect(() => {
        const metrics = new Map();
        let latestAsOf = 0;

        // First pass: find the latest asOf date to calculate offset if needed
        dataMeshRegistry.forEach(item => {
            if (item.kind === 'DataProductObservability' && item.observedAt) {
                const asOfTime = new Date(item.observedAt).getTime();
                if (asOfTime > latestAsOf) {
                    latestAsOf = asOfTime;
                }
            }
        });

        const timeOffset = (adjustMetricsTime && latestAsOf > 0 && isTestMode) ? (Date.now() - latestAsOf) : 0;

        const shiftTimeIso = (isoStr) => {
            if (!isoStr) return isoStr;
            return new Date(new Date(isoStr).getTime() + timeOffset).toISOString();
        }

        dataMeshRegistry.forEach(item => {
            if (item.kind === 'DataProductObservability') {
                if (timeOffset > 0) {
                    // Deep clone to avoid mutating original registry
                    const clonedItem = JSON.parse(JSON.stringify(item));
                    if (clonedItem.observedAt) clonedItem.observedAt = shiftTimeIso(clonedItem.observedAt);

                    if (clonedItem.results) {
                        clonedItem.results.forEach(res => {
                            if (res.name && res.name.includes('At') && res.measure && res.measure.value) {
                                res.measure.value = shiftTimeIso(res.measure.value);
                            }
                        });
                    }

                    metrics.set(clonedItem.id, clonedItem);
                } else {
                    metrics.set(item.id, item);
                }
            }
        });

        // Add simulated metrics for designated dimensions
        if (isTestMode && simulatedDims.size > 0) {
            const simulatedMetrics = ObsSim.simulateRegistryMetrics(dataMeshRegistry, Array.from(simulatedDims), config?.observability);
            simulatedMetrics.forEach(metric => {
                // Merge simulated data into existing metrics (replace completely)
                metrics.set(metric.id, metric);
            });
        }

        setMetricsMap(metrics);
    }, [dataMeshRegistry, adjustMetricsTime, isTestMode, simulatedDims]);

    const handleLoadRegistryText = (text) => {
        setIsLoading(true);
        setError(null);
        try {
            processRegistryText(text);
            setSelection({ id: null, kind: null });
            setRegistryUrl(''); // Clear URL if loading from clipboard
        } catch (err) {
            console.error("Error loading registry from text:", err);
            setError(err.message);
            setDataMeshOperationalData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Registry
    React.useEffect(() => {
        // Don't fetch if URL is not set yet (waiting for config to load)
        if (!registryUrl) {
            return;
        }

        const fetchRegistry = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const normalizedUrl = normalizePath(registryUrl);
                const response = await fetch(normalizedUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch registry from "${registryUrl}" (normalized to "${normalizedUrl}") (${response.status} ${response.statusText}). Please check the URL in config.yaml.`);
                }
                const text = await response.text();
                processRegistryText(text);
                setSelection({ id: null, kind: null });
            } catch (err) {
                console.error("Error loading registry:", err);
                setError(err.message);
                setDataMeshOperationalData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRegistry();
    }, [registryUrl]);

    // Available Domains
    const availableDomains = React.useMemo(() => {
        const dps = dataMeshRegistry.filter(item => item.kind === 'DataProduct' && item.domain);
        return Array.from(new Set(dps.map(n => n.domain))).sort();
    }, [dataMeshRegistry]);

    // Initial default: Select all domains if unselected? Or starts empty (showing all)?
    // Usually "no selection" = "show all". The DomainSelector has "All" button.
    // Let's assume if selectedDomains is empty, we show all (or the user can select specific).
    // Actually, multiselect usually implies "show what is selected".
    // If I select "Domain A", I only see Domain A.
    // Let's auto-select ALL domains on load so the view is populated.
    // Auto-select domains when registry loads/changes
    // If a domain is provided in the URL (e.g., ?domain=petstore), filter by that domain.
    React.useEffect(() => {
        if (availableDomains.length > 0) {
            const params = new URLSearchParams(window.location.search);
            let domainParam = params.get('domain');

            if (!domainParam) {
                // Fallback: Check if it's in the hash or pathname like /domain=Domain_03 or #domain=Domain_03
                const match = window.location.href.match(/[\/#?&]domain=([^&]+)/);
                if (match) {
                    domainParam = decodeURIComponent(match[1]);
                }
            }

            if (domainParam) {
                const urlDomains = domainParam.split(',').map(d => d.trim().toLowerCase());
                const matchingDomains = availableDomains.filter(d =>
                    urlDomains.includes(d.toLowerCase())
                );
                setSelectedDomains(matchingDomains);
                return;
            }
            if (config && config['single-domain-default-filter']) {
                setSelectedDomains([availableDomains[0]]);
            } else {
                setSelectedDomains(availableDomains);
            }
        }
    }, [availableDomains, config]);

    // Auto-select node if ID is provided in URL (?id=...)
    React.useEffect(() => {
        if (dataMeshRegistry.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const idParam = params.get('id');
            if (idParam) {
                const target = dataMeshRegistry.find(item =>
                    String(item.id).toLowerCase() === idParam.toLowerCase()
                );
                if (target) {
                    setSelection({
                        id: target.id,
                        kind: target.kind || (target.dataUsageAgreementSpecification ? 'DataUsageAgreement' : 'DataProduct')
                    });
                }
            }
        }
    }, [dataMeshRegistry]);

    // Auto-compact mode logic
    const prevRegistryRef = React.useRef(null);
    React.useEffect(() => {
        if (dataMeshRegistry && dataMeshRegistry.length > 0 && dataMeshRegistry !== prevRegistryRef.current) {
            prevRegistryRef.current = dataMeshRegistry;
            const dataMeshNodes = dataMeshRegistry.filter(item => item.kind === 'DataProduct');
            const columnCounts = {};
            dataMeshNodes.forEach(node => {
                const tier = node.customProperties?.find(p => p.property === 'dataProductTier')?.value;
                const tierConfig = config.tiers?.[tier] || {};
                const colNum = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;
                columnCounts[colNum] = (columnCounts[colNum] || 0) + 1;
            });
            const maxNodes = Math.max(0, ...Object.values(columnCounts));
            if (maxNodes > 10) {
                setCompactMode(true);
            } else {
                setCompactMode(false);
            }
        }
    }, [dataMeshRegistry, config]);

    // Process Registry into Nodes/Edges
    React.useEffect(() => {
        if (!dataMeshRegistry || dataMeshRegistry.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const dataMeshNodes = dataMeshRegistry.filter(item => item.kind === 'DataProduct' || item.kind === 'DataContract');
        const dataMeshEdges = dataMeshRegistry.filter(item => item.dataUsageAgreementSpecification);

        // Domain Coloring Logic
        const uniqueDomains = Array.from(new Set(dataMeshNodes
            .filter(n => n.kind === 'DataProduct' && n.domain)
            .map(n => n.domain)))
            .sort();

        const domainColorMap = {};
        if (uniqueDomains.length > 0) {
            uniqueDomains.forEach((domain, index) => {
                domainColorMap[domain] = `var(--domain-palette-${String((index % 12) + 1).padStart(2, '0')})`;
            });
        }

        // Reset counters for layout - track Y position by columnNumber instead of tier
        // This ensures that if multiple tiers share the same columnNumber, they don't overlap
        const columnY = {};
        Object.keys(config.tiers || {}).forEach(tierKey => {
            const tierConfig = config.tiers[tierKey];
            const colNum = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;
            if (columnY[colNum] === undefined) {
                columnY[colNum] = compactMode ? 80 : 0;
            }
        });

        const initialNodes = dataMeshNodes
            .filter(node => node.kind === 'DataProduct')
            .filter(node => {
                if (observeMode && hideHealthy) {
                    const healthStatus = deriveStatus(node.id, activeDimension);
                    return healthStatus !== 'healthy' && healthStatus !== 'unknown';
                }
                return true;
            })
            .map(node => {
                const tier = node.customProperties?.find(p => p.property === 'dataProductTier')?.value;
                const technology = node.customProperties?.find(p => p.property === 'technology')?.value;
                const businessName = node.customProperties?.find(p => p.property === 'dataProductBusinessName')?.value;

                // Get tier config
                const tierConfig = config.tiers?.[tier] || {};
                const safeTier = tier || 'default';
                const color = tierConfig.color || `var(--tier-${safeTier}-color, #bfdbfe)`;
                const banner = tierConfig.label || 'DATA PRODUCT';
                const bannerColor = tierConfig.bannerColor || `var(--tier-${safeTier}-banner, #93c5fd)`;

                // Background Color Logic (Domain based)
                const backgroundColor = domainColorMap[node.domain] || color;

                // Auto-layout Logic - Calculate X position from columnNumber
                // Use 450px spacing between columns to prevent overlap
                // columnNumber starts at 1, so subtract 1 for 0-based positioning
                const COLUMN_SPACING = 450;
                const NODE_WIDTH = 320; // Consistent width for all nodes
                const NODE_HEIGHT = compactMode ? 40 : 120; // Fixed height for consistency
                const VERTICAL_GAP = compactMode ? (NODE_HEIGHT / 2) : 40; // Space between nodes
                const VERTICAL_STEP = NODE_HEIGHT + VERTICAL_GAP;

                const columnNumber = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;
                const x = (columnNumber - 1) * COLUMN_SPACING;

                // Track Y position by columnNumber, not by tier
                // This allows multiple tiers in the same column to stack vertically
                const y = columnY[columnNumber] !== undefined ? columnY[columnNumber] : 0;

                if (columnY[columnNumber] !== undefined) {
                    columnY[columnNumber] += VERTICAL_STEP;
                }

                // Observability Data
                const healthStatus = observeMode ? deriveStatus(node.id, activeDimension || 'Any') : null;
                const metrics = metricsMap.get(node.id);
                let pips = null;
                if (observeMode && availableDimensions) {
                    pips = {};
                    availableDimensions.forEach(dim => {
                        if (dim !== 'Any') {
                            pips[dim] = deriveStatus(node.id, dim);
                        }
                    });
                }

                return {
                    id: node.id,
                    type: 'selectorNode',
                    data: {
                        id: node.id,
                        color: color,
                        label: businessName || node.name,
                        banner: banner,
                        bannerColor: bannerColor,
                        backgroundColor: backgroundColor,
                        subtitle: (showDomainLabels || !compactMode) ? (config?.domainNameCustomisation?.[node.domain] || node.domain) : null,
                        description: (compactMode || showDescriptionsExpanded) ? (node.description?.purpose || (typeof node.description === 'string' ? node.description : '')) : null,
                        icon: normalizePath(config.iconMap[technology] || (node.kind === 'DataContract' ? config.iconMap['table'] : config.iconMap['dataproduct'])),
                        hasOutputPorts: node.outputPorts && node.outputPorts.length > 0,
                        outputPortCount: node.outputPorts ? node.outputPorts.length : 0,
                        originalData: node, // Pass full source data for YAML view
                        // Observability props
                        observeMode,
                        compactMode,
                        activeDimension,
                        healthStatus,
                        pips,
                        isSelected: drillNodeId === node.id,
                        availableDimensions,
                        metrics
                    },
                    position: { x, y }
                };
            });

        const activeNodeIds = new Set(initialNodes.map(n => n.id));
        
        // Find full upstream and downstream chains for hover highlighting
        const connectedEdgeIds = new Set();
        if (hoveredNodeId) {
            const adjUp = {};
            const adjDown = {};
            dataMeshEdges.forEach(e => {
                const p = e.provider.dataProductId;
                const c = e.consumer.dataProductId;
                if (!adjDown[p]) adjDown[p] = [];
                adjDown[p].push({ eId: e.id, t: c });
                if (!adjUp[c]) adjUp[c] = [];
                adjUp[c].push({ eId: e.id, t: p });
            });
            
            const visitedUp = new Set();
            let queue = [hoveredNodeId];
            visitedUp.add(hoveredNodeId);
            while(queue.length) {
                const curr = queue.shift();
                (adjUp[curr] || []).forEach(({eId, t}) => {
                    connectedEdgeIds.add(eId);
                    if (!visitedUp.has(t)) { visitedUp.add(t); queue.push(t); }
                });
            }
            
            const visitedDown = new Set();
            queue = [hoveredNodeId];
            visitedDown.add(hoveredNodeId);
            while(queue.length) {
                const curr = queue.shift();
                (adjDown[curr] || []).forEach(({eId, t}) => {
                    connectedEdgeIds.add(eId);
                    if (!visitedDown.has(t)) { visitedDown.add(t); queue.push(t); }
                });
            }
        }

        const initialEdges = dataMeshEdges
            .filter(edge => activeNodeIds.has(edge.provider.dataProductId) && activeNodeIds.has(edge.consumer.dataProductId))
            .map(edge => {
                const sourceHealth = deriveStatus(edge.provider.dataProductId, activeDimension);
                const targetHealth = deriveStatus(edge.consumer.dataProductId, activeDimension);

                const getEdgeColor = (h1, h2) => {
                    if (!observeMode) return 'var(--connector-default, #9ca3af)';
                    if (h1 === 'critical' || h2 === 'critical') return '#EF444488';
                    if (h1 === 'degraded' || h2 === 'degraded') return '#F59E0B88';
                    if (h1 === 'healthy' && h2 === 'healthy') return '#22C55E88';
                    return '#9ca3af66';
                };

                const edgeColor = getEdgeColor(sourceHealth, targetHealth);
                const isEdgeInChain = hoveredNodeId ? connectedEdgeIds.has(edge.id) : false;
                const isFaint = hoveredNodeId && !isEdgeInChain;

                let strokeColor;
                let markerEndProps;
                
                if (isEdgeInChain) {
                    strokeColor = 'var(--connector-hovered-node, #22c55e)';
                    markerEndProps = 'custom-arrow-hovered-node';
                } else if (hoveredEdgeId === edge.id) {
                    strokeColor = observeMode ? edgeColor : 'var(--connector-hovered-edge, #2563eb)';
                    markerEndProps = observeMode ? { type: 'arrowclosed', color: edgeColor } : 'custom-arrow-hovered-edge';
                } else if (isFaint) {
                    strokeColor = 'var(--connector-faint, #ffffff)';
                    markerEndProps = 'custom-arrow-faint';
                } else {
                    strokeColor = observeMode ? edgeColor : 'var(--connector-default, #9ca3af)';
                    markerEndProps = observeMode ? { type: 'arrowclosed', color: edgeColor } : 'custom-arrow-default';
                }

                return {
                    id: edge.id,
                    source: edge.provider.dataProductId,
                    target: edge.consumer.dataProductId,
                    animated: observeMode || true,
                    type: 'default',
                    markerEnd: markerEndProps,
                    interactionWidth: 40,
                    style: {
                        strokeWidth: (hoveredEdgeId === edge.id || isEdgeInChain) ? 3 : 2,
                        stroke: strokeColor,
                        zIndex: (hoveredEdgeId === edge.id || isEdgeInChain) ? 10 : 0,
                        opacity: isFaint ? 0.15 : 1,
                        transition: 'stroke 0.3s ease, opacity 0.3s ease'
                    }
                };
            });

        // Header Nodes Logic for Compact Mode
        const headerNodes = [];
        if (compactMode) {
            const activeTiers = new Map();
            dataMeshNodes
                .filter(node => node.kind === 'DataProduct')
                .forEach(node => {
                    const tier = node.customProperties?.find(p => p.property === 'dataProductTier')?.value;
                    const tierConfig = config.tiers?.[tier] || {};
                    const colNum = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;
                    if (!activeTiers.has(colNum)) {
                        activeTiers.set(colNum, tier || 'Unknown Tier');
                    }
                });

            const COLUMN_SPACING = 450;
            activeTiers.forEach((tierId, colNum) => {
                const x = (colNum - 1) * COLUMN_SPACING;
                
                // Human readable: e.g. consumerAligned -> Consumer Aligned
                const formattedTier = tierId
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();

                headerNodes.push({
                    id: `header-col-${colNum}`,
                    type: 'headerNode',
                    position: { x: x, y: 0 }, // Align perfectly with column X coordinate
                    data: { label: formattedTier },
                    width: 250,
                    height: 60,
                    selectable: false,
                    draggable: false
                });
            });
        }

        setNodes([...initialNodes, ...headerNodes]);
        setEdges(initialEdges);

    }, [dataMeshRegistry, setNodes, setEdges, observeMode, compactMode, activeDimension, metricsMap, drillNodeId, config, hideHealthy, showDomainLabels, showDescriptionsExpanded]);

    // Handle hover states separately to avoid recreating nodes
    React.useEffect(() => {
        setNodes(nodes => nodes.map(node => ({
            ...node,
            zIndex: node.id === hoveredNodeId ? 1000 : 0
        })));
        setEdges(edges => {
            // Find full upstream and downstream chains for hover highlighting
            const connectedEdgeIds = new Set();
            if (hoveredNodeId) {
                const adjUp = {};
                const adjDown = {};
                edges.forEach(e => {
                    const p = e.source;
                    const c = e.target;
                    if (!adjDown[p]) adjDown[p] = [];
                    adjDown[p].push({ eId: e.id, t: c });
                    if (!adjUp[c]) adjUp[c] = [];
                    adjUp[c].push({ eId: e.id, t: p });
                });
                
                const visitedUp = new Set();
                let queue = [hoveredNodeId];
                visitedUp.add(hoveredNodeId);
                while(queue.length) {
                    const curr = queue.shift();
                    (adjUp[curr] || []).forEach(({eId, t}) => {
                        connectedEdgeIds.add(eId);
                        if (!visitedUp.has(t)) { visitedUp.add(t); queue.push(t); }
                    });
                }
                
                const visitedDown = new Set();
                queue = [hoveredNodeId];
                visitedDown.add(hoveredNodeId);
                while(queue.length) {
                    const curr = queue.shift();
                    (adjDown[curr] || []).forEach(({eId, t}) => {
                        connectedEdgeIds.add(eId);
                        if (!visitedDown.has(t)) { visitedDown.add(t); queue.push(t); }
                    });
                }
            }

            return edges.map(edge => {
                const sourceHealth = deriveStatus(edge.source, activeDimension);
                const targetHealth = deriveStatus(edge.target, activeDimension);

                const getEdgeColor = (h1, h2) => {
                    if (!observeMode) return 'var(--connector-default, #9ca3af)';
                    if (h1 === 'critical' || h2 === 'critical') return '#EF444488';
                    if (h1 === 'degraded' || h2 === 'degraded') return '#F59E0B88';
                    if (h1 === 'healthy' && h2 === 'healthy') return '#22C55E88';
                    return '#9ca3af66';
                };

                const edgeColor = getEdgeColor(sourceHealth, targetHealth);
                const isEdgeInChain = hoveredNodeId ? connectedEdgeIds.has(edge.id) : false;
                const isFaint = hoveredNodeId && !isEdgeInChain;

            let strokeColor;
            let markerEndProps;
            
            if (isEdgeInChain) {
                strokeColor = 'var(--connector-hovered-node, #22c55e)';
                markerEndProps = 'custom-arrow-hovered-node';
            } else if (hoveredEdgeId === edge.id) {
                strokeColor = observeMode ? edgeColor : 'var(--connector-hovered-edge, #2563eb)';
                markerEndProps = observeMode ? { type: 'arrowclosed', color: edgeColor } : 'custom-arrow-hovered-edge';
            } else if (isFaint) {
                strokeColor = 'var(--connector-faint, #ffffff)';
                markerEndProps = 'custom-arrow-faint';
            } else {
                strokeColor = edgeColor;
                markerEndProps = { type: 'arrowclosed', color: edgeColor };
            }

            return {
                ...edge,
                style: { ...edge.style, stroke: strokeColor, strokeWidth: isEdgeInChain ? 2 : 1 },
                markerEnd: markerEndProps
            };
        });
    });
}, [hoveredNodeId, hoveredEdgeId, observeMode, activeDimension, setEdges, setNodes, deriveStatus]);


    // Validation Logic
    const [validationResults, setValidationResults] = React.useState(null);
    const [showValidationModal, setShowValidationModal] = React.useState(false);

    // Automatic validation when registry is loaded or changed
    React.useEffect(() => {
        if (!isLoading && dataMeshRegistry && dataMeshRegistry.length > 0) {
            const errors = validateRegistry(dataMeshRegistry, dataMeshRegistryRaw);
            setValidationResults(errors);
        } else if (!isLoading && (!dataMeshRegistry || dataMeshRegistry.length === 0)) {
            setValidationResults(null);
        }
    }, [dataMeshRegistry, dataMeshRegistryRaw, isLoading]);

    const handleValidateRegistry = () => {
        setShowValidationModal(true);
    };

    // Helper to find nodes in the raw registry
    const dataMeshNodes = React.useMemo(() =>
        dataMeshRegistry.filter(item => item.kind === 'DataProduct' || item.kind === 'DataContract'),
        [dataMeshRegistry]);

    // Filter nodes and edges based on selection
    const contractViewNodes = React.useMemo(() => {
        if (!selection.id || selection.kind !== 'DataContract') {
            return null;
        }

        // Helper to find nodes in the raw registry
        const contractData = dataMeshNodes.find(n => String(n.id) === String(selection.id) && n.kind === 'DataContract');

        if (contractData) {
            const tech = contractData.customProperties?.find(p => p.property === 'technology')?.value;

            // Create nodes for schema elements
            if (contractData.schema && Array.isArray(contractData.schema)) {
                // 1. Dependency-aware sorting
                // Tables with outbound FKs (sources) should be on the left
                const adj = {};
                const inDegree = {};
                contractData.schema.forEach(s => {
                    adj[s.name] = new Set();
                    inDegree[s.name] = 0;
                });

                contractData.schema.forEach(s => {
                    const findTargets = (rels) => {
                        if (!rels) return;
                        rels.forEach(rel => {
                            if (rel.type === 'foreignKey' && rel.to) {
                                (Array.isArray(rel.to) ? rel.to : [rel.to]).forEach(target => {
                                    const targetTable = target.split('.')[0];
                                    if (adj[targetTable] && targetTable !== s.name) {
                                        // Dependency: current table 's' depends on 'targetTable'
                                        // We want 'targetTable' on the left, so targetTable -> s
                                        if (!adj[targetTable].has(s.name)) {
                                            adj[targetTable].add(s.name);
                                            inDegree[s.name]++;
                                        }
                                    }
                                });
                            }
                        });
                    };
                    findTargets(s.relationships);
                    const props = s.properties || s.columns || [];
                    props.forEach(p => findTargets(p.relationships));
                });

                // Topological sort using Kahn's algorithm
                const sortedSchema = [];
                const queue = contractData.schema.filter(s => inDegree[s.name] === 0).map(s => s.name);

                // Sort queue to maintain some stability
                queue.sort();

                while (queue.length > 0) {
                    const currentName = queue.shift();
                    const fullTable = contractData.schema.find(table => table.name === currentName);
                    if (fullTable) sortedSchema.push(fullTable);

                    const neighbors = Array.from(adj[currentName] || []);
                    neighbors.sort().forEach(neighbor => {
                        inDegree[neighbor]--;
                        if (inDegree[neighbor] === 0) {
                            queue.push(neighbor);
                        }
                    });
                }

                // Add any remaining tables (cycles or disconnected)
                contractData.schema.forEach(s => {
                    if (!sortedSchema.find(item => item.name === s.name)) {
                        sortedSchema.push(s);
                    }
                });

                // 2. Grid Layout logic with compact spacing (4 grid points = 80px)
                let maxW = 260;
                let maxH = 200;

                sortedSchema.forEach(s => {
                    const cols = s.properties || s.columns || [];
                    const nameLen = cols.reduce((max, c) => Math.max(max, (c.physicalName || c.name || "").length), 0);
                    const typeLen = cols.reduce((max, c) => Math.max(max, (c.logicalType || "").length), 0);
                    const w = Math.min(600, Math.max(260, (nameLen + typeLen) * 8 + 80));
                    const h = 110 + (cols.length * 40);
                    if (w > maxW) maxW = w;
                    if (h > maxH) maxH = h;
                });

                const GRID_GAP = 100; // 5 grid points of 20px each as requested
                const HORIZONTAL_GAP = maxW + GRID_GAP;
                const VERTICAL_GAP = maxH + GRID_GAP;

                const total = sortedSchema.length;
                let cols = 1;
                if (total === 2) {
                    cols = 2;
                } else if (total > 2) {
                    cols = Math.ceil(Math.sqrt(total));
                }

                return sortedSchema.map((schemaElement, index) => {
                    const row = Math.floor(index / cols);
                    const col = index % cols;
                    const tableTech = schemaElement.customProperties?.find(p => p.property === 'technology')?.value;

                    return {
                        id: `${contractData.id}-schema-${index}`,
                        type: 'dataContractNode',
                        position: { x: col * HORIZONTAL_GAP, y: row * VERTICAL_GAP },
                        data: {
                            ...contractData, // Spread contract properties
                            schema: [schemaElement], // Pass only this schema element
                            description: schemaElement.description || "",
                            originalData: contractData, // Store full contract for side panel
                            label: schemaElement.physicalName || schemaElement.name || `Schema ${index + 1}`,
                            banner: 'DATA CONTRACT',
                            bannerColor: '#e5e7eb',
                            icon: normalizePath(config.iconMap[tableTech] || config.iconMap['table'] || config.iconMap[tech] || config.iconMap['dataProduct']),
                            // Add a stable ID for handles to reference
                            tableName: schemaElement.name,
                            rowIndices: { row, col, totalCols: cols },
                            verticalGap: GRID_GAP,
                            verticalGapCenter: (row * VERTICAL_GAP) + maxH + (GRID_GAP / 2)
                        }
                    };
                });
            }

            // Fallback: if no schema
            const firstSchemaTech = contractData.schema?.[0]?.customProperties?.find(p => p.property === 'technology')?.value;
            const centralNode = {
                id: contractData.id,
                type: 'dataContractNode',
                position: { x: 0, y: 0 },
                data: {
                    ...contractData,
                    description: contractData.schema?.[0]?.description || "",
                    originalData: contractData,
                    label: contractData.physicalName || contractData.name || String(selection.id),
                    banner: 'DATA CONTRACT',
                    bannerColor: '#e5e7eb',
                    icon: normalizePath(config.iconMap[firstSchemaTech] || config.iconMap['table'] || config.iconMap[tech] || config.iconMap['dataProduct']),
                }
            };
            return [centralNode];
        }
        return null;
    }, [selection, dataMeshNodes, config]);

    // Create edges for foreign key relationships in contract view
    const contractViewEdges = React.useMemo(() => {
        if (!contractViewNodes) return [];

        const edges = [];

        contractViewNodes.forEach((sourceNode) => {
            const schemaElement = sourceNode.data.schema[0];
            const sourceNodeId = sourceNode.id;

            // Parse table-level relationships
            if (schemaElement.relationships && Array.isArray(schemaElement.relationships)) {
                schemaElement.relationships.forEach((rel, relIndex) => {
                    if (rel.type === 'foreignKey' && rel.from && rel.to) {
                        rel.from.forEach((fromCol, idx) => {
                            const toCol = rel.to[idx];
                            if (fromCol && toCol) {
                                const fromColName = fromCol.includes('.') ? fromCol.split('.')[1] : fromCol;
                                const toTable = toCol.split('.')[0];
                                const toColName = toCol.split('.')[1];

                                // Find target node in contractViewNodes by tableName
                                const targetNode = contractViewNodes.find(n => n.data.tableName === toTable);

                                if (targetNode) {
                                    const sourceCol = schemaElement.properties?.find(p => p.name === fromColName);
                                    const targetSchema = targetNode.data.schema[0];
                                    const targetCol = targetSchema.properties?.find(p => p.name === toColName);

                                    const sourceHandle = `${sourceCol?.physicalName || fromColName}-source`;
                                    const targetHandle = `${targetCol?.physicalName || toColName}-target`;

                                    edges.push({
                                        id: `table-rel-${sourceNodeId}-${relIndex}-${idx}`,
                                        source: sourceNodeId,
                                        target: targetNode.id,
                                        sourceHandle,
                                        targetHandle,
                                        type: 'relationshipEdge',
                                        animated: false,
                                        style: { stroke: '#a855f7', strokeWidth: 1.5 },
                                        interactionWidth: 40,
                                        data: {
                                            isHovered: hoveredEdgeId === `table-rel-${sourceNodeId}-${relIndex}-${idx}`,
                                            description: `The '${sourceNode.data.tableName}' table links to '${toTable}' using the '${fromColName}' composite field.`,
                                            gapCenterY: sourceNode.data.verticalGapCenter,
                                            isSameRow: sourceNode.data.rowIndices.row === targetNode.data.rowIndices.row
                                        },
                                        markerEnd: { type: 'arrowclosed', color: '#a855f7', width: 12, height: 12 }
                                    });
                                }
                            }
                        });
                    }
                });
            }

            // Parse column-level relationships
            const properties = schemaElement.properties || schemaElement.columns || [];
            properties.forEach((col) => {
                if (col.relationships && Array.isArray(col.relationships)) {
                    col.relationships.forEach((rel, relIndex) => {
                        if (rel.type === 'foreignKey' && rel.to) {
                            const sourceColName = col.name;
                            const targetTable = rel.to.split('.')[0];
                            const targetColName = rel.to.split('.')[1];

                            // Find target node in contractViewNodes by tableName
                            const targetNode = contractViewNodes.find(n => n.data.tableName === targetTable);

                            if (targetNode) {
                                const targetSchema = targetNode.data.schema[0];
                                const targetCol = targetSchema.properties?.find(p => p.name === targetColName);

                                const sourceHandle = `${col.physicalName || col.name}-source`;
                                const targetHandle = `${targetCol?.physicalName || targetColName}-target`;

                                edges.push({
                                    id: `col-rel-${sourceNodeId}-${sourceColName}-${relIndex}`,
                                    source: sourceNodeId,
                                    target: targetNode.id,
                                    sourceHandle,
                                    targetHandle,
                                    type: 'relationshipEdge',
                                    animated: false,
                                    style: { stroke: '#3b82f6', strokeWidth: 1.5 },
                                    interactionWidth: 40,
                                    data: {
                                        isHovered: hoveredEdgeId === `col-rel-${sourceNodeId}-${sourceColName}-${relIndex}`,
                                        description: `The '${sourceNode.data.tableName}' table links to '${targetTable}' using the '${sourceColName}' field.`,
                                        gapCenterY: sourceNode.data.verticalGapCenter,
                                        isSameRow: sourceNode.data.rowIndices.row === targetNode.data.rowIndices.row
                                    },
                                    markerEnd: { type: 'arrowclosed', color: '#3b82f6', width: 12, height: 12 }
                                });
                            }
                        }
                    });
                }
            });
        });

        // Track-based routing for overlap avoidance
        return edges.map((edge, index) => {
            const sourceNode = contractViewNodes.find(n => n.id === edge.source);
            const targetNode = contractViewNodes.find(n => n.id === edge.target);

            // Map each edge to a unique grid lane (grid is 20px, gap is 100px)
            const laneIdx = index % 5;
            const gapOffset = (laneIdx - 2) * 20; // -40, -20, 0, 20, 40 from gap center
            const stepOffset = 30 + (laneIdx * 15); // Staggered offsets for horizontal/vertical turns

            // Detection: if it spans more than one column distance, it's long distance
            const isLongDistance = Math.abs(sourceNode.data.rowIndices.col - targetNode.data.rowIndices.col) > 1;

            return {
                ...edge,
                data: {
                    ...edge.data,
                    gapOffset,
                    stepOffset,
                    laneIdx,
                    isLongDistance
                }
            };
        });
    }, [contractViewNodes, selection.kind, hoveredEdgeId]);

    const lineageViewNodes = React.useMemo(() => {
        if (!selection.id || selection.kind !== 'DataProduct') return null;

        const selectedNode = nodes.find(n => String(n.id) === String(selection.id));
        if (!selectedNode) return null;

        const centralNode = {
            ...selectedNode,
            type: 'lineageNode',
            position: { x: 0, y: 0 },
            data: {
                ...selectedNode.data,
                // Add outputPorts from original dataMeshNodes if available, enriched with icon
                outputPorts: dataMeshNodes.find(n => String(n.id) === String(selection.id) && n.kind === 'DataProduct')?.outputPorts?.map(port => {
                    let portIcon = null;
                    if (port.contractId) {
                        const contract = dataMeshNodes.find(c => c.id === port.contractId && c.kind === 'DataContract');
                        if (contract && contract.schema) {
                            // Find matching table/item in schema
                            const table = contract.schema.find(t => t.name === port.name);
                            if (table && table.customProperties) {
                                const techProp = table.customProperties.find(p => p.property === 'technology');
                                if (techProp) {
                                    const tech = techProp.value;
                                    portIcon = normalizePath(config.iconMap[tech]);
                                }
                            }

                            // Fallback to contract level tech if table tech not found (optional but helpful)
                            if (!portIcon && contract.customProperties) {
                                const techProp = contract.customProperties.find(p => p.property === 'technology');
                                if (techProp) {
                                    const tech = techProp.value;
                                    portIcon = normalizePath(config.iconMap[tech]);
                                }
                            }
                        }
                    }
                    // Final fallback to table icon then the Data Product's own icon
                    return { ...port, icon: portIcon || normalizePath(config.iconMap['table']) || selectedNode.data.icon };
                })
            }
        };

        const relatedNodes = [centralNode];
        // Re-construct edges from registry to traverse
        const dataMeshEdges = dataMeshRegistry.filter(item => item.dataUsageAgreementSpecification).map(edge => ({
            id: edge.id,
            source: edge.provider.dataProductId,
            target: edge.consumer.dataProductId
        }));

        const verticalStep = compactMode ? 60 : 150;

        // Upstream Nodes (Producers)
        const upstreamEdges = dataMeshEdges.filter(e => String(e.target) === String(selection.id));
        upstreamEdges.forEach((edge, index) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            if (sourceNode) {
                relatedNodes.push({
                    ...sourceNode,
                    position: { x: -450, y: index * verticalStep } // Stack upstream on left - Using 450 to match COLUMN_SPACING
                });
            }
        });

        // Downstream Nodes (Consumers)
        const downstreamEdges = dataMeshEdges.filter(e => String(e.source) === String(selection.id));
        downstreamEdges.forEach((edge, index) => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode) {
                relatedNodes.push({
                    ...targetNode,
                    position: { x: 450, y: index * verticalStep } // Stack downstream on right
                });
            }
        });

        return relatedNodes;
    }, [selection, nodes, dataMeshNodes, dataMeshRegistry, compactMode]);

    // Mesh filtering visibility logic
    const meshFilterNodes = React.useMemo(() => {
        // If we have a selected node, we don't use this logic (we show Drill Down view)
        if (selection.id) return null;

        // 1. Identify "Primary Matches" based on filters
        const primaryMatches = nodes.filter(node => {
            const matchesDomain = selectedDomains.length === 0 || selectedDomains.includes(node.data?.originalData?.domain); // Use originalData to avoid ReactFlow stripping custom top-level props
            let matchesSearch = globalFilterText === '';
            if (!matchesSearch) {
                const searchText = globalFilterText.toLowerCase();
                const matchesLabel = node.data.label.toLowerCase().includes(searchText) || String(node.id).toLowerCase().includes(searchText);
                
                let matchesCustomProps = false;
                const customProps = node.data?.originalData?.customProperties || [];
                matchesCustomProps = customProps.some(prop => String(prop.value).toLowerCase().includes(searchText));
                
                let matchesContractProps = false;
                const outputPorts = node.data?.originalData?.outputPorts || [];
                
                let matchesRoles = false;
                const nodeRoles = node.data?.originalData?.roles || [];
                matchesRoles = nodeRoles.some(r => String(r.role).toLowerCase().includes(searchText) || String(r.access).toLowerCase().includes(searchText));

                for (const port of outputPorts) {
                    if (port.contractId) {
                        const contract = dataMeshRegistry.find(item => String(item.id) === String(port.contractId) && item.kind === 'DataContract');
                        if (contract) {
                            if (contract.customProperties && contract.customProperties.some(prop => String(prop.value).toLowerCase().includes(searchText))) {
                                matchesContractProps = true;
                                break;
                            }
                            if (contract.roles && contract.roles.some(r => String(r.role).toLowerCase().includes(searchText) || String(r.access).toLowerCase().includes(searchText))) {
                                matchesContractProps = true;
                                break;
                            }
                        }
                    }
                }
                
                matchesSearch = matchesLabel || matchesCustomProps || matchesRoles || matchesContractProps;
            }

            return matchesDomain && matchesSearch;
        });

        if (primaryMatches.length === 0 && (selectedDomains.length > 0 || globalFilterText !== '')) {
            return []; // No matches
        }
        if (selectedDomains.length === 0 && globalFilterText === '') {
            return nodes; // No filters, show all (original positions)
        }

        // 2. Identify Neighbors (Producers and Consumers) of Primary Matches
        // We need the edges to find neighbors
        const allEdges = dataMeshRegistry.filter(item => item.dataUsageAgreementSpecification).map(edge => ({
            source: edge.provider.dataProductId,
            target: edge.consumer.dataProductId
        }));

        const primaryIds = new Set(primaryMatches.map(n => n.id));
        const neighborIds = new Set();

        allEdges.forEach(edge => {
            if (primaryIds.has(edge.source)) {
                neighborIds.add(edge.target); // Consumer is neighbor
            }
            if (primaryIds.has(edge.target)) {
                neighborIds.add(edge.source); // Provider is neighbor
            }
        });

        // 3. Union of Primary + Neighbors
        const finalIds = new Set([...primaryIds, ...neighborIds]);
        const filteredNodes = nodes.filter(n => finalIds.has(n.id) && n.type !== 'headerNode');

        // 4. Dynamic Relayout for Filtered View
        // Sort nodes by tier (columnNumber) then by domain then by label to ensure consistent vertical order
        const sortedNodes = [...filteredNodes].sort((a, b) => {
            const tierA = a.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const tierB = b.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const colA = config.tiers?.[tierA]?.columnNumber || 1;
            const colB = config.tiers?.[tierB]?.columnNumber || 1;
            if (colA !== colB) return colA - colB;

            // Secondary sort by domain
            const subA = a.data?.subtitle || '';
            const subB = b.data?.subtitle || '';
            if (subA !== subB) {
                return subA.localeCompare(subB);
            }

            // Tertiary sort by label
            const labelA = a.data?.label || '';
            const labelB = b.data?.label || '';
            return labelA.localeCompare(labelB);
        });

        const columnY = {};
        const COLUMN_SPACING = 450;
        const NODE_HEIGHT = compactMode ? 40 : 120;
        const VERTICAL_GAP = compactMode ? (NODE_HEIGHT / 2) : 40;
        const VERTICAL_STEP = NODE_HEIGHT + VERTICAL_GAP;
        const activeTiers = new Map();

        const layoutedNodes = sortedNodes.map(node => {
            const tier = node.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const tierConfig = config.tiers?.[tier] || {};
            const columnNumber = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;

            if (compactMode && !activeTiers.has(columnNumber)) {
                activeTiers.set(columnNumber, tier || 'Unknown Tier');
            }

            const x = (columnNumber - 1) * COLUMN_SPACING;
            const y = columnY[columnNumber] || (compactMode ? 80 : 0);
            columnY[columnNumber] = y + VERTICAL_STEP;

            return {
                ...node,
                position: { x, y }
            };
        });

        if (compactMode) {
            activeTiers.forEach((tierId, colNum) => {
                const x = (colNum - 1) * COLUMN_SPACING;
                const formattedTier = tierId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                layoutedNodes.push({
                    id: `header-col-${colNum}`,
                    type: 'headerNode',
                    position: { x: x, y: 0 }, // Align perfectly with column X coordinate
                    data: { label: formattedTier },
                    width: 250,
                    height: 60,
                    selectable: false,
                    draggable: false
                });
            });
        }

        return layoutedNodes;

    }, [selection, nodes, dataMeshNodes, dataMeshRegistry, selectedDomains, globalFilterText, compactMode, config.tiers]);


    const visibleNodes = contractViewNodes || lineageViewNodes || meshFilterNodes || nodes;
    
    // Side Panel Resizing
    const startResizing = React.useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback((mouseMoveEvent) => {
        if (isResizing) {
            const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
            if (newWidth > 300 && newWidth < 1200) { // Min and Max width constraints
                setSidePanelWidth(newWidth);
            }
        }
    }, [isResizing]);

    React.useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // Event Listeners
    React.useEffect(() => {
        const handleOpenSidePanel = (e) => {
            setSidePanelContent(e.detail.content);
            setSidePanelNodeId(e.detail.id || null);
            const type = e.detail.type || 'yaml';
            setSidePanelType(type);
            setSidePanelFilter(''); // Reset filter when opening new content

            if (type === 'examples' || type === 'observability') {
                // For examples and observability, default to auto/fit-content
                setSidePanelWidth('auto');
            } else if (e.detail.width && e.detail.width !== 'auto') {
                // Allow up to 1400px or 90% of screen width if I could, but simple max:
                setSidePanelWidth(Math.min(1400, Math.max(300, e.detail.width)));
            } else if (['yaml', 'data-product-yaml', 'agreement-yaml', 'data-contract-yaml'].includes(type)) {
                setSidePanelWidth(Math.floor(window.innerWidth / 2));
            }

            // Set default tab based on type
            if (type === 'observability') {
                setSidePanelTab('metrics');
            } else if (['data-product-yaml', 'data-contract-yaml', 'agreement-yaml'].includes(type)) {
                setSidePanelTab('visual');
            } else {
                setSidePanelTab('yaml');
            }


            // Handle anchoring for Data Contract tables
            if (e.detail.activeTable) {
                setSidePanelTab('visual');
                setSidePanelAnchor(e.detail.activeTable);
            } else {
                setSidePanelAnchor(null);
            }
        };
        const handleNavigateToNode = (e) => {
            const { id, kind } = e.detail;
            setSelection({ id, kind });
        };

        window.addEventListener('open-side-panel', handleOpenSidePanel);
        window.addEventListener('navigate-to-node', handleNavigateToNode);
        return () => {
            window.removeEventListener('open-side-panel', handleOpenSidePanel);
            window.removeEventListener('navigate-to-node', handleNavigateToNode);
        };
    }, []);

    // Fit view on load/change
    React.useEffect(() => {
        if (rfInstance && !isLoading && visibleNodes.length > 0) {
            window.requestAnimationFrame(() => {
                console.log("FIT_VIEW_LOGIC running. Config value:", config?.['zoom-to-fit-columns']);
                if (config && config['zoom-to-fit-columns'] !== false) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity;
                    visibleNodes.forEach(n => {
                        if (n.position && typeof n.position.x === 'number') {
                            if (n.position.x < minX) minX = n.position.x;
                            if (n.position.x > maxX) maxX = n.position.x;
                            if (n.position.y < minY) minY = n.position.y;
                        }
                    });
                    
                    if (minX === Infinity) {
                        rfInstance.fitView({ duration: 800, padding: 0.2 });
                        return;
                    }

                    const nodeWidth = 350; // Approximate width of a node
                    const graphWidth = (maxX - minX) + nodeWidth;
                    
                    // We want the graph width to take up 90% of the screen width
                    const screenWidth = window.innerWidth;
                    let targetZoom = (screenWidth * 0.90) / graphWidth;
                    
                    // Clamp zoom between 0.1 and 1.5
                    if (targetZoom < 0.1) targetZoom = 0.1;
                    if (targetZoom > 1.5) targetZoom = 1.5;
                    
                    // Center the graph horizontally
                    const xOffset = (screenWidth - (graphWidth * targetZoom)) / 2;
                    const viewX = xOffset - (minX * targetZoom);
                    
                    // Position minY near the top of the canvas, since the canvas top is already offset by the UI height
                    const viewY = 16 - (minY * targetZoom);
                    
                    if (!isNaN(viewX) && !isNaN(viewY) && !isNaN(targetZoom)) {
                        rfInstance.setViewport({ x: viewX, y: viewY, zoom: targetZoom }, { duration: 800 });
                    } else {
                        rfInstance.fitView({ duration: 800, padding: 0.02 });
                    }
                } else {
                    rfInstance.fitView({ duration: 800, padding: 0.02 });
                }
            });
        }
    }, [selection.id, rfInstance, isLoading, visibleNodes.length, selectedDomains, globalFilterText, compactMode, config]);

    const visibleEdges = React.useMemo(() => {
        // If Contract View, show relationship edges
        if (contractViewNodes) {
            return contractViewEdges;
        }

        // If Drill Down
        if (selection.id) {
            // Re-construct initial edges from registry state for filtering
            const initialEdges = dataMeshRegistry
                .filter(item => item.dataUsageAgreementSpecification)
                .map(edge => ({
                    id: edge.id,
                    source: edge.provider.dataProductId,
                    target: edge.consumer.dataProductId,
                    animated: true,
                    type: 'default',
                    markerEnd: { type: 'arrowclosed' },
                    interactionWidth: 40,
                    style: {
                        strokeWidth: hoveredEdgeId === edge.id ? 3 : 2,
                        stroke: hoveredEdgeId === edge.id ? '#2563eb' : '#9ca3af',
                        zIndex: hoveredEdgeId === edge.id ? 10 : 0
                    }
                }));

            // Base edges connected to the selected node
            const connectedEdges = initialEdges.filter(e => String(e.source) === String(selection.id) || String(e.target) === String(selection.id));
            return connectedEdges;
        }

        // If Mesh View (Filtered)
        // We want edges that connect any two visible nodes?
        // Or just edges connected to our "Primary set"? The user said "show also data products ... even if they are not selected domains".
        // Usually you want to see the connections between visible nodes.
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

    }, [selection.id, edges, dataMeshRegistry, hoveredEdgeId, visibleNodes, contractViewNodes, contractViewEdges]);


    const onNodeClick = React.useCallback((event, node) => {
        if (observeMode && node.type === 'selectorNode') {
            setDrillNodeId(node.id);
            const metrics = metricsMap.get(node.id);
            if (metrics) {
                const customEvent = new CustomEvent('open-side-panel', {
                    detail: {
                        id: node.id,
                        type: 'observability',
                        content: metrics,
                        width: 'auto'
                    }
                });
                window.dispatchEvent(customEvent);
            }
        }
    }, [observeMode, metricsMap]);

    const onNodeDoubleClick = () => {
        console.log('Double click ignored');
    };

    const handleBack = React.useCallback((e) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        if (selection.kind === 'DataContract') {
            const dataMeshNodes = dataMeshRegistry.filter(item => item.kind === 'DataProduct' || item.kind === 'DataContract');
            // Find the producer (upstream Data Product)
            const producerNode = dataMeshNodes.find(n => n.outputPorts?.some(p => String(p.contractId) === String(selection.id)));
            if (producerNode) {
                setSelection({ id: producerNode.id, kind: 'DataProduct' });
                return;
            }
        }
        // Default: Reset to Mesh
        setSelection({ id: null, kind: null });
    }, [selection, dataMeshRegistry]);

    const backButtonLabel = React.useMemo(() => {
        if (!selection.id) return '';
        if (selection.kind === 'DataContract') return 'Back to Data Product';
        return 'Back to Mesh';
    }, [selection.id, selection.kind]);


    const onEdgeClick = React.useCallback((event, edge) => {
        event.stopPropagation();
        const agreement = dataMeshRegistry.find(item => item.id === edge.id);
        if (agreement) {
            const customEvent = new CustomEvent('open-side-panel', {
                detail: {
                    content: agreement,
                    type: 'agreement-yaml'
                }
            });
            window.dispatchEvent(customEvent);
        }
    }, [dataMeshRegistry]);

    const onEdgeMouseEnter = React.useCallback((event, edge) => {
        setHoveredEdgeId(edge.id);
    }, []);

    const onEdgeMouseLeave = React.useCallback(() => {
        setHoveredEdgeId(null);
    }, []);

    const formatKpiNumber = (count) => {
        if (count == null || count === 0) return "0";
        if (count < 1000) return count.toString();
        if (count < 1000000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        if (count < 1000000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        return (count / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    };

    const KpiCard = ({ title, value, bgColor }) => (
        <div style={{
            backgroundColor: bgColor,
            borderRadius: '0px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px',
            height: '90px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: 'none',
            flexShrink: 0
        }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', textAlign: 'center', lineHeight: '1.2' }}>{title}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', lineHeight: '1' }}>{value}</div>
        </div>
    );

    const kpiStats = React.useMemo(() => {
        if (!observeMode || selection.id || !config?.observability?.kpis) return null;

        const kpisConfig = config.observability.kpis;
        const results = Object.keys(kpisConfig).map(k => ({ id: k, value: 0, config: kpisConfig[k] }));

        visibleNodes.forEach(node => {
            if (node.type !== 'selectorNode') return;
            const tier = node.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const metrics = metricsMap.get(node.id);

            results.forEach(kpiObj => {
                const kpi = kpiObj.config;
                if (!kpi.visible || !kpi.aggregation) return;

                const agg = kpi.aggregation;
                let matchesCriteria = true;

                if (agg.criteria) {
                    if (agg.criteria.dataProductTier && (!tier || !agg.criteria.dataProductTier.includes(tier))) {
                        matchesCriteria = false;
                    }
                    if (agg.criteria.kind && node.data.originalData?.kind !== agg.criteria.kind) {
                        matchesCriteria = false;
                    }
                }

                if (!matchesCriteria) return;

                if (agg.type === 'count') {
                    kpiObj.value += 1;
                } else if (agg.type === 'sum' && agg.field) {
                    kpiObj.value += (node.data[agg.field] || 0);
                } else if (agg.type === 'sumMetric' && agg.metric) {
                    const resultMetric = metrics?.results?.find(r => r.name === agg.metric && r.type === 'metric');
                    if (resultMetric && resultMetric.measure && typeof resultMetric.measure.value === 'number') {
                        kpiObj.value += resultMetric.measure.value;
                    }
                }
            });
        });

        return results;
    }, [visibleNodes, observeMode, selection.id, metricsMap, config]);

    const renderKpiCards = () => {
        if (!observeMode || selection.id || !kpiStats) return null;
        return (
            <React.Fragment>
                {kpiStats.filter(k => k.config.visible).map(kpi => (
                    <KpiCard key={kpi.id} title={kpi.config.name} value={formatKpiNumber(kpi.value)} bgColor={kpi.config.bgColor || `var(--kpi-${kpi.id}-bg, #4c1d95)`} />
                ))}
            </React.Fragment>
        );
    };
    const downloadData = (format) => {
        let content = '';
        let type = '';
        let extension = '';
        
        if (format === 'yaml') {
            content = YAML.stringify(dataMeshRegistry);
            type = 'text/yaml';
            extension = 'yaml';
        } else if (format === 'json') {
            content = JSON.stringify(dataMeshRegistry, null, 2);
            type = 'application/json';
            extension = 'json';
        }
        
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        a.download = `dmesh-operational-data-${yyyy}${mm}${dd}_${hh}${min}${ss}.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyDataToClipboard = (format) => {
        let content = '';
        if (format === 'yaml') {
            content = YAML.stringify(dataMeshRegistry);
        } else if (format === 'json') {
            content = JSON.stringify(dataMeshRegistry, null, 2);
        }
        navigator.clipboard.writeText(content);
        setCopiedFormat(`test-${format}`);
        setTimeout(() => setCopiedFormat(null), 2000);
    };

    return (
        <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--m3-surface, #ffffff)' }}>
            {/* Secret Test Mode Toggle */}
            <div 
                onClick={() => {
                    if (!window.location.hash.includes('#test')) {
                        setIsTestMode(prev => !prev);
                    }
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40px',
                    height: '40px',
                    zIndex: 9999,
                    cursor: 'default'
                }}
            />

            {/* Configuration Error Banner */}
            {configError && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    margin: '20px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '16px', fontWeight: '600' }}>
                                Configuration Error
                            </h3>
                            <p style={{ margin: '0 0 12px 0', color: '#7f1d1d', fontSize: '14px', lineHeight: '1.5' }}>
                                {configError}
                            </p>
                            <button
                                className="btn btn-danger"
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registry Error Banner */}
            {error && !configError && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    margin: '20px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '16px', fontWeight: '600' }}>
                                Registry Loading Error
                            </h3>
                            <p style={{ margin: '0 0 12px 0', color: '#7f1d1d', fontSize: '14px', lineHeight: '1.5' }}>
                                {error}
                            </p>
                            <button
                                className="btn btn-danger"
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar for Controls */}
            {/* Top Bar for Controls */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                zIndex: 10,
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                pointerEvents: 'none' // Let clicks pass through to canvas where empty
            }}>

                {/* Left Controls Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'auto', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Domain Selector */}
                        {!selection.id && (
                            <DomainSelector
                                domains={availableDomains}
                                selectedDomains={selectedDomains}
                                onChange={setSelectedDomains}
                                formatDomain={(d) => config?.domainNameCustomisation?.[d] || d}
                            />
                        )}

                        {/* Global Filter */}
                        {!selection.id && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <GlobalFilter
                                    filterText={globalFilterText}
                                    onFilterChange={setGlobalFilterText}
                                />
                            </div>
                        )}

                        {/* Validate Button */}
                        {!selection.id && validationResults?.length > 0 && (
                            <button
                                className="btn btn-danger"
                                onClick={handleValidateRegistry}
                                disabled={isLoading || error}
                                style={{
                                    padding: '8px 16px',
                                    height: '32px' // Match input height roughly
                                }}
                            >
                                Found {validationResults.length} Registry Error(s)
                            </button>
                        )}

                        {/* Back Button */}
                        {selection.id && (
                            <button
                                className="btn btn-primary"
                                onClick={handleBack}
                                style={{
                                    padding: '8px 16px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                {backButtonLabel}
                            </button>
                        )}
                    </div>

                    {/* Mobile KPIs */}
                    {isMobile && !selection.id && !hideKpis && kpiStats && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            animation: 'slideDown 0.3s ease-out',
                            paddingBottom: '4px',
                            maxHeight: 'calc(100vh - 120px)',
                            overflowY: 'auto',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}>
                            {renderKpiCards()}
                        </div>
                    )}

                    {/* Desktop KPIs */}
                    {!isMobile && !selection.id && !hideKpis && kpiStats && (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'nowrap',
                                gap: '8px',
                                animation: 'slideDown 0.3s ease-out',
                                flexShrink: 1,
                                minWidth: 0,
                                overflowX: 'auto',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                paddingBottom: '4px'
                            }}
                        >
                            {renderKpiCards()}
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }}></div>

                {/* Right Controls Group - Observability */}
                <div style={{ display: 'flex', gap: '16px', pointerEvents: 'auto', alignItems: 'flex-start', flexShrink: 1, minWidth: 0 }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 1, minWidth: 0, maxWidth: '100%' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <ThemeToggle isTestMode={isTestMode} />
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCompactMode(!compactMode)}
                                title={compactMode ? 'EXPAND' : 'COMPACT'}
                            >
                                {compactMode ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <polyline points="9 21 3 21 3 15"></polyline>
                                        <line x1="21" y1="3" x2="14" y2="10"></line>
                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="4 14 10 14 10 20"></polyline>
                                        <polyline points="20 10 14 10 14 4"></polyline>
                                        <line x1="14" y1="10" x2="21" y2="3"></line>
                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                    </svg>
                                )}
                                {!isMobile && (compactMode ? 'EXPAND' : 'COMPACT')}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setObserveMode(!observeMode);
                                    if (observeMode) {
                                        setActiveDimension(null);
                                        setDrillNodeId(null);
                                        setSidePanelContent(null);
                                    }
                                }}
                                title={observeMode ? 'OBSERVING' : 'OBSERVE'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                {!isMobile && (observeMode ? 'OBSERVING' : 'OBSERVE')}
                            </button>
                            <div ref={globalConfigMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => setShowGlobalConfig(!showGlobalConfig)}
                                    className={`btn btn-secondary ${showGlobalConfig ? 'custom-chip-selected' : ''}`}
                                    title="Options"
                                    style={{ padding: '8px' }}
                                >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                                {showGlobalConfig && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'var(--m3-surface, white)',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid var(--m3-outline-variant, #e2e8f0)',
                                        padding: '12px',
                                        minWidth: '180px',
                                        zIndex: 1000
                                    }}>
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDomainLabels(!showDomainLabels);
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={showDomainLabels}
                                                readOnly
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Show domain labels in compact view</span>
                                        </div>
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: '8px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDescriptionsExpanded(!showDescriptionsExpanded);
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={showDescriptionsExpanded}
                                                readOnly
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Show descriptions in expanded view</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {observeMode && (
                            <div style={{
                                display: 'flex',
                                background: 'var(--m3-surface, #ffffff)',
                                padding: '4px',
                                borderRadius: '20px',
                                boxShadow: 'var(--m3-elevation-2, 0 4px 12px rgba(0,0,0,0.1))',
                                border: '1px solid var(--m3-outline-variant, #e2e8f0)',
                                animation: 'slideDown 0.3s ease-out',
                                maxWidth: '100%'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    overflowX: 'auto',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}>
                                    {availableDimensions.map(dim => {
                                        const dimKey = dim === 'Any' ? null : dim;
                                        const isActive = activeDimension === dimKey;
                                        return (
                                            <button
                                                key={dim}
                                                onClick={() => setActiveDimension(dimKey)}
                                                className={`custom-chip custom-chip-interactive ${isActive ? 'custom-chip-selected' : ''}`}
                                                style={{
                                                    border: 'none',
                                                    margin: '0 2px',
                                                }}
                                            >
                                                {dim}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* US-05: Configuration Cog */}
                                <div ref={configMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid var(--m3-outline-variant, #e2e8f0)', flexShrink: 0 }}>
                                    <button
                                        onClick={() => setShowConfig(!showConfig)}
                                        className={`custom-chip-icon custom-chip-interactive ${showConfig ? 'custom-chip-selected' : ''}`}
                                        style={{ border: 'none' }}
                                        title="Observability Settings"
                                    >
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>

                                    {showConfig && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '8px',
                                            background: 'var(--m3-surface, white)',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                            border: '1px solid var(--m3-outline-variant, #e2e8f0)',
                                            padding: '12px',
                                            minWidth: '180px',
                                            zIndex: 1000
                                        }}>
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHideHealthy(!hideHealthy);
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={hideHealthy}
                                                    readOnly
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Hide Healthy Nodes</span>
                                            </div>
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: '8px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHideKpis(!hideKpis);
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={hideKpis}
                                                    readOnly
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Hide KPIs</span>
                                            </div>
                                            {isTestMode && (
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: '8px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAdjustMetricsTime(!adjustMetricsTime);
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={adjustMetricsTime}
                                                        readOnly
                                                    />
                                                    <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Adjust metrics time</span>
                                                </div>
                                            )}
                                            {isTestMode && (
                                                <div style={{ borderTop: '1px solid var(--m3-outline-variant, #e2e8f0)', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--m3-on-surface-variant, #64748b)', textTransform: 'uppercase' }}>Simulation</div>
                                                    {Object.keys(config?.observability?.dimensions || {}).length > 0 ? Object.keys(config.observability.dimensions).map(dim => {
                                                        const isSimulated = simulatedDims.has(dim);
                                                        return (
                                                            <div
                                                                key={dim}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newSims = new Set(simulatedDims);
                                                                    if (isSimulated) newSims.delete(dim);
                                                                    else newSims.add(dim);
                                                                    setSimulatedDims(newSims);
                                                                }}
                                                            >
                                                                <input type="checkbox" checked={isSimulated} readOnly />
                                                                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Simulate {dim}</span>
                                                            </div>
                                                        );
                                                    }) : <div style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant, #64748b)' }}>No dimensions configured</div>}
                                                </div>
                                            )}
                                            {isTestMode && (
                                                <div style={{ borderTop: '1px solid var(--m3-outline-variant, #e2e8f0)', marginTop: '12px', paddingTop: '12px' }}>
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowEventsTab(!showEventsTab);
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={showEventsTab}
                                                            readOnly
                                                        />
                                                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--m3-on-surface, #1e293b)' }}>Show Events tab</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid #f87171',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Validation Modal */}
            {showValidationModal && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ marginTop: 0, color: validationResults?.length === 0 ? '#059669' : '#dc2626' }}>
                            {validationResults?.length === 0 ? 'Validation Successful' : 'Validation Failed'}
                        </h2>

                        <div style={{ flex: 1, overflow: 'auto', marginBottom: '20px' }}>
                            {validationResults?.length === 0 ? (
                                <p style={{ color: '#4b5563' }}>All registry items match the provided schemas.</p>
                            ) : (
                                <div>
                                    <p style={{ color: '#4b5563', fontWeight: '500' }}>Found {validationResults.length} errors:</p>
                                    <ul style={{ paddingLeft: '20px', color: '#dc2626' }}>
                                        {validationResults.map((err, i) => (
                                            <li key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                                <strong>{err.id} ({err.type}){err.line ? ` [Line ${err.line}]` : ''}:</strong> {err.message}
                                                <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                                                    Path: {err.path || 'root'}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowValidationModal(false)}
                            style={{
                                alignSelf: 'flex-end',
                                padding: '8px 16px',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div style={{
                position: 'absolute',
                top: (!isMobile && !selection.id && !hideKpis && kpiStats) ? '170px' : '68px',
                bottom: 0,
                left: 0,
                right: 0
            }}>
                <ReactFlow
                colorMode={mode}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodes={visibleNodes}
                edges={visibleEdges}
                onNodesChange={!selection.id ? onNodesChange : undefined}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onEdgeMouseEnter={onEdgeMouseEnter}
                onEdgeMouseLeave={onEdgeMouseLeave}
                onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                onNodeDoubleClick={onNodeDoubleClick}
                onInit={setRfInstance}
                minZoom={0.1}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
            >
                <Background />
                <Controls position="bottom-right" />
                {/* <MiniMap position="bottom-right" /> */}
                <svg style={{ position: 'absolute', top: 0, left: 0 }}>
                    <defs>
                        <marker id="custom-arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--connector-default, #9ca3af)" />
                        </marker>
                        <marker id="custom-arrow-hovered-node" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--connector-hovered-node, #ff5500)" />
                        </marker>
                        <marker id="custom-arrow-hovered-edge" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--connector-hovered-edge, #ff5500)" />
                        </marker>
                        <marker id="custom-arrow-faint" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--connector-faint, #ffffff)" />
                        </marker>
                    </defs>
                </svg>
            </ReactFlow>
            </div>

            {/* Side Panel */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: sidePanelWidth === 'auto' ? 'fit-content' : `${sidePanelWidth}px`,
                minWidth: '300px', // Minimum width
                borderRadius: '24px 0 0 24px', // M3 Large Corner
                background: 'var(--m3-surface)',
                boxShadow: 'var(--m3-elevation-3)',
                // Use transform for slide in/out
                transform: sidePanelContent ? 'translateX(0)' : 'translateX(100%)',
                // Transition transform
                transition: isResizing ? 'none' : 'transform 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0)', // M3 Easing
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--m3-outline-variant)'
            }}>
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        cursor: 'ew-resize',
                        zIndex: 21, // Higher than panel content
                        background: 'transparent', // Invisible by default
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                />

                {sidePanelContent && (
                    <>
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid var(--m3-outline-variant)',
                            background: 'var(--m3-surface-variant)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h3 style={{ margin: 0, color: 'var(--m3-on-surface)', fontFamily: 'var(--font-family-heading, inherit)' }}>
                                        {sidePanelType === 'examples' ? 'Examples' :
                                            sidePanelType === 'dq' ? 'Data Quality' :
                                                sidePanelType === 'observability' ? (() => {
                                                    const dp = dataMeshRegistry.find(item => item.id === sidePanelNodeId);
                                                    if (dp) {
                                                        const businessName = dp.customProperties?.find(p => p.property === 'dataProductBusinessName')?.value;
                                                        const label = businessName || dp.name;
                                                        return `${label} observability`;
                                                    }
                                                    return 'Observability';
                                                })() :
                                                    sidePanelType === 'agreement-yaml' ? 'Data Usage Agreement' :
                                                        sidePanelType === 'data-product-yaml' ? 'Data Product' :
                                                            sidePanelType === 'data-contract-yaml' ? 'Data Contract' : 'YAML'}
                                    </h3>

                                    {/* Standard Specification Pills */}
                                    {sidePanelType === 'data-product-yaml' && (
                                        <a
                                            href="https://bitol-io.github.io/open-data-product-standard/v1.0.0"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="custom-chip custom-chip-interactive"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            Open Data Product Standard v1.0.0
                                        </a>
                                    )}
                                    {sidePanelType === 'data-contract-yaml' && (
                                        <a
                                            href="https://bitol-io.github.io/open-data-contract-standard/v3.0.1"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="custom-chip custom-chip-interactive"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            Open Data Contract Standard v3.0.1
                                        </a>
                                    )}
                                    {sidePanelType === 'agreement-yaml' && (
                                        <a
                                            href="https://datausageagreement.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="custom-chip custom-chip-interactive"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            Data Usage Agreement Specification v0.0.1
                                        </a>
                                    )}
                                    {sidePanelType === 'observability' && (
                                        <a
                                            href="https://dmesh-zone.github.io/open-data-product-observability-standard/v0.1.0/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="custom-chip custom-chip-interactive"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            Open Data Product Observability Standard v0.1.0
                                        </a>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSidePanelContent(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        color: 'var(--side-panel-close-btn, #64748b)'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>

                            {/* Tab Selector */}
                            {['data-product-yaml', 'data-contract-yaml', 'agreement-yaml', 'observability'].includes(sidePanelType) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', padding: '0 8px' }}>
                                    <div className="side-panel-tab-container">
                                        {sidePanelType === 'observability' ? (
                                            ['metrics', 'events', 'yaml', 'json']
                                                .filter(tab => tab !== 'events' || showEventsTab)
                                                .map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setSidePanelTab(tab)}
                                                        className={`side-panel-tab ${sidePanelTab === tab ? 'active' : ''}`}
                                                    >
                                                        {tab === 'yaml' ? 'YAML' : (tab === 'json' ? 'JSON' : tab.charAt(0).toUpperCase() + tab.slice(1))}
                                                    </button>
                                                ))
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setSidePanelTab('visual')}
                                                    className={`side-panel-tab ${sidePanelTab === 'visual' ? 'active' : ''}`}
                                                >
                                                    Visual
                                                </button>
                                                <button
                                                    onClick={() => setSidePanelTab('yaml')}
                                                    className={`side-panel-tab ${sidePanelTab === 'yaml' ? 'active' : ''}`}
                                                >
                                                    YAML
                                                </button>
                                                <button
                                                    onClick={() => setSidePanelTab('json')}
                                                    className={`side-panel-tab ${sidePanelTab === 'json' ? 'active' : ''}`}
                                                >
                                                    JSON
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {sidePanelType === 'data-contract-yaml' && sidePanelAnchor && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setSidePanelAnchor(null)}
                                            title="Show Full Contract"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <polyline points="9 21 3 21 3 15"></polyline>
                                                <line x1="21" y1="3" x2="14" y2="10"></line>
                                                <line x1="3" y1="21" x2="10" y2="14"></line>
                                            </svg>
                                            Full Contract
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Filter Input for YAML views - Only show in YAML tab */}
                            {((['yaml', 'data-product-yaml', 'agreement-yaml', 'data-contract-yaml'].includes(sidePanelType) && sidePanelTab === 'yaml') ||
                                (sidePanelType === 'observability' && sidePanelTab === 'yaml')) && (
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            className="custom-input"
                                            placeholder="Filter YAML..."
                                            value={sidePanelFilter}
                                            onChange={(e) => setSidePanelFilter(e.target.value)}
                                            style={{ paddingRight: '24px' }}
                                        />
                                        {sidePanelFilter && (
                                            <button
                                                onClick={() => setSidePanelFilter('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    fontSize: '14px',
                                                    padding: 0
                                                }}
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                )}
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0px' }}>
                            {sidePanelType === 'examples' ? (
                                <ExampleTable schema={sidePanelContent} />
                            ) : sidePanelType === 'dq' ? (
                                <QualityTable schema={sidePanelContent} />
                            ) : sidePanelType === 'observability' && (sidePanelTab === 'metrics' || sidePanelTab === 'events') ? (
                                <ObservabilityDrilldown
                                    metrics={sidePanelContent}
                                    filterText={sidePanelFilter}
                                    activeTab={sidePanelTab}
                                    availableDimensions={availableDimensions}
                                    showEventsTab={showEventsTab}
                                    config={config}
                                />
                            ) : sidePanelTab === 'visual' && sidePanelType === 'data-product-yaml' ? (
                                <ErrorBoundary>
                                    <DataProductVisual data={sidePanelContent.originalData || sidePanelContent} registry={dataMeshRegistry} />
                                </ErrorBoundary>
                            ) : sidePanelTab === 'visual' && sidePanelType === 'data-contract-yaml' ? (
                                <DataContractVisual
                                    data={sidePanelContent.originalData || sidePanelContent}
                                    anchor={sidePanelAnchor}
                                    filterByAnchor={!!sidePanelAnchor}
                                    onViewFull={() => setSidePanelAnchor(null)}
                                    config={config}
                                />
                            ) : sidePanelTab === 'visual' && sidePanelType === 'agreement-yaml' ? (
                                <DataUsageAgreementVisual data={sidePanelContent.originalData || sidePanelContent} />
                            ) : sidePanelType === 'agreement-yaml' ? (
                                <InteractiveYaml
                                    data={sidePanelContent.originalData || sidePanelContent}
                                    filterText={sidePanelFilter}
                                />
                            ) : sidePanelTab === 'json' ? (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => {
                                            const rawData = sidePanelContent.originalData || sidePanelContent;
                                            navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
                                            setCopiedFormat('json');
                                            setTimeout(() => setCopiedFormat(null), 2000);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: copiedFormat === 'json' ? '#10b981' : 'var(--m3-surface-variant)',
                                            color: copiedFormat === 'json' ? 'white' : 'var(--m3-on-surface)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10,
                                            boxShadow: 'var(--m3-elevation-1)'
                                        }}
                                        title="Copy JSON"
                                    >
                                        {copiedFormat === 'json' ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        )}
                                    </button>
                                    <InteractiveJson
                                        data={sidePanelContent.originalData || sidePanelContent}
                                        filterText={sidePanelFilter}
                                    />
                                </div>
                            ) : (
                                // Default YAML view
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => {
                                            const rawData = sidePanelContent.originalData || sidePanelContent;
                                            navigator.clipboard.writeText(YAML.stringify(rawData));
                                            setCopiedFormat('yaml');
                                            setTimeout(() => setCopiedFormat(null), 2000);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: copiedFormat === 'yaml' ? '#10b981' : 'var(--m3-surface-variant)',
                                            color: copiedFormat === 'yaml' ? 'white' : 'var(--m3-on-surface)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10,
                                            boxShadow: 'var(--m3-elevation-1)'
                                        }}
                                        title="Copy YAML"
                                    >
                                        {copiedFormat === 'yaml' ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        )}
                                    </button>
                                    <InteractiveYaml
                                        data={(() => {
                                            const rawData = sidePanelContent.originalData || sidePanelContent;
                                            if (sidePanelType === 'data-contract-yaml' && sidePanelAnchor) {
                                                const table = rawData.schema?.find(t => (t.physicalName || t.name) === sidePanelAnchor);
                                                return table || rawData;
                                            }
                                            return rawData;
                                        })()}
                                        type={sidePanelType}
                                        filterText={sidePanelFilter}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Overlay to close panel when clicking outside */}
            {sidePanelContent && (
                <div
                    onClick={() => setSidePanelContent(null)}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.2)',
                        zIndex: 15
                    }}
                />
            )}

            {/* Floating Buttons - Bottom Left */}
            {isTestMode && (
                <div 
                    onMouseEnter={() => setIsHoveredBottomLeft(true)}
                    onMouseLeave={() => setIsHoveredBottomLeft(false)}
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        padding: '24px',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '12px',
                        opacity: isHoveredBottomLeft ? 1 : 0,
                        transform: isHoveredBottomLeft ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'opacity 0.3s ease, transform 0.3s ease',
                        pointerEvents: isHoveredBottomLeft ? 'auto' : 'none'
                    }}>
                    {/* Copy YAML */}
                    <button
                        onClick={() => copyDataToClipboard('yaml')}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: copiedFormat === 'test-yaml' ? '#10b981' : 'var(--button-secondary-bg, #f3f4f6)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (copiedFormat !== 'test-yaml') {
                                e.currentTarget.style.background = 'var(--button-secondary-hover-bg, #e5e7eb)';
                            }
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            if (copiedFormat !== 'test-yaml') {
                                e.currentTarget.style.background = 'var(--button-secondary-bg, #f3f4f6)';
                            }
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Copy as YAML"
                    >
                        <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {copiedFormat === 'test-yaml' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--button-secondary-text, white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-6px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: 'var(--button-secondary-text, white)',
                                        textShadow: '0 0 2px rgba(0,0,0,0.5)'
                                    }}>Y</span>
                                </>
                            )}
                        </div>
                    </button>

                    {/* Download YAML */}
                    <button
                        onClick={() => downloadData('yaml')}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: 'var(--button-secondary-bg, #f3f4f6)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-hover-bg, #e5e7eb)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-bg, #f3f4f6)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Download as YAML"
                    >
                        <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--button-secondary-text, white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-6px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--button-secondary-text, white)',
                                textShadow: '0 0 2px rgba(0,0,0,0.5)'
                            }}>Y</span>
                        </div>
                    </button>
                    
                    {/* Copy JSON */}
                    <button
                        onClick={() => copyDataToClipboard('json')}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: copiedFormat === 'test-json' ? '#10b981' : 'var(--button-secondary-bg, #f3f4f6)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (copiedFormat !== 'test-json') {
                                e.currentTarget.style.background = 'var(--button-secondary-hover-bg, #e5e7eb)';
                            }
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            if (copiedFormat !== 'test-json') {
                                e.currentTarget.style.background = 'var(--button-secondary-bg, #f3f4f6)';
                            }
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Copy as JSON"
                    >
                        <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {copiedFormat === 'test-json' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--button-secondary-text, white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-5px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: 'var(--button-secondary-text, white)',
                                        textShadow: '0 0 2px rgba(0,0,0,0.5)'
                                    }}>J</span>
                                </>
                            )}
                        </div>
                    </button>

                    {/* Download JSON */}
                    <button
                        onClick={() => downloadData('json')}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: 'var(--button-secondary-bg, #f3f4f6)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-hover-bg, #e5e7eb)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-bg, #f3f4f6)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Download as JSON"
                    >
                        <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--button-secondary-text, white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-5px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--button-secondary-text, white)',
                                textShadow: '0 0 2px rgba(0,0,0,0.5)'
                            }}>J</span>
                        </div>
                    </button>

                    {/* Load Registry */}
                    <button
                        onClick={() => setShowRegistryModal(true)}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: 'var(--button-secondary-bg, #f3f4f6)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-hover-bg, #e5e7eb)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--button-secondary-bg, #f3f4f6)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Load Registry"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--button-secondary-text, white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                    </button>
                </div>
            </div>
        )}

            {/* Registry Modal */}
            <RegistryModal
                isOpen={showRegistryModal}
                onClose={() => setShowRegistryModal(false)}
                currentUrl={registryUrl}
                registries={config.registries || []}
                onLoad={(url) => setRegistryUrl(url)}
                onLoadText={(text) => handleLoadRegistryText(text)}
            />
        </div>
    );
}
