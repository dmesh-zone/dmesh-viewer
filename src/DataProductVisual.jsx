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

export default function DataProductVisual({ data, registry = [] }) {
    // data is the full YAML object for the Data Product

    const [copied, setCopied] = React.useState(false);
    const [copiedPropIndex, setCopiedPropIndex] = React.useState(null);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyProp = (val, idx) => {
        if (navigator.clipboard) {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            navigator.clipboard.writeText(strVal);
            setCopiedPropIndex(idx);
            setTimeout(() => setCopiedPropIndex(null), 2000);
        }
    };

    const [copiedAgreementKey, setCopiedAgreementKey] = React.useState(null);

    const handleCopyAgreement = (val, key) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(String(val));
            setCopiedAgreementKey(key);
            setTimeout(() => setCopiedAgreementKey(null), 2000);
        }
    };

    const renderCellWithCopy = (val, key, displayNode = null) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ wordBreak: 'break-all' }}>{displayNode || val}</span>
            <button
                className="btn btn-ghost"
                onClick={(e) => { e.stopPropagation(); handleCopyAgreement(val, key); }}
                title="Copy value to clipboard"
                style={{
                    padding: '4px',
                    color: copiedAgreementKey === key ? '#10b981' : 'var(--m3-on-surface-variant)',
                    flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = copiedAgreementKey === key ? '#10b981' : 'var(--m3-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = copiedAgreementKey === key ? '#10b981' : 'var(--m3-on-surface-variant)'}
            >
                {copiedAgreementKey === key ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                )}
            </button>
        </div>
    );

    const safeRender = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
    };

    const properties = data?.customProperties || [];
    const outputPortsRaw = Array.isArray(data?.outputPorts) ? data.outputPorts : [];
    
    // Transform new portAdapterX: True back to portAdapter: x format for display purposes
    const outputPorts = outputPortsRaw.map(port => {
        if (!port.customProperties) return port;
        const newProps = [];
        port.customProperties.forEach(p => {
            if (p.property && p.property.startsWith('portAdapter') && p.property !== 'portAdapter') {
                const adapterValue = p.property.replace('portAdapter', '').toLowerCase();
                if (String(p.value).toLowerCase() === 'true') {
                    newProps.push({ property: 'portAdapter', value: adapterValue });
                } else {
                    newProps.push(p);
                }
            } else {
                newProps.push(p);
            }
        });
        return { ...port, customProperties: newProps };
    });
    
    const businessName = properties.find(p => p.property === 'dataProductBusinessName')?.value;

    const formatLabel = (str) => {
        if (!str) return '';
        const s = String(str);
        const spaced = s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        return spaced.length > 0 ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : '';
    };

    const allPortCustomKeys = Array.from(new Set(
        outputPorts.flatMap(port => (port?.customProperties || []).map(p => p.property))
    ));

    return (
        <div style={{ padding: '24px', fontFamily: 'var(--font-family, inherit)', color: 'var(--m3-on-surface)' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                    fontFamily: 'var(--font-family-heading, inherit)',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    margin: '0 0 16px 0',
                    color: 'var(--m3-on-surface)',
                    letterSpacing: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span>{safeRender(businessName || data.name)}</span>
                    <button
                        className="btn btn-ghost"
                        onClick={(e) => { e.stopPropagation(); handleCopyAgreement(safeRender(businessName || data.name), 'dp-name'); }}
                        title="Copy name to clipboard"
                        style={{
                            padding: '4px',
                            color: copiedAgreementKey === 'dp-name' ? '#10b981' : 'var(--m3-on-surface-variant)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = copiedAgreementKey === 'dp-name' ? '#10b981' : 'var(--m3-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = copiedAgreementKey === 'dp-name' ? '#10b981' : 'var(--m3-on-surface-variant)'}
                    >
                        {copiedAgreementKey === 'dp-name' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        )}
                    </button>
                </h2>
                {data.description && (
                    <div style={{ marginBottom: '24px', color: 'var(--m3-on-surface-variant)', fontSize: '15px', lineHeight: '1.5' }}>
                        {typeof data.description === 'string' ? data.description : (data.description.purpose || '')}
                    </div>
                )}
                <div className="custom-card" style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '12px 24px'
                }}>
                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--m3-on-surface)' }}>{safeRender(data.id)}</span>
                        <button
                            className="btn btn-ghost"
                            onClick={handleCopy}
                            title="Copy ID to clipboard"
                            style={{
                                padding: '4px',
                                color: copied ? '#10b981' : 'var(--m3-on-surface-variant)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = copied ? '#10b981' : 'var(--m3-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = copied ? '#10b981' : 'var(--m3-on-surface-variant)'}
                        >
                            {copied ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            )}
                        </button>
                    </div>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>Domain</span>
                    <span>
                        <span className="custom-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
                            {safeRender(data.domain)}
                        </span>
                    </span>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>Status</span>
                    <span>
                        <span className="custom-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
                            {safeRender(data.status)}
                        </span>
                    </span>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>Version</span>
                    <span style={{ fontWeight: '500' }}>{safeRender(data.apiVersion)}</span>
                </div>
            </div>

            {/* Custom Properties */}
            {properties.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 className="custom-card-title">
                        Custom Properties
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                        {properties.filter(p => !p.property.toLowerCase().includes('datausageagreement')).map((prop, idx) => (
                            <div key={idx} className="custom-card custom-card-small">
                                <div className="custom-card-subtitle" style={{ marginBottom: '6px' }}>
                                    {formatLabel(prop.property)}
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--m3-on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <span style={{ wordBreak: 'break-all' }}>
                                        {typeof prop.value === 'object' ? JSON.stringify(prop.value) : prop.value}
                                    </span>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handleCopyProp(prop.value, idx)}
                                        title="Copy value to clipboard"
                                        style={{
                                            padding: '4px',
                                            color: copiedPropIndex === idx ? '#10b981' : 'var(--m3-on-surface-variant)',
                                            flexShrink: 0
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = copiedPropIndex === idx ? '#10b981' : 'var(--m3-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.color = copiedPropIndex === idx ? '#10b981' : 'var(--m3-on-surface-variant)'}
                                    >
                                        {copiedPropIndex === idx ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Usage Agreements Section */}
            {properties.some(p => p.property.toLowerCase().includes('datausageagreement')) && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 className="custom-card-title">
                        Data Usage Agreements
                    </h3>
                    <div className="custom-table-container" style={{ overflowX: 'auto' }}>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Domain</th>
                                    <th>Tier</th>
                                    <th>Name</th>
                                    <th>Consumer ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {properties
                                    .filter(p => p.property.toLowerCase().includes('datausageagreement'))
                                    .flatMap(p => Array.isArray(p.value) ? p.value : [p.value])
                                    .map((agreement, idx, arr) => {
                                        const rawConsumerId = agreement?.consumer?.dataProductId || agreement?.consumer?.id || agreement?.id || agreement?.consumerId || agreement?.consumerDataProductId || '-';
                                        
                                        let consumerDomain = '-';
                                        let consumerTier = '-';
                                        let consumerName = agreement?.consumer?.name || agreement?.name || agreement?.consumerName || agreement?.consumerDataProductName || '-';
                                        const consumerId = rawConsumerId;
                                        
                                        if (rawConsumerId !== '-' && registry) {
                                            const consumerNode = registry.find(n => n.id === rawConsumerId);
                                            if (consumerNode) {
                                                consumerDomain = consumerNode.domain || '-';
                                                
                                                const consumerProps = consumerNode.customProperties || [];
                                                const bpName = consumerProps.find(p => p.property === 'dataProductBusinessName')?.value;
                                                if (bpName) {
                                                    consumerName = bpName;
                                                } else if (consumerNode.name) {
                                                    consumerName = consumerNode.name;
                                                }
                                                
                                                const tierProp = consumerProps.find(p => p.property === 'dataProductTier')?.value;
                                                if (tierProp) {
                                                    consumerTier = tierProp;
                                                }
                                            }
                                        }

                                        return (
                                            <tr key={idx}>
                                                <td>{renderCellWithCopy(String(consumerDomain), `${idx}-domain`)}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{renderCellWithCopy(String(consumerTier), `${idx}-tier`)}</td>
                                                <td style={{ fontWeight: '500' }}>{renderCellWithCopy(String(consumerName), `${idx}-name`)}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{renderCellWithCopy(String(consumerId).split(':').pop(), `${idx}-id`)}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Output Ports */}
            {outputPorts.length > 0 && (
                <div>
                    <h3 className="custom-card-title">
                        Output Ports
                    </h3>
                    <div className="custom-table-container" style={{ overflowX: 'auto' }}>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Version</th>
                                    <th>Contract</th>
                                    {allPortCustomKeys.map(key => (
                                        <th key={key}>
                                            {formatLabel(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {outputPorts.map((port, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: '500' }}>
                                            {renderCellWithCopy(String(port.name || ''), `port-${idx}-name`)}
                                        </td>
                                        <td>{safeRender(port.version)}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {port.contractId ? renderCellWithCopy(
                                                String(port.contractId).split(':').pop(),
                                                `port-${idx}-contract`
                                            ) : '-'}
                                        </td>
                                        {allPortCustomKeys.map(key => {
                                            const values = (port.customProperties || [])
                                                .filter(p => p.property === key)
                                                .map(p => p.value);
                                            return (
                                                <td key={key}>
                                                    {values.length > 0 ? values.map(v => safeRender(v)).join(', ') : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
