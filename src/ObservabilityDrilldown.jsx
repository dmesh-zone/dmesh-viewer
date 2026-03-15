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

const ObservabilityDrilldown = ({ metrics, filterText, activeTab, availableDimensions = ['Pipeline', 'Consumption', 'Freshness', 'Quality'], showEventsTab = false }) => {

    if (!metrics) return <div style={{ padding: '20px', color: 'var(--m3-on-surface-variant)' }}>No observability data available.</div>;

    // Helper to determine status for cards
    const getCardStatus = (dim) => {
        if (dim === 'Consumption') {
            if (metrics.dynamic?.responseTime?.met == null) return 'unknown';

            if (metrics.dynamic?.responseTime?.met === false) {
                if (metrics.dynamic.responseTime?.actualP95Ms > 2 * metrics.dynamic.responseTime?.objectiveMs) return 'critical';
                return 'degraded';
            }

            return 'healthy';
        }
        if (dim === 'Freshness') {
            const lag = metrics.dynamic?.freshness?.lagMinutes;
            const max = metrics.dynamic?.freshness?.maxAllowedLagMinutes;
            if (lag != null && max != null && lag > 2 * max) return 'critical';
            if (metrics.dynamic?.freshness?.withinExpectation === false) return 'degraded';
            return 'healthy';
        }
        if (dim === 'Quality') {
            const failed = metrics.dynamic?.quality?.rulesFailed || 0;
            if (failed > 1) return 'critical';
            if (failed === 1) return 'degraded';
            return 'healthy';
        }
        if (dim === 'Pipeline') {
            if (metrics.physical?.pipeline?.status === 'failed') return 'critical';
            return 'healthy';
        }
        return 'unknown';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'yaml' ? '0' : '16px' }}>
                {activeTab === 'metrics' ? (
                    <div>
                        {availableDimensions.includes('Pipeline') && (
                            <MetricCard
                                title="Pipeline Status"
                                status={getCardStatus('Pipeline')}
                                value={metrics.physical?.pipeline?.status?.toUpperCase() || 'UNKNOWN'}
                                unit=""
                                detail={(() => {
                                    const lastRunStr = `Last run: ${new Date(metrics.asOf).toLocaleString()}`;
                                    if (getCardStatus('Pipeline') === 'critical') {
                                        return (
                                            <>
                                                <div>{lastRunStr}</div>
                                                {metrics.physical?.pipeline?.errorMessage && <div style={{ color: 'var(--health-critical)', marginTop: '4px' }}>Failure reason: {metrics.physical.pipeline.errorMessage}</div>}
                                            </>
                                        );
                                    } else if (getCardStatus('Pipeline') === 'healthy') {
                                        const durationStr = formatDuration(metrics.physical?.pipeline?.durationSeconds);
                                        const recordsStr = formatRecords(metrics.physical?.pipeline?.recordsProcessed);
                                        return (
                                            <>
                                                <div>{lastRunStr}</div>
                                                {durationStr && <div>Duration: {durationStr}</div>}
                                                {recordsStr && <div>Records processed: {recordsStr}</div>}
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <div>{lastRunStr}</div>
                                            {metrics.physical?.pipeline?.nextRun && <div>Next: {metrics.physical.pipeline.nextRun}</div>}
                                        </>
                                    );
                                })()}

                                icon="▸"
                            />
                        )}
                        {availableDimensions.includes('Consumption') && (() => {
                            const actualMs = metrics.dynamic?.responseTime?.actualP95Ms;
                            const objMs = metrics.dynamic?.responseTime?.objectiveMs;
                            const isSec = objMs != null && objMs > 1000;
                            
                            const displayValue = actualMs != null 
                                ? (isSec ? Number((actualMs / 1000).toFixed(1)) : actualMs)
                                : 'N/A';
                            const displayUnit = isSec ? "s Response time (p95)" : "ms Response time (p95)";
                            const targetStr = objMs != null 
                                ? (isSec ? `${Number((objMs / 1000).toFixed(1))} s` : `${objMs} ms`)
                                : '? ms';

                            return (
                                <MetricCard
                                    title="Consumption"
                                    status={getCardStatus('Consumption')}
                                    value={displayValue}
                                    unit={displayUnit}
                                    detail={(
                                        <>
                                            <div>Target response time: {targetStr}</div>
                                            {metrics.usage && (
                                                <div>
                                                    Active consumers: {metrics.usage.activeConsumers || 0}, Query count: {metrics.usage.queryCount || 0}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    icon="◈"
                                />
                            );
                        })()}
                        {availableDimensions.includes('Freshness') && (
                            <MetricCard
                                title="Data Freshness"
                                status={getCardStatus('Freshness')}
                                value={metrics.dynamic?.freshness?.lagMinutes || 0}
                                unit="min lag"
                                detail={
                                    metrics.dynamic?.freshness?.maxAllowedLagMinutes != null
                                        ? `Max Allowed: ${metrics.dynamic.freshness.maxAllowedLagMinutes}m. ${metrics.dynamic.freshness.withinExpectation ? 'Within expectations.' : 'Outside expectations.'}`
                                        : 'Max Allowed: unknown'
                                }
                                icon="⧗"
                            />
                        )}
                        {availableDimensions.includes('Quality') && (
                            <MetricCard
                                title="Data Quality"
                                status={getCardStatus('Quality')}
                                value={metrics.dynamic?.quality?.rulesPassed || 0}
                                unit={`/ ${(metrics.dynamic?.quality?.rulesPassed || 0) + (metrics.dynamic?.quality?.rulesFailed || 0)} tests`}
                                detail={`Score: ${metrics.dynamic?.quality?.score}%. Failed: ${metrics.dynamic?.quality?.rulesFailed}.`}
                                icon="✦"
                            />
                        )}
                    </div>
                ) : activeTab === 'events' ? (
                    <div style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                            <strong>Pipeline Succeeded</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Today at 10:00 AM</div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                            <strong>Consumption Breach: Latency spiked</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Yesterday at 11:30 PM</div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <strong>Quality Warning: Null values detected</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>2 days ago</div>
                        </div>
                    </div>
                ) : (
                    <InteractiveYaml data={metrics} filterText={filterText} />
                )}
            </div>
        </div>
    );
};

export default ObservabilityDrilldown;
