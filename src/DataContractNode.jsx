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

// Icons
const TableIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#64748b' }}>
        <path d="M3 3h18v18H3zM3 9h18M9 21V9" />
    </svg>
);

const KeyIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', color: '#fbbf24' }}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

export default memo(({ data, isConnectable }) => {
    if (!data) return <div>No data</div>;
    // Ensure description is a string or handle object safely
    const description = typeof data.description === 'object' ? (data.description.purpose || JSON.stringify(data.description)) : data.description;

    // Calculate dynamic width based on column names and types
    const columns = data.schema?.[0]?.properties || data.schema?.[0]?.columns || [];
    const maxColNameLen = columns.reduce((max, col) => Math.max(max, (col.physicalName || col.name || "").length), 0);
    const maxTypeLen = columns.reduce((max, col) => Math.max(max, (col.logicalType || "").length), 0);

    // Heuristic: ~8px per character + some padding
    const dynamicWidth = Math.min(600, Math.max(260, (maxColNameLen + maxTypeLen) * 8 + 80));

    // Calculate DQ count (column-level + table-level)
    const columnDqCount = data.schema?.[0]?.properties?.reduce((acc, col) => acc + (col.quality?.length || 0), 0) || 0;
    const tableDqCount = data.schema?.[0]?.quality?.length || 0;
    const dqCount = columnDqCount + tableDqCount;

    // Helper to estimate panel width
    const getEstimatedWidth = (colCount, min = 400) => {
        const width = Math.min(1400, Math.max(min, (colCount * 150) + 50));
        return width;
    };

    return (
        <div style={{
            background: 'var(--m3-surface, white)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            width: `${dynamicWidth}px`,
            overflow: 'hidden',
            fontFamily: 'var(--font-family, inherit)',
        }}>

            {/* Header */}
            <div style={{
                padding: '12px 16px',
                background: 'var(--m3-surface-variant, #f8fafc)',
                borderBottom: '1px solid var(--m3-outline-variant, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--m3-on-surface, #1e293b)',
                position: 'relative' // For absolute positioning if needed
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: description ? '4px' : '0' }}>
                        {data.icon ? (
                            <img
                                src={data.icon}
                                alt="icon"
                                style={{ width: '20px', height: '20px', marginRight: '8px', objectFit: 'contain', filter: 'var(--node-icon-filter, none)' }}
                            />
                        ) : (
                            <TableIcon />
                        )}
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{data.label}</span>
                    </div>
                    {description && (
                        <span style={{
                            fontSize: '10px',
                            color: 'var(--m3-outline, #64748b)',
                            lineHeight: '1.4',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere'
                        }}>
                            {description}
                        </span>
                    )}
                </div>
            </div>

            {/* Schema Columns */}
            <div style={{ padding: '0' }}>
                {data.schema && Array.isArray(data.schema) ? (
                    data.schema.map((table, tableIndex) => (
                        <div key={tableIndex}>
                            {/* Show table name if multiple tables exist or just for clarity */}
                            {(table.columns || table.properties) && (table.columns || table.properties).map((col, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 16px',
                                    borderBottom: '1px solid var(--m3-surface-variant, #f1f5f9)',
                                    fontSize: '12px',
                                    position: 'relative'
                                }}>
                                    {/* Handles for relationship connections */}
                                    <Handle
                                        type="source"
                                        position={Position.Right}
                                        id={`${col.physicalName || col.name}-source`}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            width: '1px',
                                            height: '1px',
                                            right: '0',
                                            top: '50%'
                                        }}
                                    />
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id={`${col.physicalName || col.name}-target`}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            width: '1px',
                                            height: '1px',
                                            left: '0',
                                            top: '50%'
                                        }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--m3-on-surface, #334155)', fontWeight: '500' }}>{col.physicalName || col.name}</span>
                                        {/* Show primary key icon with position superscript */}
                                        {col.primaryKey && (
                                            <span style={{ display: 'inline-flex', alignItems: 'flex-start', marginLeft: '6px' }}>
                                                <KeyIcon />
                                                {col.primaryKeyPosition > 0 && (
                                                    <sup style={{
                                                        fontSize: '8px',
                                                        color: '#fbbf24',
                                                        fontWeight: 'bold',
                                                        marginLeft: '1px'
                                                    }}>
                                                        {col.primaryKeyPosition}
                                                    </sup>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--m3-outline, #94a3b8)', fontFamily: 'monospace' }}>{col.logicalType}</span>
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '12px 16px', color: 'var(--m3-outline, #94a3b8)', fontSize: '12px', fontStyle: 'italic' }}>
                        No schema defined
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: '12px',
                background: 'var(--m3-surface-variant, #f8fafc)',
                borderTop: '1px solid var(--m3-outline-variant, #e2e8f0)',
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: 'auto',
                flexWrap: 'wrap'
            }}>

                {/* Table Documents Pills */}
                {data.schema && data.schema.map((table, i) => (
                    <div
                        key={`table-pill-${i}`}
                        style={{
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px'
                        }}
                        className="custom-chip custom-chip-interactive"
                        onClick={(e) => {
                            e.stopPropagation();
                            const event = new CustomEvent('open-side-panel', {
                                detail: {
                                    id: data.id,
                                    type: 'data-contract-yaml',
                                    content: data.originalData || data,
                                    activeTable: table.physicalName || table.name
                                }
                            });
                            window.dispatchEvent(event);
                        }}
                        title={`View ${table.physicalName || table.name} Schema`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                ))}

                {(dqCount > 0) && (
                    <div
                        style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        className="custom-chip custom-chip-interactive"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Dispatch event to open side panel with DQ content
                            // Use a wide fixed width for DQ as it has many columns (Field, ID, Rule, Severity, etc.)
                            // and needs significant space to avoid horizontal scrolling.
                            const estimatedWidth = 1300;

                            const event = new CustomEvent('open-side-panel', {
                                detail: {
                                    id: data.id,
                                    type: 'dq',
                                    content: data.schema[0], // Pass full schema object to include table-level quality
                                    width: estimatedWidth
                                }
                            });
                            window.dispatchEvent(event);
                        }}
                    >
                        DQ
                    </div>
                )}

                <div
                    style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    className="custom-chip custom-chip-interactive"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Dispatch event to open side panel with Examples content
                        const colCount = data.schema?.[0]?.properties?.length || 0;
                        // Reduce multiplier to 150px per column to avoid excessive whitespace
                        const estimatedWidth = getEstimatedWidth(colCount, 400);

                        const event = new CustomEvent('open-side-panel', {
                            detail: {
                                type: 'examples',
                                content: data.schema?.[0]?.properties || [],
                                width: estimatedWidth
                            }
                        });
                        window.dispatchEvent(event);
                    }}
                >
                    Examples
                </div>
            </div>
        </div>
    );
});
