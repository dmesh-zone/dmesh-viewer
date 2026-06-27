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
    return (
        <div style={{
            border: '1px solid var(--m3-outline-variant, #e5e7eb)',
            borderRadius: '8px',
            background: 'var(--m3-surface, white)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            width: '320px',
            fontFamily: 'var(--font-family, inherit)'
        }}>
            <div style={{
                background: data.bannerColor || '#BFDBFE',
                padding: '8px 12px',
                borderBottom: '1px solid var(--m3-outline-variant, #e5e7eb)',
                borderTopLeftRadius: '7px',
                borderTopRightRadius: '7px',
                fontSize: '10px',
                fontWeight: '500',
                letterSpacing: '0.5px',
                color: 'var(--m3-on-surface, #1e3a8a)',
                textTransform: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>{data.banner}</span>
                <div
                    className="nodrag custom-chip custom-chip-interactive"
                    style={{
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        marginLeft: '8px'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Use originalData if available, otherwise fallback to data
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
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <Handle
                        type="target"
                        position={Position.Left}
                        isConnectable={isConnectable}
                        style={{ top: '24px', background: '#9ca3af' }}
                    />

                    <div style={{
                        width: '48px',
                        height: '48px',
                        marginRight: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--node-icon-bg, transparent)',
                        borderRadius: '8px',
                        flexShrink: 0
                    }}>
                        <img
                            src={data.icon}
                            alt="icon"
                            style={{ width: '40px', height: '40px', filter: 'var(--node-icon-filter, none)' }}
                        />
                    </div>

                    <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--m3-on-surface, #1f2937)', lineHeight: '1.2', wordBreak: 'break-word' }}>
                            {data.label}
                        </div>
                        {data.description && (
                            <div style={{ fontSize: '13px', color: 'var(--m3-on-surface-variant, #4b5563)', marginTop: '6px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                {data.description}
                            </div>
                        )}
                        {data.subtitle && (
                            <div style={{ fontSize: '12px', color: 'var(--m3-outline, #6b7280)', marginTop: '4px' }}>
                                {data.subtitle}
                            </div>
                        )}
                    </div>

                    <Handle
                        type="source"
                        position={Position.Right}
                        isConnectable={isConnectable}
                        style={{ top: '24px', background: '#9ca3af' }}
                    />
                </div>

                {data.outputPorts && data.outputPorts.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--m3-outline-variant, #f3f4f6)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {data.outputPorts.map((port, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 0',
                                    borderBottom: '1px solid var(--m3-surface-variant, #f9fafb)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {port.icon && (
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                marginRight: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--node-icon-bg, transparent)',
                                                borderRadius: '4px',
                                                flexShrink: 0
                                            }}>
                                                <img src={port.icon} alt="tech" style={{ width: '20px', height: '20px', filter: 'var(--node-icon-filter, none)' }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--m3-on-surface, #374151)', fontFamily: 'var(--font-family, inherit)', marginRight: '8px' }}>
                                                {port.name}
                                            </span>
                                            {port.version && (
                                                <span className="custom-chip" style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    fontWeight: '500'
                                                }}>
                                                    {port.version}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {port.contractId && (
                                        <div
                                            className="nodrag custom-chip custom-chip-interactive"
                                            style={{
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const event = new CustomEvent('navigate-to-node', {
                                                    detail: { id: port.contractId, kind: 'DataContract' }
                                                });
                                                window.dispatchEvent(event);
                                            }}
                                        >
                                            Data Contract
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
