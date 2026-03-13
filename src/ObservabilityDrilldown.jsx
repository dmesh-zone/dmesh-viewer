import React from 'react';

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

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--m3-on-surface)' }}>{value}</span>
                <span style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)' }}>{unit}</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)', lineHeight: '1.4' }}>
                {detail}
            </div>
        </div>
    );
};

const ObservabilityDrilldown = ({ metrics }) => {
    const [activeTab, setActiveTab] = React.useState('metrics');

    if (!metrics) return <div style={{ padding: '20px', color: 'var(--m3-on-surface-variant)' }}>No observability data available.</div>;

    // Helper to determine status for cards
    const getCardStatus = (dim) => {
        // This is a simplified version of the logic in Flow.jsx
        // In a real app, this should probably come from props or a shared utility
        if (dim === 'SLO') {
            if (metrics.slo?.uptime?.met === false || metrics.slo?.qualityScore?.met === false) return 'critical';
            return 'healthy';
        }
        if (dim === 'Freshness') {
            if (metrics.dynamic?.freshness?.lagMinutes > 120) return 'critical';
            if (metrics.dynamic?.freshness?.withinExpectation === false) return 'degraded';
            return 'healthy';
        }
        if (dim === 'Quality') {
            if (metrics.dynamic?.quality?.rulesFailed > 0) return 'critical';
            return 'healthy';
        }
        if (dim === 'Pipeline') {
            if (metrics.physical?.pipeline?.status === 'failed') return 'critical';
            if (metrics.physical?.pipeline?.status === 'running') return 'healthy';
            return 'unknown';
        }
        return 'unknown';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs */}
            <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid var(--m3-outline-variant)',
                padding: '0 16px'
            }}>
                {['metrics', 'events'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--m3-primary)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {activeTab === 'metrics' ? (
                    <div>
                        <MetricCard 
                            title="Service Level Objectives" 
                            status={getCardStatus('SLO')}
                            value={metrics.slo?.uptime?.value || 'N/A'}
                            unit="%"
                            detail={`Target: ${metrics.slo?.uptime?.target}%. Freshness: ${metrics.slo?.freshness?.met ? 'Met' : 'Missed'}.`}
                            icon="◈"
                        />
                        <MetricCard 
                            title="Data Freshness" 
                            status={getCardStatus('Freshness')}
                            value={metrics.dynamic?.freshness?.lagMinutes || 0}
                            unit="min lag"
                            detail={`Max Allowed: ${metrics.dynamic?.freshness?.maxAllowedLagMinutes}m. ${metrics.dynamic?.freshness?.withinExpectation ? 'Within expectations.' : 'Outside expectations.'}`}
                            icon="⧗"
                        />
                        <MetricCard 
                            title="Data Quality" 
                            status={getCardStatus('Quality')}
                            value={metrics.dynamic?.quality?.rulesPassed || 0}
                            unit={`/ ${ (metrics.dynamic?.quality?.rulesPassed || 0) + (metrics.dynamic?.quality?.rulesFailed || 0) } tests`}
                            detail={`Score: ${metrics.dynamic?.quality?.score}%. Failed: ${metrics.dynamic?.quality?.rulesFailed}.`}
                            icon="✦"
                        />
                        <MetricCard 
                            title="Pipeline Status" 
                            status={getCardStatus('Pipeline')}
                            value={metrics.physical?.pipeline?.status?.toUpperCase() || 'UNKNOWN'}
                            unit=""
                            detail={`Last run: ${new Date(metrics.asOf).toLocaleString()}. Next scheduled: ${metrics.physical?.pipeline?.nextRun || 'N/A'}.`}
                            icon="▸"
                        />
                    </div>
                ) : (
                    <div style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                            <strong>Pipeline Succeeded</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Today at 10:00 AM</div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                            <strong>SLO Breach: Uptime dropped</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Yesterday at 11:30 PM</div>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <strong>Quality Warning: Null values detected</strong>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>2 days ago</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ObservabilityDrilldown;
