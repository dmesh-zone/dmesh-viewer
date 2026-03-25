import React from 'react';
import InteractiveYaml from './InteractiveYaml';

const MetricCard = ({ title, status, value, unit, nameText, expectedText, messageText, detail, icon }) => {
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
                        <span style={{ fontSize: '24px', fontWeight: '700', color: getStatusColor(status) }}>{v}</span>
                        {unit && unit[i] && <span style={{ fontSize: '13px', color: 'var(--m3-on-surface-variant)' }}>{unit[i]}</span>}
                        {nameText && <span style={{ fontSize: '13px', color: 'var(--m3-on-surface-variant)', marginLeft: unit && unit[i] ? '0px' : '0px' }}>{nameText}</span>}
                        {expectedText && <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--m3-on-surface-variant)' }}>{expectedText}</span>}
                    </div>
                )) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: getStatusColor(status) }}>{value}</span>
                        {unit && <span style={{ fontSize: '13px', color: 'var(--m3-on-surface-variant)' }}>{unit}</span>}
                        {nameText && <span style={{ fontSize: '13px', color: 'var(--m3-on-surface-variant)', marginLeft: unit ? '0px' : '0px' }}>{nameText}</span>}
                        {expectedText && <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--m3-on-surface-variant)' }}>{expectedText}</span>}
                    </div>
                )}
            </div>

            {messageText && (
                <div style={{ fontSize: '13px', color: 'var(--health-critical)', marginBottom: '8px', fontWeight: '500' }}>
                    {messageText}
                </div>
            )}

            <div style={{ fontSize: '12px', color: 'var(--m3-on-surface-variant)', lineHeight: '1.4' }}>
                {detail}
            </div>
        </div>
    );
};

