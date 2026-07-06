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
import InfoIcon from '@mui/icons-material/InfoOutlined';

export default memo(({ data, isConnectable }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isInfoHovered, setIsInfoHovered] = React.useState(false);
    const [isFlipped, setIsFlipped] = React.useState(false);
    const tooltipRef = React.useRef(null);
    const { observeMode, compactMode, healthStatus, pips, isSelected, activeDimension } = data;

    React.useEffect(() => {
        if (isInfoHovered && tooltipRef.current && tooltipRef.current.parentElement) {
            const nodeRect = tooltipRef.current.parentElement.getBoundingClientRect();
            if (window.innerWidth - nodeRect.right < 310) {
                setIsFlipped(true);
            } else {
                setIsFlipped(false);
            }
        }
    }, [isInfoHovered]);

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

    const nodeBorderColor = observeMode ? getHealthColor(healthStatus) : (isSelected ? '#3b82f6' : 'var(--m3-outline-variant, #e5e7eb)');
    const nodeBg = observeMode ? getHealthBg(healthStatus) : (data.backgroundColor || 'var(--m3-surface, white)');
    const nodeTextColor = observeMode ? '#f8fafc' : 'var(--m3-on-surface, #1f2937)';
    const nodeSubtitleColor = observeMode ? '#94a3b8' : 'var(--m3-on-surface-variant, #6b7280)';

    if (compactMode) {
        return (
            <div 
                className="nodrag health-transition"
                onClick={(e) => {
                    e.stopPropagation();
                    if (data.observeMode && data.metrics) {
                        const event = new CustomEvent('open-side-panel', {
                            detail: {
                                id: data.id,
                                type: 'observability',
                                content: data.metrics,
                                width: 'auto'
                            }
                        });
                        window.dispatchEvent(event);
                    } else {
                        const event = new CustomEvent('navigate-to-node', {
                            detail: { id: data.id, kind: 'DataProduct' }
                        });
                        window.dispatchEvent(event);
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
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
                onDoubleClick={(e) => {
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
                style={{
                    border: `2px solid ${nodeBorderColor}`,
                    borderRadius: '8px',
                    background: nodeBg,
                    boxShadow: observeMode 
                        ? `0 0 10px ${nodeBorderColor}33, var(--m3-elevation-1)` 
                        : (isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.4), var(--m3-elevation-1)' : 'var(--m3-elevation-1)'),
                    padding: '8px 12px',
                    fontFamily: 'var(--font-family, inherit)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    width: '320px',
                    position: 'relative'
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setIsInfoHovered(false);
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    isConnectable={isConnectable}
                    style={{ background: nodeBorderColor, border: '2px solid white', width: '8px', height: '8px' }}
                />
                
                <div style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: observeMode ? 'rgba(255,255,255,0.05)' : 'var(--node-icon-bg, transparent)',
                    borderRadius: '4px'
                }}>
                    <img src={data.icon} alt="icon" style={{ width: '20px', height: '20px', filter: 'var(--node-icon-filter, none)' }} />
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden'
                }}>
                    <div 
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: nodeTextColor,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flexShrink: 1
                        }}
                    >
                        {data.label}
                    </div>
                    {data.subtitle && (
                        <div className="custom-chip" style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            background: observeMode ? 'rgba(255,255,255,0.1)' : undefined,
                            color: observeMode ? '#94a3b8' : undefined,
                            borderColor: observeMode ? 'rgba(255,255,255,0.2)' : undefined,
                        }}>
                            {data.subtitle}
                        </div>
                    )}
                </div>

                {isHovered && (
                    <InfoIcon 
                        style={{
                            fontSize: '18px',
                            color: observeMode ? '#94a3b8' : 'var(--m3-on-surface-variant, #6b7280)',
                            cursor: 'pointer',
                            opacity: isInfoHovered ? 1 : 0.6,
                            transition: 'opacity 0.2s',
                            zIndex: 10,
                            flexShrink: 0
                        }}
                        onMouseEnter={() => setIsInfoHovered(true)}
                        onMouseLeave={() => setIsInfoHovered(false)}
                    />
                )}

                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                    style={{ background: nodeBorderColor, border: '2px solid white', width: '8px', height: '8px' }}
                />

                {isInfoHovered && (
                    <div 
                        ref={tooltipRef}
                        style={{
                        position: 'absolute',
                        top: '50%',
                        ...(isFlipped ? {
                            right: '100%',
                            marginRight: '12px',
                        } : {
                            left: '100%',
                            marginLeft: '12px',
                        }),
                        transform: 'translateY(-50%)',
                        background: '#121212',
                        color: '#ffffff',
                        padding: '12px 16px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '400',
                        zIndex: 1000,
                        boxShadow: 'var(--m3-elevation-3, 0 4px 6px rgba(0, 0, 0, 0.3))',
                        whiteSpace: 'pre-wrap',
                        width: 'max-content',
                        maxWidth: '280px',
                        pointerEvents: 'none',
                        lineHeight: '1.4'
                    }}>
                        <div style={{
                            position: 'absolute',
                            ...(isFlipped ? {
                                right: '-6px',
                            } : {
                                left: '-6px',
                            }),
                            top: '50%',
                            transform: 'translateY(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            background: '#121212',
                            zIndex: -1
                        }} />
                        <div style={{ fontWeight: '500', marginBottom: data.description ? '4px' : '0' }}>{data.label}</div>
                        {data.description && <div style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{data.description}</div>}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className="health-transition"
            style={{
                border: `2px solid ${nodeBorderColor}`,
                borderRadius: '8px',
                background: nodeBg,
                boxShadow: observeMode 
                    ? `0 0 20px ${nodeBorderColor}33, var(--m3-elevation-2)` 
                    : (isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.4), var(--m3-elevation-2)' : 'var(--m3-elevation-1)'),
                width: '320px',
                minHeight: '100px',
                height: 'auto',
                fontFamily: 'var(--font-family, inherit)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <div style={{
                background: observeMode ? 'rgba(255, 255, 255, 0.05)' : (data.bannerColor || '#BFDBFE'),
                padding: '8px 12px',
                borderBottom: `1px solid ${observeMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`,
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    color: observeMode ? getHealthColor(healthStatus) : 'var(--m3-on-surface, #1e3a8a)'
                }}>
                    {observeMode ? healthStatus?.toUpperCase() : data.banner}
                </span>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {observeMode && pips && (
                        <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                            {Object.keys(pips).map((dim) => (
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
                        className="nodrag custom-chip custom-chip-interactive"
                        style={{
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            ...(observeMode ? {
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                color: '#f8fafc'
                            } : {})
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
                    background: observeMode ? 'rgba(255,255,255,0.05)' : 'var(--node-icon-bg, transparent)',
                    borderRadius: '8px'
                }}>
                    <img
                        src={data.icon}
                        alt="icon"
                        style={{ width: '28px', height: '28px', filter: 'var(--node-icon-filter, none)' }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: data.description ? '2px' : '4px'
                    }}>
                        <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: nodeTextColor,
                            lineHeight: '1.2',
                            wordBreak: 'break-word',
                        }}>
                            {data.label}
                        </div>
                        {!observeMode && data.hasOutputPorts && (
                            <div
                                className="nodrag custom-chip custom-chip-interactive"
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
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
                    {data.description && (
                        <div style={{
                            fontSize: '11px',
                            color: nodeSubtitleColor,
                            lineHeight: '1.2',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            marginBottom: '4px'
                        }}>
                            {data.description}
                        </div>
                    )}

                    {data.subtitle && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            gap: '8px'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                color: nodeSubtitleColor,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {data.subtitle}
                            </div>
                        </div>
                    )}
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
