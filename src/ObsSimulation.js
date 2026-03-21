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

const STATUS_DISTRIBUTION = {
    healthy: 0.7,
    degraded: 0.2,
    critical: 0.1
};

const getRandomStatus = () => {
    const r = Math.random();
    if (r < STATUS_DISTRIBUTION.healthy) return 'healthy';
    if (r < STATUS_DISTRIBUTION.healthy + STATUS_DISTRIBUTION.degraded) return 'degraded';
    return 'critical';
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const createMetric = (name, value, unit) => {
    const measure = { value };
    if (unit) measure.unit = unit;
    return { name, type: 'metric', measure };
};

const createCheck = (name, status, severity, value, unit, threshold, message) => {
    const measure = { value };
    if (unit) measure.unit = unit;
    const check = {
        name,
        type: 'check',
        status,
        severity,
        threshold,
        measure
    };
    if (message) check.message = message;
    return check;
};

export const generatePipelineMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';
    
    let mtbf = getRandomInt(15, 30);
    let mttr = Math.random() * 90; 

    if (isCritical) {
        mtbf = getRandomInt(1, 6);
        mttr = getRandomInt(361, 720); 
    } else if (isDegraded) {
        mtbf = getRandomInt(7, 14);
        mttr = getRandomInt(121, 360);
    }

    const lastRunState = isCritical ? 'failed' : 'success';
    const failureReason = isCritical ? 'Upstream source connection timed out.' : undefined;

    return [
        createMetric('pipelineLastRanAt', new Date().toISOString()),
        createMetric('pipelineDuration', isCritical ? null : getRandomInt(60, 3600), 'seconds'),
        createMetric('pipelineRecordsProcessed', isCritical ? null : getRandomInt(100, 10000000)),
        createMetric('pipelineLastRunState', lastRunState),
        createCheck('pipelineLastRunStateCheck', isCritical ? 'fail' : 'pass', isCritical ? 'critical' : 'warning', lastRunState, null, { validValues: ['success'] }, failureReason),
        createCheck('pipelineMeanTimeBetweenFailuresCheck', isDegraded ? 'fail' : 'pass', 'warning', mtbf, 'days', { mustBeGreaterThan: 5 }),
        createCheck('pipelineMeanTimeToRecoveryCheck', isDegraded ? 'fail' : 'pass', 'warning', parseFloat(mttr.toFixed(1)), 'minutes', { mustBeLessThan: 120 })
    ];
};

export const generateConsumptionMetrics = () => {
    const objectiveMs = 10000;
    const met = Math.random() >= 0.4;
    
    let actualP95Ms;
    if (met) {
        actualP95Ms = getRandomInt(2000, 10000);
    } else {
        actualP95Ms = getRandomInt(10001, 20000);
    }
    
    return [
        createMetric('productConsumerQueryCount', getRandomInt(100, 5000)),
        createMetric('outputPortDistinctConsumers', getRandomInt(1, 15)),
        createCheck('productOutputPortsResponseTimeCheck', met ? 'pass' : 'fail', 'warning', actualP95Ms, 'ms', { mustBeLessThan: objectiveMs }, `Objective: ${objectiveMs}ms`)
    ];
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
    
    return [
        createMetric('productDataLatencyMaximumAcrossAllContracts', lag, 'minutes'),
        createCheck('productDataLatencyBeyondSlaCheck', (!isCritical && !isDegraded) ? 'pass' : 'fail', isCritical ? 'critical' : 'warning', lag, 'minutes', { mustBeLessThan: maxAllowed })
    ];
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
    const failed = totalRules - passed;

    return [
        createMetric('contractDataQualityRuleCount', passed),
        createMetric('contractDataQualityRuleFailCount', failed),
        createMetric('contractDataQualityScore', score, 'percent'),
        createCheck('productDataQualityRulesFailCheck', failed === 0 ? 'pass' : 'fail', isCritical ? 'critical' : 'warning', failed, null, { mustBe: 0 })
    ];
};

export const simulateRegistryMetrics = (dataMeshRegistry, dimensions = [], configObs = null) => {
    if (!dataMeshRegistry) return [];
    
    const dimsToGen = dimensions.length > 0 ? dimensions : ['Pipeline', 'Quality', 'Freshness', 'Consumption'];

    return dataMeshRegistry
        .filter(item => {
            if (item.kind !== 'DataProduct') return false;
            const tier = item.customProperties?.find(p => p.property === 'dataProductTier')?.value;
            if (tier === 'dataSource' || tier === 'application') return false;
            return true;
        })
        .map(dp => {
            const status = getRandomStatus();
            
            let results = [];
            dimsToGen.forEach(dim => {
                const healthCheck = configObs?.dimensions?.[dim]?.healthCheck || dim;

                if (healthCheck.includes('pipeline') || healthCheck.includes('Pipeline')) results.push(...generatePipelineMetrics(status));
                else if (healthCheck.includes('ResponseTime') || healthCheck.includes('Consumption')) results.push(...generateConsumptionMetrics(status));
                else if (healthCheck.includes('Latency') || healthCheck.includes('Freshness') || healthCheck.includes('Sla')) results.push(...generateFreshnessMetrics(status));
                else if (healthCheck.includes('Quality') || healthCheck.includes('Rule')) results.push(...generateQualityMetrics(status));
                else {
                    const dStr = dim.toLowerCase();
                    if (dStr.includes('pipe')) results.push(...generatePipelineMetrics(status));
                    else if (dStr.includes('consum') || dStr.includes('usage')) results.push(...generateConsumptionMetrics(status));
                    else if (dStr.includes('fresh') || dStr.includes('latenc')) results.push(...generateFreshnessMetrics(status));
                    else if (dStr.includes('qual')) results.push(...generateQualityMetrics(status));
                }
            });
            
            return {
                kind: 'DataProductObservability',
                schemaVersion: '0.1.0',
                id: dp.id,
                observedAt: new Date().toISOString(),
                period: 'P1D',
                health: status,
                source: { process: 'simulator' },
                results
            };
        });
};

const runCli = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const YAML = await import('yaml');
    
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node ObsSimulation.js <path-to-registry.yaml>');
        return process.exit(1);
    }
    
    const registryPath = path.resolve(args[0]);
    if (!fs.existsSync(registryPath)) {
        console.error(`Error: File not found`);
        return process.exit(1);
    }

    let configObs = null;
    const configPath = path.resolve('public/config.yaml');
    if (fs.existsSync(configPath)) {
         configObs = YAML.parse(fs.readFileSync(configPath, 'utf8'))?.observability;
    }
    
    let dimensions = ['Pipeline', 'Quality', 'Freshness', 'Consumption'];
    if (configObs && configObs.dimensions) {
        dimensions = Object.keys(configObs.dimensions);
    }

    const fileContent = fs.readFileSync(registryPath, 'utf8');
    const registry = YAML.parse(fileContent);
    const metrics = simulateRegistryMetrics(registry, dimensions, configObs);
    
    if (Array.isArray(registry)) {
        const updated = [...registry, ...metrics];
        fs.writeFileSync(registryPath.replace('.yaml', '-with-sim-metrics.yaml'), YAML.stringify(updated));
    }
};

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('ObsSimulation.js')) {
    runCli();
}
