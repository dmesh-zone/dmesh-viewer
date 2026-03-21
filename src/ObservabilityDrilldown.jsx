import React from 'react';
import InteractiveYaml from './InteractiveYaml';

const MetricCard = ({ title, status, value, unit, detail, icon }) => {
    const getStatusColor = (s) => {
        switch (s) {
            case 'healthy': return 'var(--health-healthy)';
            case 'degraded': return 'var(--health-degraded)';
            case 'critical': return 'var(--health-critical)';
            default: return 'var(--health-unknown)';
        }
    };

    return (
        <div style={{
            background: 'var(--m3-surface)',
            border: `1px solid var(--m3-outline-variant)`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: 'var(--m3-elevation-1)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: getStatusColor(status)
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{icon}</span>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--m3-on-surface)' }}>{title}</h4>
                </div>
                <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: `${getStatusColor(status)}22`,
                    color: getStatusColor(status),
                    textTransform: 'uppercase'
                }}>
                    {status}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '4px' }}>
                {Array.isArray(value) ? value.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--m3-on-surface)' }}>{v}</span>
                        <span style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)' }}>{unit[i]}</span>
                    </div>
                )) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--m3-on-surface)' }}>{value}</span>
                        <span style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)' }}>{unit}</span>
                    </div>
                )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)', lineHeight: '1.4' }}>
                {detail}
            </div>
        </div>
    );
};

const formatDuration = (seconds) => {
    if (seconds == null) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
};

const formatRecords = (count) => {
    if (count == null) return null;
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'k';
    if (count < 1000000000) return (count / 1000000).toFixed(1) + 'M';
    return (count / 1000000000).toFixed(1) + 'B';
};

const formatTimeAgo = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString();
};

const ObservabilityDrilldown = ({ metrics, filterText, activeTab, availableDimensions = [], config }) => {

    if (!metrics) return <div style={{ padding: '20px', color: 'var(--m3-on-surface-variant)' }}>No observability data available.</div>;

    const getCardStatus = (dim) => {
        const dimsConfig = config?.observability?.dimensions;
        if (!dimsConfig || !dimsConfig[dim]) return 'unknown';

        const healthCheckName = dimsConfig[dim].healthCheck;
        if (!healthCheckName) return 'unknown';

        const checkResult = metrics.results?.find(r => r.name === healthCheckName && r.type === 'check');
        if (!checkResult) return 'unknown';

        if (checkResult.status === 'pass') return 'healthy';
        if (checkResult.status === 'fail') {
             if (checkResult.severity === 'critical') return 'critical';
             return 'degraded';
        }
        return 'unknown';
    };

    const renderCard = (dim) => {
        const dimConfig = config?.observability?.dimensions?.[dim];
        if (!dimConfig) return null;

        const results = metrics.results || [];
        const status = getCardStatus(dim);
        
        // keyResult logic
        let keyValue = 'N/A';
        let keyUnit = '';
        if (dimConfig.keyResult) {
            const keyMetric = results.find(r => r.name === dimConfig.keyResult.metric);
            if (keyMetric && keyMetric.measure) {
                keyValue = keyMetric.measure.value != null ? keyMetric.measure.value : 'N/A';
                
                // Format large numbers or dates
                if (typeof keyValue === 'number' && keyValue >= 1000) {
                    keyValue = formatRecords(keyValue);
                } else if (typeof keyValue === 'string' && keyValue.includes('T') && keyValue.endsWith('Z')) {
                    keyValue = formatTimeAgo(keyValue);
                }

                if (typeof keyValue === 'string') {
                    if (dimConfig.keyResult.case === 'upper') keyValue = keyValue.toUpperCase();
                    else if (dimConfig.keyResult.case === 'lower') keyValue = keyValue.toLowerCase();
                }

                keyUnit = keyMetric.measure.unit || dimConfig.keyResult.name;
            } else {
                keyUnit = dimConfig.keyResult.name;
            }
        }

        // secondaryMetrics mapping
        const details = (
            <>
                {dimConfig.secondaryMetrics?.map((sm, i) => {
                    const smMetric = results.find(r => r.name === sm.metric);
                    if (!smMetric || !smMetric.measure || smMetric.measure.value == null) return null;
                    
                    let val = smMetric.measure.value;
                    let unit = smMetric.measure.unit || '';

                    // Some generic formatting heuristics
                    if (sm.name.toLowerCase().includes('duration') && (unit === 'seconds' || unit === 's')) {
                        val = formatDuration(val);
                        unit = '';
                    } else if (typeof val === 'number') {
                        if (val >= 10000) val = formatRecords(val);
                        else val = Math.round(val * 100) / 100; // max 2 decimals
                    }

                    if (typeof val === 'string') {
                        if (sm.case === 'upper') val = val.toUpperCase();
                        else if (sm.case === 'lower') val = val.toLowerCase();
                    }

                    return (
                        <div key={i} style={{ marginTop: '4px' }}>
                            {sm.name}: <span style={{ fontWeight: 'bold' }}>{val} {unit}</span>
                        </div>
                    );
                })}
            </>
        );

        return (
             <MetricCard
                 key={dim}
                 title={dim}
                 status={status}
                 value={keyValue}
                 unit={keyUnit}
                 detail={details}
                 icon={dimConfig.icon || '▸'}
             />
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'yaml' ? '0' : '16px' }}>
                {activeTab === 'metrics' ? (
                    <div>
                        {availableDimensions.filter(d => d !== 'Any').map(dim => renderCard(dim))}
                    </div>
                ) : activeTab === 'events' ? (
                    <div style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>
                         <div style={{ padding: '20px' }}>Events not supported yet inside configuration.</div>
                    </div>
                ) : (
                    <InteractiveYaml data={metrics} filterText={filterText} />
                )}
            </div>
        </div>
    );
};

export default ObservabilityDrilldown;
