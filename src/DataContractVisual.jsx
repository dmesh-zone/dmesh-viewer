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

import React, { useEffect, useRef } from 'react';

const BASE_URL = import.meta.env.BASE_URL;

const normalizePath = (path) => {
    if (!path) return path;
    if (path.startsWith('http')) return path;
    // Prefix relative paths starting with / with BASE_URL
    if (path.startsWith('/')) {
        return `${BASE_URL}${path.slice(1)}`;
    }
    return path;
};

export default function DataContractVisual({ data, anchor, filterByAnchor = false, onViewFull, config }) {
    // data is the full YAML object for the Data Contract
    const containerRef = useRef(null);

    const fullSchema = data.schema || [];
    const schema = filterByAnchor && anchor
        ? fullSchema.filter(t => (t.physicalName || t.name) === anchor)
        : fullSchema;

    // Auto-scroll to anchored table
    useEffect(() => {
        if (anchor && !filterByAnchor) {
            // Find the element with the ID matching the anchor table name
            // Use a slight delay to ensure the DOM is ready and the transition is smooth
            const timer = setTimeout(() => {
                const element = document.getElementById(`table-${anchor}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [anchor, filterByAnchor]);

    const headerLabelStyle = {
        fontSize: '12px',
        fontWeight: '700',
        color: 'var(--m3-primary)',
        marginBottom: '12px',
        textTransform: 'none',
        letterSpacing: '1px'
    };

    return (
        <div ref={containerRef} style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'var(--m3-on-surface)' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    margin: '0 0 16px 0',
                    color: 'var(--m3-on-surface)',
                    fontFamily: 'monospace',
                    letterSpacing: '0.5px'
                }}>
                    {data.id}
                </h2>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    fontSize: '14px',
                    alignItems: 'center',
                    background: 'var(--m3-surface-variant)',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--m3-outline-variant)'
                }}>
                    <span style={{
                        background: data.status === 'active' ? '#c2efd3' : 'var(--m3-primary-container)',
                        color: data.status === 'active' ? '#064e3b' : 'var(--m3-on-primary-container)',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        fontSize: '12px',
                        letterSpacing: '0.5px'
                    }}>
                        {data.status}
                    </span>
                    <span style={{ color: 'var(--m3-on-surface-variant)' }}>Version: <strong style={{ color: 'var(--m3-on-surface)' }}>{data.version}</strong></span>
                    <span style={{ color: 'var(--m3-on-surface-variant)' }}>API: <strong style={{ color: 'var(--m3-on-surface)' }}>{data.apiVersion}</strong></span>

                </div>
                {data.description && data.description.purpose && (
                    <div style={{
                        marginTop: '16px',
                        fontSize: '15px',
                        color: 'var(--m3-on-surface-variant)',
                        fontStyle: 'italic',
                        lineHeight: '1.5'
                    }}>
                        "{data.description.purpose}"
                    </div>
                )}
            </div>

            {/* Servers Section */}
            {data.servers && data.servers.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={headerLabelStyle}>Servers</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {data.servers.map((server, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '16px',
                                padding: '16px',
                                background: 'white',
                                borderRadius: '16px',
                                border: '1px solid var(--m3-outline-variant)',
                                boxShadow: 'var(--m3-elevation-1)'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: 'var(--m3-surface-variant)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {config?.iconMap?.[server.type] ? (
                                        <img
                                            src={normalizePath(config.iconMap[server.type])}
                                            alt={server.type}
                                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                                        </svg>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--m3-on-surface)', marginBottom: '4px', wordBreak: 'break-all' }}>
                                        {server.server || `Server ${idx + 1}`}
                                    </div>
                                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                            <span style={{ fontWeight: '600', minWidth: '70px' }}>Type:</span>
                                            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{server.type}</span>
                                        </div>
                                        {server.host && (
                                            <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', minWidth: '70px' }}>Host:</span>
                                                <a
                                                    href={server.host}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={server.host}
                                                    style={{ color: 'var(--m3-primary)', textDecoration: 'none', wordBreak: 'break-all' }}
                                                >
                                                    {server.host}
                                                </a>
                                            </div>
                                        )}
                                        {server.location && (
                                            <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', minWidth: '70px' }}>Location:</span>
                                                <a
                                                    href={server.location}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={server.location}
                                                    style={{ color: 'var(--m3-primary)', textDecoration: 'none', wordBreak: 'break-all' }}
                                                >
                                                    {server.location}
                                                </a>
                                            </div>
                                        )}
                                        {server.environment && (
                                            <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', minWidth: '70px' }}>Env:</span>
                                                <span style={{
                                                    background: '#e0f2fe',
                                                    color: '#0369a1',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}>{server.environment}</span>
                                            </div>
                                        )}
                                        {server.catalog && (
                                            <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', minWidth: '70px' }}>Catalog:</span>
                                                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{server.catalog}</span>
                                            </div>
                                        )}
                                        {server.schema && (
                                            <div style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: '600', minWidth: '70px' }}>Schema:</span>
                                                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{server.schema}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Roles Section */}
            {data.roles && data.roles.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={headerLabelStyle}>Roles</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {data.roles.map((roleObj, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                padding: '16px',
                                background: 'white',
                                borderRadius: '16px',
                                border: '1px solid var(--m3-outline-variant)',
                                boxShadow: 'var(--m3-elevation-1)'
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--m3-on-surface)', marginBottom: '4px', wordBreak: 'break-all' }}>
                                        {roleObj.role || `Role ${idx + 1}`}
                                    </div>
                                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {Object.entries(roleObj).map(([key, value]) => (
                                            key !== 'role' && (
                                                <div key={key} style={{ color: 'var(--m3-on-surface-variant)', display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontWeight: '600', minWidth: '60px', textTransform: 'capitalize' }}>{key}:</span>
                                                    <span style={{ wordBreak: 'break-all' }}>{String(value)}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Schema Section */}
            <div>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--m3-primary)',
                    marginBottom: '20px',
                    textTransform: 'none',
                    letterSpacing: '1px'
                }}>
                    Schema Elements
                </h3>

                {schema.map((table, tIdx) => (
                    <div key={tIdx} id={`table-${table.physicalName || table.name}`} style={{
                        marginBottom: '32px',
                        border: '1px solid var(--m3-outline-variant)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'var(--m3-surface)'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            background: 'var(--m3-surface-variant)',
                            borderBottom: '1px solid var(--m3-outline-variant)'
                        }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--m3-on-surface)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {(() => {
                                    const tableTech = table.customProperties?.find(p => p.property === 'technology')?.value;
                                    const techIcon = tableTech && config?.iconMap?.[tableTech] ? normalizePath(config.iconMap[tableTech]) : null;
                                    return techIcon ? (
                                        <img src={techIcon} alt={tableTech} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                    ) : null;
                                })()}
                                <span style={{ textTransform: 'lowercase' }}>{String(table.physicalType || 'table').toLowerCase()}</span>: <span style={{ fontFamily: 'monospace', color: 'var(--m3-primary)' }}>{table.physicalName || table.name}</span>
                            </div>
                            {table.description && (
                                <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--m3-on-surface-variant)', lineHeight: '1.4' }}>
                                    {table.description}
                                </div>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--m3-surface)', borderBottom: '1px solid var(--m3-outline-variant)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Column</th>
                                        <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Logical</th>
                                        <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Physical</th>
                                        <th style={{ padding: '12px 20px', fontWeight: '600', color: 'var(--m3-on-surface-variant)' }}>Examples</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.properties && table.properties.map((col, cIdx) => (
                                        <tr key={cIdx} style={{
                                            borderBottom: cIdx < table.properties.length - 1 ? '1px solid var(--m3-outline-variant)' : 'none',
                                            background: 'transparent'
                                        }}>
                                            <td style={{ padding: '14px 20px', fontWeight: '500', color: 'var(--m3-on-surface)', fontFamily: 'monospace' }}>
                                                {col.name}
                                                {col.primaryKey && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '10px',
                                                        color: '#92400e',
                                                        background: '#fef3c7',
                                                        padding: '2px 6px',
                                                        borderRadius: '6px',
                                                        fontWeight: '700',
                                                        border: '1px solid #fcd34d'
                                                    }}>PK</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 20px', color: 'var(--m3-on-surface)' }}>{col.logicalType}</td>
                                            <td style={{ padding: '14px 20px', color: 'var(--m3-on-surface-variant)', fontSize: '13px' }}>{col.physicalType}</td>
                                            <td style={{
                                                padding: '14px 20px',
                                                color: 'var(--m3-on-surface-variant)',
                                                fontStyle: 'italic',
                                                maxWidth: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px'
                                            }}>
                                                {col.examples ? col.examples.join(', ') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
