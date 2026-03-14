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

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    const { observeMode, healthStatus, pips, isSelected, activeDimension } = data;

    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'var(--health-healthy)';
            case 'degraded': return 'var(--health-degraded)';
            case 'critical': return 'var(--health-critical)';
            default: return 'var(--health-unknown)';
        }
    };

    const getHealthBg = (status) => {
        switch (status) {
            case 'healthy': return 'var(--health-healthy-bg)';
            case 'degraded': return 'var(--health-degraded-bg)';
            case 'critical': return 'var(--health-critical-bg)';
            default: return 'var(--health-unknown-bg)';
        }
    };

    const nodeBorderColor = observeMode ? getHealthColor(healthStatus) : (isSelected ? '#3b82f6' : '#e5e7eb');
    const nodeBg = observeMode ? getHealthBg(healthStatus) : (data.backgroundColor || 'white');
    const nodeTextColor = observeMode ? '#f8fafc' : '#1f2937';
    const nodeSubtitleColor = observeMode ? '#94a3b8' : '#6b7280';

    return (
        <div 
            className="health-transition"
            style={{
                border: `2px solid ${nodeBorderColor}`,
                borderRadius: '8px',
                background: nodeBg,
                overflow: 'hidden',
                boxShadow: observeMode 
                    ? `0 0 20px ${nodeBorderColor}33, var(--m3-elevation-2)` 
                    : (isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.4), var(--m3-elevation-2)' : 'var(--m3-elevation-1)'),
                width: '320px',
                height: '120px',
                fontFamily: 'Inter, sans-serif',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <div style={{
                background: observeMode ? 'rgba(255, 255, 255, 0.05)' : (data.bannerColor || '#BFDBFE'),
                padding: '8px 12px',
                borderBottom: `1px solid ${observeMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    color: observeMode ? getHealthColor(healthStatus) : '#1e3a8a'
                }}>
                    {observeMode ? healthStatus?.toUpperCase() : data.banner}
                </span>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {observeMode && pips && (
                        <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                            {['pipeline', 'slo', 'freshness', 'quality'].map((dim) => (
                                <div
                                    key={dim}
                                    title={dim.toUpperCase()}
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: getHealthColor(pips[dim]),
                                        opacity: !activeDimension || activeDimension === dim ? 1 : 0.3,
                                        boxShadow: (!activeDimension || activeDimension === dim) && pips[dim] !== 'healthy' && pips[dim] !== 'unknown'
                                            ? `0 0 6px ${getHealthColor(pips[dim])}`
                                            : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    <div
                        className="nodrag yaml-pill"
                        style={{
                            background: observeMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                            border: `1px solid ${observeMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)'}`,
                            borderRadius: '4px',
                            padding: '4px',
                            cursor: 'pointer',
                            color: observeMode ? '#f8fafc' : '#1e3a8a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = observeMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = observeMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)';
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const content = data.originalData || data;
                            const event = new CustomEvent('open-side-panel', {
                                detail: {
                                    id: data.id,
                                    type: 'data-product-yaml',
                                    content: content
                                }
                            });
                            window.dispatchEvent(event);
                        }}
                        title="View Source YAML"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </div>
                </div>
            </div>

            <div style={{ padding: '12px', display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                <Handle
                    type="target"
                    position={Position.Left}
                    isConnectable={isConnectable}
                    style={{ 
                        top: '50%', 
                        background: nodeBorderColor,
                        border: '2px solid white',
                        width: '8px',
                        height: '8px'
                    }}
                />

                <div style={{
                    width: '36px',
                    height: '36px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: observeMode ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderRadius: '8px'
                }}>
                    <img
                        src={data.icon}
                        alt="icon"
                        style={{ width: '28px', height: '28px' }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: nodeTextColor,
                        lineHeight: '1.2',
                        wordBreak: 'break-word',
                        marginBottom: '4px'
                    }}>
                        {data.label}
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        gap: '8px'
                    }}>
                        {data.subtitle && (
                            <div style={{
                                fontSize: '11px',
                                color: nodeSubtitleColor,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {data.subtitle}
                            </div>
                        )}
                        {!observeMode && data.hasOutputPorts && (
                            <div
                                className="nodrag output-ports-pill"
                                style={{
                                    background: '#dcfce7',
                                    color: '#166534',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    border: '1px solid #bbf7d0',
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const event = new CustomEvent('navigate-to-node', {
                                        detail: { id: data.id, kind: 'DataProduct' }
                                    });
                                    window.dispatchEvent(event);
                                }}
                            >
                                {data.outputPortCount || 0} Ports
                            </div>
                        )}
                    </div>
                </div>

                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                    style={{ 
                        top: '50%', 
                        background: nodeBorderColor,
                        border: '2px solid white',
                        width: '8px',
                        height: '8px'
                    }}
                />
            </div>
        </div>
    );
});
