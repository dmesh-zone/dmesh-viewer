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
                    fontSize: '24px',
                    fontWeight: 'bold',
                    margin: '0 0 16px 0',
                    color: 'var(--m3-on-surface)',
                    letterSpacing: '0px'
                }}>
                    Data Usage Agreement
                </h2>
                <div className="custom-card" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <span className="custom-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
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
                <div className="custom-card" style={{ position: 'relative' }}>
                    <h3 className="custom-card-title">
                        Provider
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>Team</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--m3-on-surface)', fontSize: '14px' }}>{provider.teamId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>Data Product</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--m3-on-surface)', fontFamily: 'monospace', fontSize: '14px' }}>{provider.dataProductId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>Output Port</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--m3-primary)', fontFamily: 'monospace', fontSize: '14px' }}>{provider.outputPortId}</span>
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
                <div className="custom-card">
                    <h3 className="custom-card-title">
                        Consumer
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>Team</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--m3-on-surface)', fontSize: '14px' }}>{consumer.teamId || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--m3-on-surface-variant)', fontSize: '14px' }}>Data Product</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--m3-on-surface)', fontFamily: 'monospace', fontSize: '14px' }}>{consumer.dataProductId}</span>
                        </div>
                    </div>
                </div>

                {/* Custom Properties */}
                {hasCustomProperties && (
                    <div className="custom-card" style={{ marginTop: '16px' }}>
                        <h3 className="custom-card-title">
                            Custom Properties
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {Object.entries(custom).map(([key, value]) => (
                                <div key={key} className="custom-card custom-card-small">
                                    <div className="custom-card-subtitle" style={{ marginBottom: '4px' }}>
                                        {formatKey(key)}
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 'normal',
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
