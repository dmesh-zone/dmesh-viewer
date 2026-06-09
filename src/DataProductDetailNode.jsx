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
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            width: 'auto',
            minWidth: '280px',
            maxWidth: '500px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: data.bannerColor || '#BFDBFE',
                padding: '8px 12px',
                borderBottom: '1px solid #e5e7eb',
                borderTopLeftRadius: '7px',
                borderTopRightRadius: '7px',
                fontSize: '10px',
                fontWeight: '500',
                letterSpacing: '0.5px',
                color: '#1e3a8a',
                textTransform: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>{data.banner}</span>
                <div
                    className="nodrag yaml-pill"
                    style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        borderRadius: '4px',
                        padding: '4px',
                        cursor: 'pointer',
                        color: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        marginLeft: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
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

                    <img
                        src={data.icon}
                        alt="icon"
                        style={{ width: '40px', height: '40px', marginRight: '16px' }}
                    />

                    <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', lineHeight: '1.2' }}>
                            {data.label}
                        </div>
                        {data.subtitle && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
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
                    <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {data.outputPorts.map((port, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 0',
                                    borderBottom: '1px solid #f9fafb'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {port.icon && (
                                            <img src={port.icon} alt="tech" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151', fontFamily: 'Inter, sans-serif', marginRight: '8px' }}>
                                                {port.name}
                                            </span>
                                            {port.version && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#6b7280',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    padding: '0 6px',
                                                    background: 'white'
                                                }}>
                                                    {port.version}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {port.contractId && (
                                        <div
                                            className="nodrag data-contract-pill"
                                            style={{
                                                fontSize: '10px',
                                                color: '#059669',
                                                background: '#ecfdf5',
                                                padding: '1px 6px',
                                                borderRadius: '12px',
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
