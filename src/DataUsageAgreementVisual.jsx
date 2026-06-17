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

export default function DataUsageAgreementVisual({ data }) {
    // data is the full YAML object for the Data Usage Agreement

    const info = data.info || {};
    const provider = data.provider || {};
    const consumer = data.consumer || {};
    const custom = data.custom || {};

    const formatKey = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1') // insert a space before all caps
            .replace(/^./, (str) => str.toUpperCase()) // capitalize the first letter
            .trim();
    };

    const hasCustomProperties = Object.keys(custom).length > 0;

    return (
        <div style={{ padding: '24px', fontFamily: 'var(--font-family, inherit)', color: 'var(--m3-on-surface)' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                    fontSize: '22px',
                    fontWeight: '400',
                    margin: '0 0 16px 0',
                    color: 'var(--m3-on-surface)',
                    letterSpacing: '0px'
                }}>
                    Data Usage Agreement
                </h2>
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '14px',
                    alignItems: 'center',
                    marginBottom: '16px',
                    background: 'var(--m3-surface-variant)',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--m3-outline-variant)'
                }}>
                    <span style={{
                        background: info.status === 'approved' ? '#c2efd3' : '#f9dada',
                        color: info.status === 'approved' ? '#064e3b' : '#7f1d1d',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        fontSize: '12px',
                        letterSpacing: '0.5px'
                    }}>
                        {info.status}
                    </span>
                    <span style={{ color: 'var(--m3-on-surface-variant)' }}>Start Date: <strong style={{ color: 'var(--m3-on-surface)' }}>{info.startDate}</strong></span>
                </div>
                {info.purpose && (
                    <div style={{
                        fontSize: '15px',
                        color: 'var(--m3-on-surface-variant)',
                        fontStyle: 'italic',
                        lineHeight: '1.5'
                    }}>
                        "{info.purpose}"
                    </div>
                )}
            </div>

            {/* Provider -> Consumer Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Provider Card */}
                <div style={{
                    border: '1px solid var(--m3-outline-variant)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: 'var(--m3-surface)',
                    position: 'relative'
                }}>
                    <h3 style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--m3-primary)',
                        marginBottom: '16px',
                        textTransform: 'none',
                        letterSpacing: '1px'
                    }}>
                        Provider
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)' }}>Team</span>
                            <span style={{ fontWeight: '600', color: 'var(--m3-on-surface)' }}>{provider.teamId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)' }}>Data Product</span>
                            <span style={{ fontWeight: '600', color: 'var(--m3-on-surface)', fontFamily: 'monospace' }}>{provider.dataProductId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)' }}>Output Port</span>
                            <span style={{ fontWeight: '600', color: 'var(--m3-primary)', fontFamily: 'monospace' }}>{provider.outputPortId}</span>
                        </div>
                    </div>
                </div>

                {/* Arrow Indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--m3-outline)', padding: '8px 0' }}>
                    <div style={{
                        background: 'var(--m3-surface-variant)',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                    </div>
                </div>

                {/* Consumer Card */}
                <div style={{
                    border: '1px solid var(--m3-outline-variant)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: 'var(--m3-surface)'
                }}>
                    <h3 style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--m3-primary)',
                        marginBottom: '16px',
                        textTransform: 'none',
                        letterSpacing: '1px'
                    }}>
                        Consumer
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)' }}>Team</span>
                            <span style={{ fontWeight: '600', color: 'var(--m3-on-surface)' }}>{consumer.teamId || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)' }}>Data Product</span>
                            <span style={{ fontWeight: '600', color: 'var(--m3-on-surface)', fontFamily: 'monospace' }}>{consumer.dataProductId}</span>
                        </div>
                    </div>
                </div>

                {/* Custom Properties */}
                {hasCustomProperties && (
                    <div style={{
                        marginTop: '16px',
                        border: '1px solid var(--m3-outline-variant)',
                        borderRadius: '16px',
                        padding: '24px',
                        background: 'var(--m3-surface)'
                    }}>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: 'var(--m3-primary)',
                            marginBottom: '16px',
                            textTransform: 'none',
                            letterSpacing: '1px'
                        }}>
                            Custom Properties
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {Object.entries(custom).map(([key, value]) => (
                                <div key={key} style={{
                                    border: '1px solid var(--m3-outline-variant)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    background: 'var(--m3-surface-variant)'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: 'var(--m3-on-surface-variant)',
                                        marginBottom: '4px'
                                    }}>
                                        {formatKey(key)}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: 'var(--m3-on-surface)'
                                    }}>
                                        {String(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
