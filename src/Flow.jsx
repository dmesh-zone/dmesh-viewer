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
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DataProductNode from './DataProductNode';
import DataProductDetailNode from './DataProductDetailNode';
import DataContractNode from './DataContractNode';
import InteractiveYaml from './InteractiveYaml';
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

const nodeTypes = {
    selectorNode: DataProductNode,
    lineageNode: DataProductDetailNode,
    dataContractNode: DataContractNode,
};

const edgeTypes = {
    relationshipEdge: RelationshipEdge,
};

const BASE_URL = import.meta.env.BASE_URL;

const normalizePath = (path) => {
    if (!path) return path;
    if (path.startsWith('http')) return path;
    // Prefix relative paths starting with / with BASE_URL
    if (path.startsWith('/')) {
        return `${BASE_URL}${path.slice(1)}`;
    }
    return path;
};

export default Flow;

function Flow() {
    // Registry State - URL will be loaded from config.json
    const [registryUrl, setRegistryUrl] = React.useState('');

    const [dataMeshRegistry, setDataMeshRegistry] = React.useState([]);
    const [dataMeshRegistryRaw, setDataMeshRegistryRaw] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [config, setConfig] = React.useState({ iconMap: {}, tiers: {}, domainPalette: [], defaultDataMeshRegistryUrl: '', registries: [] }); // Config state
    const [configError, setConfigError] = React.useState(null); // Track config loading errors
    const [showRegistryModal, setShowRegistryModal] = React.useState(false);

    // Load Config
    React.useEffect(() => {
        Promise.all([
            fetch(normalizePath('/config.yaml'))
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Failed to load config.yaml (${res.status} ${res.statusText}). Make sure the file exists in the public directory.`);
                    }
                    return res.text();
                }),
            fetch(normalizePath('/customConfig.yaml'))
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
            if (!data.defaultDataMeshRegistryUrl) {
                setConfigError('config.yaml is missing required field "defaultDataMeshRegistryUrl". Please add this field with the path to your registry YAML file.');
                return;
            }

            const loadedConfig = {
                iconMap: data.iconMap || {},
                tiers: data.tiers || {},
                domainPalette: data.domainPalette || ['#fee2e2', '#f3e8ff', '#fef3c7', '#ffedd5', '#e0e7ff', '#dbeafe', '#dcfce7'],
                observability: data.observability || {},
                defaultDataMeshRegistryUrl: normalizePath(data.defaultDataMeshRegistryUrl),
                registries: (data.sampleDataMeshRegistryUrls || []).map(reg => ({
                    original: reg,
                    normalized: normalizePath(reg)
                }))
            };
            setConfig(loadedConfig);
            setConfigError(null);
            // Set initial registry URL from config
            setRegistryUrl(loadedConfig.defaultDataMeshRegistryUrl);
        })
        .catch(err => {
            console.error("Failed to load config.yaml", err);
            setConfigError(err.message);
        });
    }, []);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selection, setSelection] = React.useState({ id: null, kind: null });
    const [hoveredEdgeId, setHoveredEdgeId] = React.useState(null);
    const [rfInstance, setRfInstance] = React.useState(null);

    // Filter State
    const [selectedDomains, setSelectedDomains] = React.useState([]);
    const [globalFilterText, setGlobalFilterText] = React.useState('');

    // Side Panel State
    const [sidePanelContent, setSidePanelContent] = React.useState(null);
    const [sidePanelType, setSidePanelType] = React.useState('yaml'); // 'yaml' | 'examples'
    const [sidePanelWidth, setSidePanelWidth] = React.useState(500);
    const [sidePanelFilter, setSidePanelFilter] = React.useState(''); // New filter state
    const [sidePanelTab, setSidePanelTab] = React.useState('visual'); // 'visual' | 'yaml'
    const [sidePanelAnchor, setSidePanelAnchor] = React.useState(null); // Table anchor

    // Mobile Responsiveness
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768 || window.innerHeight <= 500);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Observability State
    const [observeMode, setObserveMode] = React.useState(false);
    const [activeDimension, setActiveDimension] = React.useState(null); // null = 'any'
    const [metricsMap, setMetricsMap] = React.useState(new Map());
    const [drillNodeId, setDrillNodeId] = React.useState(null);
    const [hideHealthy, setHideHealthy] = React.useState(false);
    const [hideKpis, setHideKpis] = React.useState(false);
    const [showConfig, setShowConfig] = React.useState(false);
    const [showEventsTab, setShowEventsTab] = React.useState(false);

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
             if (!dimsConfig) return metrics.health || 'unknown';
             const dimsToCheck = Object.keys(dimsConfig);
             if (dimsToCheck.length === 0) return metrics.health || 'unknown';

             let hasCritical = false;
             let hasDegraded = false;
             let hasHealthy = false;

             for (const d of dimsToCheck) {
                 const healthCheckName = dimsConfig[d].healthCheck;
                 if (!healthCheckName) continue;

                 const checkResult = metrics.results?.find(r => r.name === healthCheckName && r.type === 'check');
                 if (!checkResult) continue;

                 if (checkResult.status === 'fail' && checkResult.severity === 'critical') hasCritical = true;
                 else if (checkResult.status === 'fail') hasDegraded = true;
                 else if (checkResult.status === 'pass') hasHealthy = true;
             }

             if (hasCritical) return 'critical';
             if (hasDegraded) return 'degraded';
             if (hasHealthy) return 'healthy';
             return 'unknown';
        }

        if (!dimsConfig || !dimsConfig[dimension]) return 'unknown';

        const healthCheckName = dimsConfig[dimension].healthCheck;
        if (!healthCheckName) return 'unknown';

        const checkResult = metrics.results?.find(r => r.name === healthCheckName && r.type === 'check');
        if (!checkResult) return 'unknown';

        if (checkResult.status === 'pass') return 'healthy';
        if (checkResult.status === 'fail') {
             if (checkResult.severity === 'critical') return 'critical';
             return 'degraded';
        }
        return 'unknown';
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
        setDataMeshRegistryRaw(text);

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
            setDataMeshRegistry([]);
        } else {
            const items = Array.isArray(parsed) ? parsed : [parsed];
            setDataMeshRegistry(items);
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
            setDataMeshRegistry([]);
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
                const response = await fetch(registryUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch registry from "${registryUrl}" (${response.status} ${response.statusText}). Please check the URL in config.yaml.`);
                }
                const text = await response.text();
                processRegistryText(text);
                setSelection({ id: null, kind: null });
            } catch (err) {
                console.error("Error loading registry:", err);
                setError(err.message);
                setDataMeshRegistry([]);
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
            const domainParam = params.get('domain');

            if (domainParam) {
                const urlDomains = domainParam.split(',').map(d => d.trim().toLowerCase());
                const matchingDomains = availableDomains.filter(d =>
                    urlDomains.includes(d.toLowerCase())
                );
                if (matchingDomains.length > 0) {
                    setSelectedDomains(matchingDomains);
                    return;
                }
            }
            setSelectedDomains(availableDomains);
        }
    }, [availableDomains]);

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
        if (uniqueDomains.length <= 1) {
            // If only 1 domain (or 0), keep white
            uniqueDomains.forEach(d => domainColorMap[d] = 'white');
        } else {
            uniqueDomains.forEach((domain, index) => {
                domainColorMap[domain] = config.domainPalette[index % config.domainPalette.length];
            });
        }

        // Reset counters for layout - track Y position by columnNumber instead of tier
        // This ensures that if multiple tiers share the same columnNumber, they don't overlap
        const columnY = {};
        Object.keys(config.tiers || {}).forEach(tierKey => {
            const tierConfig = config.tiers[tierKey];
            const colNum = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;
            if (columnY[colNum] === undefined) {
                columnY[colNum] = 0;
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

                // Get tier config
                const tierConfig = config.tiers?.[tier] || {};
                const color = tierConfig.color || '#bfdbfe';
                const banner = tierConfig.label || 'DATA PRODUCT';
                const bannerColor = tierConfig.bannerColor || tierConfig.color || '#93c5fd';

                // Background Color Logic (Domain based)
                const backgroundColor = domainColorMap[node.domain] || 'white';

                // Auto-layout Logic - Calculate X position from columnNumber
                // Use 450px spacing between columns to prevent overlap
                // columnNumber starts at 1, so subtract 1 for 0-based positioning
                const COLUMN_SPACING = 450;
                const NODE_WIDTH = 320; // Consistent width for all nodes
                const NODE_HEIGHT = 120; // Fixed height for consistency
                const VERTICAL_GAP = 40; // Space between nodes
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
                const healthStatus = observeMode ? deriveStatus(node.id, activeDimension) : null;
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
                        label: node.name,
                        banner: banner,
                        bannerColor: bannerColor,
                        backgroundColor: backgroundColor,
                        subtitle: node.domain,
                        icon: normalizePath(config.iconMap[technology] || (node.kind === 'DataContract' ? config.iconMap['table'] : config.iconMap['dataproduct'])),
                        hasOutputPorts: node.outputPorts && node.outputPorts.length > 0,
                        outputPortCount: node.outputPorts ? node.outputPorts.length : 0,
                        originalData: node, // Pass full source data for YAML view
                        // Observability props
                        observeMode,
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
        const initialEdges = dataMeshEdges
            .filter(edge => activeNodeIds.has(edge.provider.dataProductId) && activeNodeIds.has(edge.consumer.dataProductId))
            .map(edge => {
            const sourceHealth = deriveStatus(edge.provider.dataProductId, activeDimension);
            const targetHealth = deriveStatus(edge.consumer.dataProductId, activeDimension);

            const getEdgeColor = (h1, h2) => {
                if (!observeMode) return '#9ca3af';
                if (h1 === 'critical' || h2 === 'critical') return '#EF444488';
                if (h1 === 'degraded' || h2 === 'degraded') return '#F59E0B88';
                if (h1 === 'healthy' && h2 === 'healthy') return '#22C55E88';
                return '#9ca3af66';
            };

            const edgeColor = getEdgeColor(sourceHealth, targetHealth);

            return {
                id: edge.id,
                source: edge.provider.dataProductId,
                target: edge.consumer.dataProductId,
                animated: observeMode || true,
                type: 'default',
                markerEnd: { type: 'arrowclosed', color: observeMode ? edgeColor : undefined },
                interactionWidth: 40,
                style: {
                    strokeWidth: hoveredEdgeId === edge.id ? 3 : 2,
                    stroke: hoveredEdgeId === edge.id ? (observeMode ? edgeColor : '#2563eb') : (observeMode ? edgeColor : '#9ca3af'),
                    zIndex: hoveredEdgeId === edge.id ? 10 : 0,
                    transition: 'stroke 0.3s ease'
                }
            };
        });

        setNodes(initialNodes);
        setEdges(initialEdges);

    }, [dataMeshRegistry, setNodes, setEdges, hoveredEdgeId, observeMode, activeDimension, metricsMap, drillNodeId, config, hideHealthy]);


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
                            label: schemaElement.name || schemaElement.physicalName || `Schema ${index + 1}`,
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
                    label: contractData.name || contractData.physicalName || String(selection.id),
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

        // Upstream Nodes (Producers)
        const upstreamEdges = dataMeshEdges.filter(e => String(e.target) === String(selection.id));
        upstreamEdges.forEach((edge, index) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            if (sourceNode) {
                relatedNodes.push({
                    ...sourceNode,
                    position: { x: -450, y: index * 150 } // Stack upstream on left - Using 450 to match COLUMN_SPACING
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
                    position: { x: 450, y: index * 150 } // Stack downstream on right
                });
            }
        });

        return relatedNodes;
    }, [selection, nodes, dataMeshNodes, dataMeshRegistry]);

    // Mesh filtering visibility logic
    const meshFilterNodes = React.useMemo(() => {
        // If we have a selected node, we don't use this logic (we show Drill Down view)
        if (selection.id) return null;

        // 1. Identify "Primary Matches" based on filters
        const primaryMatches = nodes.filter(node => {
            const matchesDomain = selectedDomains.length === 0 || selectedDomains.includes(node.data.subtitle); // subtitle stores domain
            const matchesSearch = globalFilterText === '' ||
                node.data.label.toLowerCase().includes(globalFilterText.toLowerCase()) ||
                String(node.id).toLowerCase().includes(globalFilterText.toLowerCase());
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
        const filteredNodes = nodes.filter(n => finalIds.has(n.id));

        // 4. Dynamic Relayout for Filtered View
        // Sort nodes by tier (columnNumber) then by domain then by label to ensure consistent vertical order
        const sortedNodes = [...filteredNodes].sort((a, b) => {
            const tierA = a.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const tierB = b.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const colA = config.tiers?.[tierA]?.columnNumber || 1;
            const colB = config.tiers?.[tierB]?.columnNumber || 1;
            if (colA !== colB) return colA - colB;

            // Secondary sort by domain
            if (a.data.subtitle !== b.data.subtitle) {
                return a.data.subtitle.localeCompare(b.data.subtitle);
            }

            // Tertiary sort by label
            return a.data.label.localeCompare(b.data.label);
        });

        const columnY = {};
        const COLUMN_SPACING = 450;
        const NODE_HEIGHT = 120;
        const VERTICAL_GAP = 40;
        const VERTICAL_STEP = NODE_HEIGHT + VERTICAL_GAP;

        return sortedNodes.map(node => {
            const tier = node.data.originalData?.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            const tierConfig = config.tiers?.[tier] || {};
            const columnNumber = tierConfig.columnNumber !== undefined ? tierConfig.columnNumber : 1;

            const x = (columnNumber - 1) * COLUMN_SPACING;
            const y = columnY[columnNumber] || 0;
            columnY[columnNumber] = y + VERTICAL_STEP;

            return {
                ...node,
                position: { x, y }
            };
        });

    }, [nodes, selectedDomains, globalFilterText, dataMeshRegistry, selection.id, config.tiers]);


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
            const type = e.detail.type || 'yaml';
            setSidePanelType(type);
            setSidePanelFilter(''); // Reset filter when opening new content

            if (type === 'examples') {
                // For examples, default to auto/fit-content
                setSidePanelWidth('auto');
            } else if (e.detail.width) {
                // Allow up to 1400px or 90% of screen width if I could, but simple max:
                setSidePanelWidth(Math.min(1400, Math.max(300, e.detail.width)));
            } else if (['yaml', 'data-product-yaml', 'agreement-yaml', 'data-contract-yaml'].includes(type)) {
                setSidePanelWidth(500);
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
            console.log('Navigating to:', kind, id);
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
                rfInstance.fitView({ duration: 800, padding: 0.2 });
            });
        }
    }, [selection.id, rfInstance, isLoading, visibleNodes.length, selectedDomains, globalFilterText]);

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
                        width: 550
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
        if (selection.id || !config?.observability?.kpis) return null;
        
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
        if (selection.id || !kpiStats) return null;
        return (
            <React.Fragment>
                {kpiStats.filter(k => k.config.visible).map(kpi => (
                    <KpiCard key={kpi.id} title={kpi.config.name} value={formatKpiNumber(kpi.value)} bgColor={kpi.config.bgColor} />
                ))}
            </React.Fragment>
        );
    };

    return (
        <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>

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
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '6px 12px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
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
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '6px 12px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
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
                            />
                        )}

                        {/* Global Filter */}
                        {!selection.id && (
                            <GlobalFilter
                                filterText={globalFilterText}
                                onFilterChange={setGlobalFilterText}
                            />
                        )}

                        {/* Validate Button */}
                        {!selection.id && validationResults?.length > 0 && (
                            <button
                                onClick={handleValidateRegistry}
                                disabled={isLoading || error}
                                style={{
                                    padding: '8px 16px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    height: '32px' // Match input height roughly
                                }}
                            >
                                Found {validationResults.length} Registry Error(s)
                            </button>
                        )}

                        {/* Back Button */}
                        {selection.id && (
                            <button
                                onClick={handleBack}
                                style={{
                                    padding: '8px 16px',
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
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
                        <button
                        onClick={() => {
                            setObserveMode(!observeMode);
                            if (observeMode) {
                                setActiveDimension(null);
                                setDrillNodeId(null);
                                setSidePanelContent(null);
                            }
                        }}
                        style={{
                            padding: '8px 20px',
                            background: observeMode ? '#1e293b' : 'white',
                            color: observeMode ? '#f8fafc' : '#1e293b',
                            border: `2px solid ${observeMode ? '#3b82f6' : '#e2e8f0'}`,
                            borderRadius: '24px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '13px',
                            boxShadow: observeMode ? '0 0 15px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: observeMode ? '#3b82f6' : '#94a3b8',
                            boxShadow: observeMode ? '0 0 10px #3b82f6' : 'none',
                            animation: observeMode ? 'pulse 2s infinite' : 'none'
                        }}></div>
                        {observeMode ? 'OBSERVING' : 'OBSERVE'}
                    </button>

                    {observeMode && (
                        <div style={{
                            display: 'flex',
                            background: 'white',
                            padding: '4px',
                            borderRadius: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
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
                                            style={{
                                                padding: '4px 12px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                background: isActive ? '#3b82f6' : 'transparent',
                                                color: isActive ? 'white' : '#64748b',
                                                border: 'none',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {dim}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* US-05: Configuration Cog */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <button
                                    onClick={() => setShowConfig(!showConfig)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: showConfig ? '#3b82f6' : '#64748b',
                                        padding: '4px'
                                    }}
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
                                        background: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid #e2e8f0',
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
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>Hide Healthy Nodes</span>
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
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>Hide KPIs</span>
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
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>Adjust metrics time</span>
                                            </div>
                                        )}
                                        {isTestMode && (
                                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Simulation</div>
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
                                                            <input type="checkbox" checked={isSimulated} readOnly style={{ cursor: 'pointer' }} />
                                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>Simulate {dim}</span>
                                                        </div>
                                                    );
                                                }) : <div style={{ fontSize: '12px', color: '#64748b' }}>No dimensions configured</div>}
                                            </div>
                                        )}
                                        {isTestMode && (
                                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px' }}>
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
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>Show Events tab</span>
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
                            onClick={() => setShowValidationModal(false)}
                            style={{
                                alignSelf: 'flex-end',
                                padding: '8px 16px',
                                background: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <ReactFlow
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
                onNodeDoubleClick={onNodeDoubleClick}
                onInit={setRfInstance}
                minZoom={0.1}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>

            {/* Side Panel */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0, // Anchor to right
                bottom: 0, // Full height
                // Use 'fit-content' for 'examples' type unless manually resized (which sets sidePanelWidth to a number)
                // We'll interpret sidePanelWidth='auto' as fit-content.
                width: sidePanelWidth === 'auto' ? 'fit-content' : `${sidePanelWidth}px`,
                maxWidth: '90%', // Prevent taking full screen
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
                                    <h3 style={{ margin: 0, color: '#1e293b' }}>
                                        {sidePanelType === 'examples' ? 'Examples' :
                                            sidePanelType === 'dq' ? 'Data Quality' :
                                                sidePanelType === 'observability' ? 'Observability' :
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
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                background: '#f3e8ff', // purple-100
                                                color: '#6b21a8', // purple-800
                                                border: '1px solid #d8b4fe', // purple-300
                                                borderRadius: '12px',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Open Data Product Standard v1.0.0
                                        </a>
                                    )}
                                    {sidePanelType === 'data-contract-yaml' && (
                                        <a
                                            href="https://bitol-io.github.io/open-data-contract-standard/v3.0.1"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                background: '#f3e8ff',
                                                color: '#6b21a8',
                                                border: '1px solid #d8b4fe',
                                                borderRadius: '12px',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Open Data Contract Standard v3.0.1
                                        </a>
                                    )}
                                    {sidePanelType === 'agreement-yaml' && (
                                        <a
                                            href="https://datausageagreement.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                background: '#f3e8ff',
                                                color: '#6b21a8',
                                                border: '1px solid #d8b4fe',
                                                borderRadius: '12px',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Data Usage Agreement Specification v0.0.1
                                        </a>
                                    )}
                                    {sidePanelType === 'observability' && (
                                        <a
                                            href="https://joaovicente.github.io/open-data-product-observability-standard/v0.0.1/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                background: '#f3e8ff',
                                                color: '#6b21a8',
                                                border: '1px solid #d8b4fe',
                                                borderRadius: '12px',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Open Data Product Observability Standard v0.0.1
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
                                        color: '#64748b'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>

                            {/* Tab Selector */}
                            {['data-product-yaml', 'data-contract-yaml', 'agreement-yaml', 'observability'].includes(sidePanelType) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{
                                        display: 'flex',
                                        background: 'var(--m3-surface-variant)',
                                        padding: '4px',
                                        borderRadius: '24px',
                                        width: 'fit-content'
                                    }}>
                                        {sidePanelType === 'observability' ? (
                                            ['metrics', 'events', 'yaml']
                                                .filter(tab => tab !== 'events' || showEventsTab)
                                                .map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setSidePanelTab(tab)}
                                                    style={{
                                                        padding: '10px 24px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: sidePanelTab === tab ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)',
                                                        background: sidePanelTab === tab ? 'var(--m3-primary-container)' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: sidePanelTab === tab ? 'var(--m3-elevation-1)' : 'none',
                                                        textTransform: 'capitalize'
                                                    }}
                                                >
                                                    {tab}
                                                </button>
                                            ))
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setSidePanelTab('visual')}
                                                    style={{
                                                        padding: '10px 24px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: sidePanelTab === 'visual' ? 'var(--m3-on-secondary-container)' : 'var(--m3-on-surface-variant)',
                                                        background: sidePanelTab === 'visual' ? 'var(--m3-secondary-container)' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: sidePanelTab === 'visual' ? 'var(--m3-elevation-1)' : 'none'
                                                    }}
                                                >
                                                    Visual
                                                </button>
                                                <button
                                                    onClick={() => setSidePanelTab('yaml')}
                                                    style={{
                                                        padding: '10px 24px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: sidePanelTab === 'yaml' ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)',
                                                        background: sidePanelTab === 'yaml' ? 'var(--m3-primary-container)' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: sidePanelTab === 'yaml' ? 'var(--m3-elevation-1)' : 'none'
                                                    }}
                                                >
                                                    YAML
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {sidePanelType === 'data-contract-yaml' && sidePanelAnchor && (
                                        <button
                                            onClick={() => setSidePanelAnchor(null)}
                                            style={{
                                                background: '#f0f9ff',
                                                color: '#0369a1',
                                                border: '1px solid #bae6fd',
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#e0f2fe';
                                                e.currentTarget.style.borderColor = '#7dd3fc';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#f0f9ff';
                                                e.currentTarget.style.borderColor = '#bae6fd';
                                            }}
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
                                        placeholder="Filter YAML..."
                                        value={sidePanelFilter}
                                        onChange={(e) => setSidePanelFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '6px 10px',
                                            paddingRight: '24px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
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
                            ) : sidePanelType === 'observability' ? (
                                <ObservabilityDrilldown
                                    metrics={sidePanelContent}
                                    filterText={sidePanelFilter}
                                    activeTab={sidePanelTab}
                                    availableDimensions={availableDimensions}
                                    showEventsTab={showEventsTab}
                                    config={config}
                                />
                            ) : sidePanelTab === 'visual' && sidePanelType === 'data-product-yaml' ? (
                                <DataProductVisual data={sidePanelContent.originalData || sidePanelContent} />
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
                            ) : (
                                // Default YAML view
                                <InteractiveYaml
                                    data={(() => {
                                        const rawData = sidePanelContent.originalData || sidePanelContent;
                                        if (sidePanelType === 'data-contract-yaml' && sidePanelAnchor) {
                                            const table = rawData.schema?.find(t => (t.physicalName || t.name) === sidePanelAnchor);
                                            // Show only the schema for that table
                                            // We return it wrapped in the schema array to maintain some structure, or just the object
                                            // Returning just the object is cleaner for "focus"
                                            return table || rawData;
                                        }
                                        return rawData;
                                    })()}
                                    type={sidePanelType}
                                    filterText={sidePanelFilter}
                                />
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

            {/* Floating File Icon - Bottom Right */}
            <button
                onClick={() => setShowRegistryModal(true)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '34px',
                    height: '34px',
                    borderRadius: '17px',
                    background: '#f3f4f6',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Load Registry"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
            </button>

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