const formatThreshold = (threshold) => {
    if (!threshold) return '';
    if (threshold.mustBe !== undefined) return `(expected = ${threshold.mustBe})`;
    if (threshold.mustBeGreaterThan !== undefined) return `(expected > ${threshold.mustBeGreaterThan})`;
    if (threshold.mustBeGreaterOrEqualThan !== undefined) return `(expected >= ${threshold.mustBeGreaterOrEqualThan})`;
    if (threshold.mustBeGreaterOrEqualTo !== undefined) return `(expected >= ${threshold.mustBeGreaterOrEqualTo})`;
    if (threshold.mustBeLessThan !== undefined) return `(expected < ${threshold.mustBeLessThan})`;
    if (threshold.mustBeLessOrEqualThan !== undefined) return `(expected <= ${threshold.mustBeLessOrEqualThan})`;
    if (threshold.mustBeLessOrEqualTo !== undefined) return `(expected <= ${threshold.mustBeLessOrEqualTo})`;
    if (threshold.mustBeBetween && Array.isArray(threshold.mustBeBetween) && threshold.mustBeBetween.length === 2) {
        return `(expected between ${threshold.mustBeBetween[0]} and ${threshold.mustBeBetween[1]})`;
    }
    return '';
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
    const [activeTooltipDim, setActiveTooltipDim] = React.useState(null);
    const [activeDC, setActiveDC] = React.useState(null);

    const handleSetDim = (dim) => {
        setActiveTooltipDim(dim);
        setActiveDC(null);
    };

    if (!metrics) return <div style={{ padding: '20px', color: 'var(--m3-on-surface-variant)' }}>No observability data available.</div>;

    const getCardStatus = (dim) => {
        const dimsConfig = config?.observability?.dimensions;
        if (!dimsConfig || !dimsConfig[dim]) return 'unknown';
        const dimConfig = dimsConfig[dim];
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
    };

    const renderCard = (dim) => {
        const dimConfig = config?.observability?.dimensions?.[dim];
        if (!dimConfig) return null;

        const results = metrics.results || [];
        const status = getCardStatus(dim);
        
        // keyResult logic
        let keyValue = 'N/A';
        let keyUnit = '';
        let keyName = '';
        let keyExpected = '';
        let keyMessage = '';
        if (dimConfig.keyResult) {
            const krConfig = Array.isArray(dimConfig.keyResult) ? dimConfig.keyResult[0] : dimConfig.keyResult;
            if (krConfig) {
                const keyMetric = results.find(r => r.name === krConfig.metric);
                const hcMatch = dimConfig.healthCheck ? results.find(r => r.name === dimConfig.healthCheck && r.type === 'check') : null;
                
                if (keyMetric) {
                    let thresholdObj = keyMetric.threshold;
                    if (!thresholdObj && hcMatch && hcMatch.threshold) {
                        thresholdObj = hcMatch.threshold;
                    }
                    if (thresholdObj) {
                        keyExpected = formatThreshold(thresholdObj);
                    }
                    if (hcMatch && hcMatch.message && ['critical', 'degraded'].includes(status)) {
                        keyMessage = hcMatch.message;
                    }
                    if (keyMetric.measure) {
                    keyValue = keyMetric.measure.value != null ? keyMetric.measure.value : 'N/A';
                    
                    // Format large numbers or dates
                    if (typeof keyValue === 'number' && keyValue >= 1000) {
                        keyValue = formatRecords(keyValue);
                    } else if (typeof keyValue === 'string' && keyValue.includes('T') && keyValue.endsWith('Z')) {
                        keyValue = formatTimeAgo(keyValue);
                    }

                    if (typeof keyValue === 'string') {
                        if (krConfig.case === 'upper') keyValue = keyValue.toUpperCase();
                        else if (krConfig.case === 'lower') keyValue = keyValue.toLowerCase();
                    }

                    keyUnit = keyMetric.measure.unit || '';
                    if (keyUnit === 'percent') {
                        keyUnit = '%';
                    }
                }
                }
                keyName = krConfig.text || '';
            } else {
                keyName = krConfig.text || '';
            }
        }

        // secondaryMetrics mapping
        let dcHtml = null;
        if (dimConfig.dataContractCheck) {
            const dcChecks = results.filter(r => r.name === dimConfig.dataContractCheck && r.target && r.target.resourceType && r.target.resourceType.startsWith('DataContract'));
            if (dcChecks.length > 0) {
                dcHtml = (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '0px', flexWrap: 'wrap', position: 'relative' }}>
                        {dcChecks.map((dc, i) => {
                            let color = 'var(--m3-surface-variant)';
                            if (dc.status === 'pass') color = 'var(--health-healthy)';
                            else if (dc.status === 'fail') {
                                if (dc.severity === 'critical') color = 'var(--health-critical)';
                                else color = 'var(--health-degraded)';
                            }

                            // Extract schema name easily if available
                            let idStr = dc.target.resourceIdentifier || 'Contract';
                            const idParts = idStr.split('/');
                            const schemaName = idParts[idParts.length - 1];

                            let tooltip = schemaName;
                            if (dc.measure && dc.measure.value !== undefined) {
                                tooltip += `: ${dc.measure.value} ${dc.measure.unit || ''}`;
                            }
                            if (dc.threshold) {
                                tooltip += ` ${formatThreshold(dc.threshold)}`;
                            }

                            return (
                                <div 
                                    key={i} 
                                    title={tooltip}
                                    onClick={(e) => { e.stopPropagation(); setActiveTooltipDim(activeTooltipDim === dim ? null : dim); }}
                                    style={{ 
                                        width: '12px', 
                                        height: '12px', 
                                        backgroundColor: color, 
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        border: '1px solid var(--m3-outline)'
                                    }} 
                                />
                            );
                        })}
                    </div>
                );
            }
        }

        const details = (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '16px', rowGap: '4px', marginTop: '4px' }}>
                    {dimConfig.secondaryMetrics?.map((sm, i) => {
                        const smMetric = results.find(r => r.name === sm.metric);
                        if (!smMetric || (!smMetric.measure && smMetric.type !== 'check')) return null;
                        if (smMetric.measure && smMetric.measure.value == null) return null;
                        
                        let val = smMetric.measure?.value !== undefined ? smMetric.measure.value : '';
                        let unit = smMetric.measure?.unit || '';

                        // Some generic formatting heuristics
                        if (sm.name.toLowerCase().includes('duration') && (unit === 'seconds' || unit === 's')) {
                            val = formatDuration(val);
                            unit = '';
                        } else if (typeof val === 'number') {
                            if (val >= 10000) val = formatRecords(val);
                            else val = Math.round(val * 100) / 100; // max 2 decimals
                        }

                        if (unit === 'percent') {
                            unit = '%';
                        }

                        if (typeof val === 'string') {
                            if (sm.case === 'upper') val = val.toUpperCase();
                            else if (sm.case === 'lower') val = val.toLowerCase();
                        }

                        let valColor = 'inherit';
                        let expectedDetails = '';
                        
                        if (smMetric.type === 'check') {
                            let isMet = smMetric.status === 'pass';
                            if (smMetric.threshold && smMetric.measure && smMetric.measure.value !== undefined) {
                                 const smval = smMetric.measure.value;
                                 const th = smMetric.threshold;
                                 if (th.mustBe !== undefined) isMet = smval === th.mustBe;
                                 else if (th.mustBeGreaterThan !== undefined) isMet = smval > th.mustBeGreaterThan;
                                 else if (th.mustBeGreaterOrEqualThan !== undefined) isMet = val >= th.mustBeGreaterOrEqualThan;
                                 else if (th.mustBeGreaterOrEqualTo !== undefined) isMet = smval >= th.mustBeGreaterOrEqualTo;
                                 else if (th.mustBeLessThan !== undefined) isMet = smval < th.mustBeLessThan;
                                 else if (th.mustBeLessOrEqualThan !== undefined) isMet = smval <= th.mustBeLessOrEqualThan;
                                 else if (th.mustBeLessOrEqualTo !== undefined) isMet = smval <= th.mustBeLessOrEqualTo;
                                 else if (th.mustBeBetween && Array.isArray(th.mustBeBetween)) isMet = smval >= th.mustBeBetween[0] && smval <= th.mustBeBetween[1];
                                 else if (th.validValues && Array.isArray(th.validValues)) isMet = th.validValues.includes(smval);
                            }

                            if (isMet) {
                                valColor = 'var(--health-healthy)';
                            } else {
                                if (smMetric.severity === 'critical') valColor = 'var(--health-critical)';
                                else valColor = 'var(--health-degraded)';
                            }

                            const thresholdStr = formatThreshold(smMetric.threshold);
                            if (thresholdStr) {
                                 expectedDetails = ` ${thresholdStr}`;
                            }
                        }

                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span>{sm.name}:</span> 
                                <span style={{ fontWeight: 'bold', color: valColor }}>{val}</span>
                                {unit && <span>{unit}</span>}
                                {expectedDetails && <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--m3-on-surface-variant)' }}>{expectedDetails}</span>}
                            </div>
                        );
                    })}
                </div>
                {dcHtml}
            </div>
        );

        return (
             <MetricCard
                 key={dim}
                 title={dim}
                 status={status}
                 value={keyValue}
                 unit={keyUnit}
                 nameText={keyName}
                 expectedText={keyExpected}
                 messageText={keyMessage}
                 detail={details}
                 icon={dimConfig.icon || '▸'}
             />
        );
    };

    const renderDCMetrics = () => {
        if (!activeDC || !activeTooltipDim) return null;
        const dimConfig = config?.observability?.dimensions?.[activeTooltipDim];
        if (!dimConfig || !dimConfig.dataContractMetrics) return null;

        const results = metrics.results || [];
        const dcMetrics = dimConfig.dataContractMetrics.map(mCfg => {
            const found = results.find(r => 
                r.name === mCfg.metric && 
                r.target?.resourceIdentifier === activeDC
            );
            return {
                ...mCfg,
                result: found
            };
        });

        const activeDCName = activeDC.split('/').pop();

        return (
            <div style={{
                width: '320px',
                background: 'var(--m3-surface)',
                border: '1px solid var(--m3-outline-variant)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'var(--m3-elevation-1)',
                position: 'sticky',
                top: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--m3-on-surface)' }}>
                        Metrics: {activeDCName}
                    </h4>
                    <button 
                        onClick={() => setActiveDC(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--m3-on-surface-variant)',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dcMetrics.map((m, idx) => {
                        const val = m.result?.measure?.value;
                        const unit = m.result?.measure?.unit || '';
                        const status = m.result?.status || 'unknown';
                        
                        let color = 'var(--m3-on-surface-variant)';
                        if (status === 'pass' || status === 'healthy') color = 'var(--health-healthy)';
                        else if (status === 'fail') {
                            if (m.result?.severity === 'critical') color = 'var(--health-critical)';
                            else color = 'var(--health-degraded)';
                        }

                        return (
                            <div key={idx} style={{
                                padding: '12px',
                                background: 'var(--m3-surface-variant)',
                                borderRadius: '8px',
                                borderLeft: status !== 'unknown' ? `4px solid ${color}` : 'none'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--m3-on-surface-variant)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    {m.name}
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: status !== 'unknown' ? color : 'var(--m3-on-surface)' }}>
                                    {val !== undefined ? val : 'N/A'}
                                    <span style={{ fontSize: '12px', marginLeft: '4px', fontWeight: 'normal', color: 'var(--m3-on-surface-variant)' }}>
                                        {unit}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderActiveDataContracts = () => {
        if (!activeTooltipDim) return null;
        const dimConfig = config?.observability?.dimensions?.[activeTooltipDim];
        if (!dimConfig || !dimConfig.dataContractCheck) return null;

        const results = metrics.results || [];
        const dcChecks = results.filter(r => r.name === dimConfig.dataContractCheck && r.target && r.target.resourceType && r.target.resourceType.startsWith('DataContract'));

        if (dcChecks.length === 0) return null;

        return (
            <React.Fragment>
                <div style={{
                    width: '320px',
                    background: 'var(--m3-surface)',
                    border: '1px solid var(--m3-outline-variant)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: 'var(--m3-elevation-1)',
                    position: 'sticky',
                    top: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--m3-on-surface)' }}>
                            Data Contract Checks ({activeTooltipDim})
                        </h4>
                        <button 
                            onClick={() => handleSetDim(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--m3-on-surface-variant)',
                                padding: '4px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
                        {dcChecks.map((dc, index) => {
                            let idStr = dc.target.resourceIdentifier || 'Contract';
                            const idParts = idStr.split('/');
                            const schemaName = idParts[idParts.length - 1];

                            let color = 'var(--m3-on-surface-variant)';
                            if (dc.status === 'pass') color = 'var(--health-healthy)';
                            else if (dc.status === 'fail') {
                                if (dc.severity === 'critical') color = 'var(--health-critical)';
                                else color = 'var(--health-degraded)';
                            }

                            let expectedStr = dc.threshold ? formatThreshold(dc.threshold) : '';
                            const isSelected = activeDC === dc.target.resourceIdentifier;
                            
                            return (
                                <div 
                                    key={index} 
                                    title={expectedStr} 
                                    onClick={() => dc.target.resourceIdentifier && setActiveDC(isSelected ? null : dc.target.resourceIdentifier)}
                                    style={{
                                        padding: '6px 12px',
                                        background: isSelected ? 'var(--m3-primary-container)' : 'var(--m3-surface-variant)',
                                        borderRadius: '6px',
                                        borderLeft: `4px solid ${color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        cursor: dc.target.resourceIdentifier ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease',
                                        border: isSelected ? '1px solid var(--m3-primary)' : '1px solid transparent'
                                    }}
                                >
                                    <div style={{ fontWeight: '600', fontSize: '12px', color: isSelected ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {schemaName}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color }}>
                                            {dc.measure && dc.measure.value !== undefined ? dc.measure.value : 'N/A'}
                                            <span style={{ fontSize: '10px', marginLeft: '2px', fontWeight: 'normal', color: 'var(--m3-on-surface-variant)' }}>
                                                {dc.measure?.unit || ''}
                                            </span>
                                            {expectedStr && (
                                                <span style={{ fontSize: '10px', marginLeft: '4px', fontStyle: 'italic', fontWeight: 'normal', color: 'var(--m3-on-surface-variant)' }}>
                                                    {expectedStr.replace('expected ', '')}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color, padding: '2px 6px', background: `${color}22`, borderRadius: '4px' }}>
                                            {dc.status}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {renderDCMetrics()}
            </React.Fragment>
        );
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            minWidth: 'min-content',
            maxWidth: activeDC ? '95vw' : (activeTooltipDim && activeTab === 'metrics' ? '90vw' : '50vw'),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}>
            <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'yaml' ? '0' : '16px' }}>
                {activeTab === 'metrics' ? (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, width: 0, minWidth: '450px' }}>
                            {availableDimensions.filter(d => d !== 'Any').map(dim => renderCard(dim))}
                        </div>
                        {renderActiveDataContracts()}
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
