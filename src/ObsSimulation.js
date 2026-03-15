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

/**
 * Observability Simulation Module
 * 
 * This module generates realistic observability metrics for data products.
 * It can be used both at runtime in the browser and as a CLI tool.
 */

// --- Constants & Config ---

const STATUS_DISTRIBUTION = {
    healthy: 0.7,
    degraded: 0.2,
    critical: 0.1
};

// --- Helper Functions ---

const getRandomStatus = () => {
    const r = Math.random();
    if (r < STATUS_DISTRIBUTION.healthy) return 'healthy';
    if (r < STATUS_DISTRIBUTION.healthy + STATUS_DISTRIBUTION.degraded) return 'degraded';
    return 'critical';
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Simulation Generators ---

export const generatePipelineMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    
    const metrics = {
        status: isCritical ? 'failed' : 'success',
        lastRunAt: new Date().toISOString(),
        durationSeconds: isCritical ? null : getRandomInt(60, 3600),
        recordsProcessed: isCritical ? null : getRandomInt(100, 10000000)
    };

    if (isCritical) {
        metrics.errorMessage = 'Upstream source connection timed out.';
    }

    return metrics;
};

export const generateConsumptionMetrics = () => {
    const objectiveMs = 10000;
    
    // On average 4 out of 10 do not meet the objective
    const met = Math.random() >= 0.4;
    
    let actualP95Ms;
    if (met) {
        actualP95Ms = getRandomInt(2000, 10000);
    } else {
        actualP95Ms = getRandomInt(10001, 20000);
    }
    
    return {
        objectiveMs,
        actualP95Ms,
        met
    };
};

export const generateFreshnessMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';
    
    const maxAllowed = 60;
    let lag = getRandomInt(5, 45);
    
    if (isCritical) {
        lag = maxAllowed * 2.5;
    } else if (isDegraded) {
        lag = maxAllowed * 1.2;
    }
    
    return {
        lagMinutes: lag,
        maxAllowedLagMinutes: maxAllowed,
        withinExpectation: !isCritical && !isDegraded,
        lastUpdatedAt: new Date().toISOString()
    };
};

export const generateQualityMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';
    
    const totalRules = 10;
    let passed = 10;
    
    if (isCritical) {
        passed = 6;
    } else if (isDegraded) {
        passed = 9;
    }
    
    const score = (passed / totalRules) * 100;
    
    return {
        score: score,
        rulesPassed: passed,
        rulesFailed: totalRules - passed,
        lastRunAt: new Date().toISOString()
    };
};

export const generateUsageMetrics = () => {
    return {
        activeConsumers: getRandomInt(1, 15),
        queryCount: getRandomInt(100, 5000)
    };
};

/**
 * Simulates metrics for an entire registry.
 */
export const simulateRegistryMetrics = (dataMeshRegistry, dimensions = ['Pipeline', 'Quality', 'Freshness', 'Consumption']) => {
    if (!dataMeshRegistry) return [];
    
    return dataMeshRegistry
        .filter(item => {
            if (item.kind !== 'DataProduct') return false;
            const tier = item.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            // Exclude dataSource and application tiers from simulation
            if (tier === 'dataSource' || tier === 'application') return false;
            return true;
        })
        .map(dp => {
            const status = getRandomStatus();
            const metrics = {
                kind: 'DataProductObservabilityMetrics',
                schemaVersion: '0.0.1',
                productId: dp.id,
                asOf: new Date().toISOString(),
                period: 'P1D',
                status: status
            };
            
            if (dimensions.includes('Pipeline')) metrics.physical = { pipeline: generatePipelineMetrics(status) };
            if (dimensions.includes('Consumption')) {
                if (!metrics.dynamic) metrics.dynamic = {};
                metrics.dynamic.responseTime = generateConsumptionMetrics(status);
                metrics.usage = generateUsageMetrics();
            }
            if (dimensions.includes('Freshness')) {
                if (!metrics.dynamic) metrics.dynamic = {};
                metrics.dynamic.freshness = generateFreshnessMetrics(status);
            }
            if (dimensions.includes('Quality')) {
                if (!metrics.dynamic) metrics.dynamic = {};
                metrics.dynamic.quality = generateQualityMetrics(status);
            }
            
            return metrics;
        });
};

// --- CLI Logic ---

const runCli = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const YAML = await import('yaml');
    
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node ObsSimulation.js <path-to-registry.yaml> [dimensions...]');
        console.log('Dimensions: Pipeline, Quality, Freshness, Consumption (comma separated or space separated)');
        process.exit(1);
    }
    
    const registryPath = path.resolve(args[0]);
    if (!fs.existsSync(registryPath)) {
        console.error(`Error: File not found at ${registryPath}`);
        process.exit(1);
    }
    
    try {
        const fileContent = fs.readFileSync(registryPath, 'utf8');
        const registry = YAML.parse(fileContent);
        
        let dimensions = ['Pipeline', 'Quality', 'Freshness', 'Consumption'];
        if (args.length > 1) {
            dimensions = args.slice(1).flatMap(a => a.split(','));
        }
        
        const metrics = simulateRegistryMetrics(registry, dimensions);
        
        // Append metrics to the registry if it's a list, or just print them
        if (Array.isArray(registry)) {
            const updatedRegistry = [...registry, ...metrics];
            const output = YAML.stringify(updatedRegistry);
            const outputPath = registryPath.replace('.yaml', '-with-sim-metrics.yaml');
            fs.writeFileSync(outputPath, output);
            console.log(`Successfully generated simulated metrics for ${metrics.length} data products.`);
            console.log(`Output saved to: ${outputPath}`);
        } else {
            console.log(YAML.stringify(metrics));
        }
        
    } catch (err) {
        console.error(`Error processing registry: ${err.message}`);
        process.exit(1);
    }
};

// Detect if run directly from Node
if (typeof process !== 'undefined' && process.argv && process.argv[1] && (process.argv[1].endsWith('ObsSimulation.js') || process.argv[1].endsWith('ObsSimulation.jsx'))) {
    runCli();
}
