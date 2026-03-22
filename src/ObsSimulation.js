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
        mtbf = getRandomInt(1, 4);
        mttr = getRandomInt(121, 360); 
    } else if (isDegraded) {
        mtbf = getRandomInt(1, 4);
        mttr = getRandomInt(121, 360);
    }

    const lastRunState = isCritical ? 'failed' : 'success';
    const failureReason = isCritical ? 'Spark executor Out of Memory error' : undefined;

    return [
        createMetric('dpPipelineLastRanAt', new Date().toISOString()),
        createMetric('dpPipelineRunDuration', isCritical ? null : getRandomInt(60, 3600), 'seconds'),
        createMetric('dpPipelineRecordsProcessed', isCritical ? null : getRandomInt(1000, 100000)),
        createCheck('dpPipelineLastRunStateCheck', isCritical ? 'fail' : 'pass', isCritical ? 'critical' : 'warning', lastRunState, null, { validValues: ['success'] }, failureReason),
        createCheck('dpPipelineMeanTimeBetweenFailuresCheck', (isCritical || isDegraded) ? 'fail' : 'pass', 'warning', mtbf, 'days', { mustBeGreaterThan: 5 }),
        createCheck('dpPipelineMeanTimeToRecoveryCheck', (isCritical || isDegraded) ? 'fail' : 'pass', 'warning', parseFloat(mttr.toFixed(1)), 'minutes', { mustBeLessThan: 120 })
    ];
};

export const generateConsumptionMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';

    let val = getRandomInt(80, 100);
    if (isCritical) {
        val = getRandomInt(0, 49);
    } else if (isDegraded) {
        val = getRandomInt(0, 49);
    }

    return [
        createMetric('dpConsumerQueryCount', getRandomInt(100, 5000)),
        createMetric('dpOutputPortDistinctConsumers', getRandomInt(1, 15)),
        createCheck('dpOutputPortsResponseTimeCheck', val > 50 ? 'pass' : 'fail', isCritical ? 'critical' : 'warning', val, 'percent', { mustBeGreaterThan: 50 })
    ];
};

export const generateFreshnessMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';
    
    const maxAllowed = 60;
    let lag = getRandomInt(5, 45);
    
    if (isCritical) {
        lag = getRandomInt(100, 400);
    } else if (isDegraded) {
        lag = getRandomInt(61, 99);
    }
    
    return [
        createMetric('dpDataLatencyMaximum', lag, 'minutes'),
        createCheck('dpDataLatencyCheck', (!isCritical && !isDegraded) ? 'pass' : 'fail', isCritical ? 'critical' : 'warning', lag, 'minutes', { mustBeLessThan: maxAllowed })
    ];
};

export const generateQualityMetrics = (statusOverride) => {
    const status = statusOverride || getRandomStatus();
    const isCritical = status === 'critical';
    const isDegraded = status === 'degraded';
    
    const totalRules = 10;
    let passed = 10;
    
    if (isCritical) {
        passed = getRandomInt(0, 5);
    } else if (isDegraded) {
        passed = getRandomInt(6, 9);
    }
    
    const score = (passed / totalRules) * 100;
    const failed = totalRules - passed;

    return [
        createCheck('dpDataQualityRulesPassCheck', failed === 0 ? 'pass' : 'fail', isCritical ? 'critical' : 'warning', score, 'percent', { mustBe: 100 }),
        createMetric('dcDataQualityRuleCount', totalRules),
        createMetric('dpDataQualityRuleFailCount', failed)
    ];
};

export const simulateRegistryMetrics = (dataMeshOperationalData, dimensions = [], configObs = null) => {
    if (!dataMeshOperationalData) return [];
    
    const dimsToGen = dimensions.length > 0 ? dimensions : ['Pipeline', 'Quality', 'Freshness', 'Consumption'];

    const targetDPs = dataMeshOperationalData.filter(item => {
        if (item.kind !== 'DataProduct') return false;
        const tier = item.customProperties?.find(p => p.property === 'dataProductTier')?.value;
        if (tier === 'dataSource' || tier === 'application') return false;
        return true;
    });

    const total = targetDPs.length;
    let numCrit = Math.round(total * 0.1);
    let numDeg  = Math.round(total * 0.2);
    // Adjust boundaries to guarantee remainder equates natively mapped gracefully to Healthy
    if (numCrit + numDeg > total) numDeg = total - numCrit;
    
    // Build deterministic distribution pool
    const statuses = [];
    for (let i = 0; i < numCrit; i++) statuses.push('critical');
    for (let i = 0; i < numDeg; i++) statuses.push('degraded');
    while (statuses.length < total) statuses.push('healthy');
    
    // Shuffle the statuses deterministically
    for (let i = statuses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
    }

    return targetDPs.map((dp, index) => {
        const overallStatus = statuses[index];
        
        const worstDimIndex = Math.floor(Math.random() * dimsToGen.length);
        
        let results = [];
        dimsToGen.forEach((dim, dimIndex) => {
            const healthCheck = configObs?.dimensions?.[dim]?.healthCheck || dim;

            let dimStatus = 'healthy';
            if (dimIndex === worstDimIndex) {
                dimStatus = overallStatus;
            } else {
                const r = Math.random();
                if (overallStatus === 'critical') {
                    if (r < 0.1) dimStatus = 'critical';
                    else if (r < 0.3) dimStatus = 'degraded';
                } else if (overallStatus === 'degraded') {
                    if (r < 0.2) dimStatus = 'degraded';
                }
            }

            if (healthCheck.includes('pipeline') || healthCheck.includes('Pipeline')) results.push(...generatePipelineMetrics(dimStatus));
            else if (healthCheck.includes('ResponseTime') || healthCheck.includes('Consumption')) results.push(...generateConsumptionMetrics(dimStatus));
            else if (healthCheck.includes('Latency') || healthCheck.includes('Freshness') || healthCheck.includes('Sla')) results.push(...generateFreshnessMetrics(dimStatus));
            else if (healthCheck.includes('Quality') || healthCheck.includes('Rule')) results.push(...generateQualityMetrics(dimStatus));
            else {
                const dStr = dim.toLowerCase();
                if (dStr.includes('pipe')) results.push(...generatePipelineMetrics(dimStatus));
                else if (dStr.includes('consum') || dStr.includes('usage')) results.push(...generateConsumptionMetrics(dimStatus));
                else if (dStr.includes('fresh') || dStr.includes('latenc')) results.push(...generateFreshnessMetrics(dimStatus));
                else if (dStr.includes('qual')) results.push(...generateQualityMetrics(dimStatus));
            }
        });
        
        return {
            kind: 'DataProductObservability',
            schemaVersion: '0.1.0',
            id: dp.id,
            observedAt: new Date().toISOString(),
            period: 'P1D',
            health: overallStatus,
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
