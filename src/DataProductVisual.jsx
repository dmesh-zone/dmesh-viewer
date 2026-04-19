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

export default function DataProductVisual({ data }) {
    // data is the full YAML object for the Data Product

    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const safeRender = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
    };

    const properties = data?.customProperties || [];
    const outputPorts = Array.isArray(data?.outputPorts) ? data.outputPorts : [];

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
        <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'var(--m3-on-surface)' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: '400',
                    margin: '0 0 16px 0',
                    color: 'var(--m3-on-surface)',
                    letterSpacing: '0px'
                }}>
                    {safeRender(data.name)}
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '12px 24px',
                    fontSize: '14px',
                    background: 'var(--m3-surface-variant)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid var(--m3-outline-variant)'
                }}>
                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--m3-on-surface)' }}>{safeRender(data.id)}</span>
                        <button
                            onClick={handleCopy}
                            title="Copy ID to clipboard"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: copied ? '#10b981' : 'var(--m3-on-surface-variant)',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease',
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
                    <span>{safeRender(data.domain)}</span>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>Status</span>
                    <span>
                        <span style={{
                            background: data.status === 'active' ? '#c2efd3' : 'var(--m3-primary-container)',
                            color: data.status === 'active' ? '#064e3b' : 'var(--m3-on-primary-container)',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            letterSpacing: '0.5px'
                        }}>
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
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'var(--m3-primary)',
                        marginBottom: '16px',
                        textTransform: 'none',
                        letterSpacing: '1px'
                    }}>
                        Extended Properties
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                        {properties.map((prop, idx) => (
                            <div key={idx} style={{
                                background: 'transparent',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--m3-outline-variant)',
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--m3-on-surface-variant)', marginBottom: '6px', textTransform: 'none', fontWeight: 'bold' }}>
                                    {formatLabel(prop.property)}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--m3-on-surface)' }}>
                                    {typeof prop.value === 'object' ? JSON.stringify(prop.value) : prop.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Output Ports */}
            {outputPorts.length > 0 && (
                <div>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'var(--m3-primary)',
                        marginBottom: '16px',
                        textTransform: 'none',
                        letterSpacing: '1px'
                    }}>
                        Output Ports
                    </h3>
                    <div style={{
                        border: '1px solid var(--m3-outline-variant)',
                        borderRadius: '16px',
                        overflowX: 'auto',
                        background: 'var(--m3-surface)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--m3-surface-variant)', borderBottom: '1px solid var(--m3-outline-variant)' }}>
                                <tr>
                                    <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Name</th>
                                    <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Version</th>
                                    <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Contract</th>
                                    {allPortCustomKeys.map(key => (
                                        <th key={key} style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>
                                            {formatLabel(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {outputPorts.map((port, idx) => (
                                    <tr key={idx} style={{
                                        borderBottom: idx < outputPorts.length - 1 ? '1px solid var(--m3-outline-variant)' : 'none',
                                        transition: 'background 0.2s ease'
                                    }}>
                                        <td style={{ padding: '14px 20px', color: 'var(--m3-on-surface)', fontWeight: '500' }}>{safeRender(port.name)}</td>
                                        <td style={{ padding: '14px 20px', color: 'var(--m3-on-surface-variant)' }}>v{safeRender(port.version)}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                background: 'var(--m3-primary-container)',
                                                color: 'var(--m3-on-primary-container)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {port.contractId ? String(port.contractId).split(':').pop() : '-'}
                                            </span>
                                        </td>
                                        {allPortCustomKeys.map(key => {
                                            const values = (port.customProperties || [])
                                                .filter(p => p.property === key)
                                                .map(p => p.value);
                                            return (
                                                <td key={key} style={{ padding: '14px 20px', color: 'var(--m3-on-surface-variant)' }}>
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
