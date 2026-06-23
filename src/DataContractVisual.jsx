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
    const [copied, setCopied] = React.useState(false);
    const [copiedRoleIndex, setCopiedRoleIndex] = React.useState(null);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyRole = (role, idx) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(String(role));
            setCopiedRoleIndex(idx);
            setTimeout(() => setCopiedRoleIndex(null), 2000);
        }
    };

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



    return (
        <div ref={containerRef} style={{ padding: '24px', fontFamily: 'var(--font-family, inherit)', color: 'var(--m3-on-surface)' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                {data.name && (
                    <h2 style={{
                        fontFamily: 'var(--font-family-heading, inherit)',
                        fontSize: '24px',
                        fontWeight: '400',
                        margin: '0 0 16px 0',
                        color: 'var(--m3-on-surface)',
                        letterSpacing: '0px'
                    }}>
                        {data.name}
                    </h2>
                )}
                <div className="custom-card" style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '12px 24px'
                }}>
                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--m3-on-surface)' }}>{data.id}</span>
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

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>Status</span>
                    <span>
                        <span className="custom-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
                            {data.status}
                        </span>
                    </span>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>Version</span>
                    <span style={{ fontWeight: '500' }}>{data.version}</span>

                    <span style={{ color: 'var(--m3-on-surface-variant)', fontWeight: '600' }}>API</span>
                    <span style={{ fontWeight: '500' }}>{data.apiVersion}</span>
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
                    <h3 className="custom-card-title">Servers</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {data.servers.map((server, idx) => (
                            <div key={idx} className="custom-card" style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '16px',
                                padding: '16px'
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
                                            style={{ width: '24px', height: '24px', objectFit: 'contain', filter: 'var(--node-icon-filter, none)' }}
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
                                                <span className="custom-chip" style={{
                                                    padding: '2px 8px',
                                                    fontSize: '11px'
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
                    <h3 className="custom-card-title">Roles</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {data.roles.map((roleObj, idx) => (
                            <div key={idx} className="custom-card" style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                padding: '16px'
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
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--m3-on-surface)', marginBottom: '4px', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <span>{roleObj.role || `Role ${idx + 1}`}</span>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleCopyRole(roleObj.role || `Role ${idx + 1}`, idx)}
                                            title="Copy role to clipboard"
                                            style={{
                                                padding: '4px',
                                                color: copiedRoleIndex === idx ? '#10b981' : 'var(--m3-on-surface-variant)',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = copiedRoleIndex === idx ? '#10b981' : 'var(--m3-primary)'}
                                            onMouseLeave={e => e.currentTarget.style.color = copiedRoleIndex === idx ? '#10b981' : 'var(--m3-on-surface-variant)'}
                                        >
                                            {copiedRoleIndex === idx ? (
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
                <h3 className="custom-card-title">
                    Schema Elements
                </h3>

                {schema.map((table, tIdx) => (
                    <div key={tIdx} id={`table-${table.physicalName || table.name}`} style={{
                        marginBottom: '32px'
                    }}>
                        <div style={{
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontWeight: '700', fontSize: '15px', color: 'var(--side-panel-text, #111111)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                {(() => {
                                    const tableTech = table.customProperties?.find(p => p.property === 'technology')?.value;
                                    const techIcon = tableTech && config?.iconMap?.[tableTech] ? normalizePath(config.iconMap[tableTech]) : null;
                                    return techIcon ? (
                                        <img src={techIcon} alt={tableTech} style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'var(--node-icon-filter, none)' }} />
                                    ) : null;
                                })()}
                                <span>{table.physicalName || table.name}</span>
                            </h4>
                            {table.description && (
                                <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--side-panel-text, #111111)', opacity: 0.8, lineHeight: '1.4' }}>
                                    {table.description}
                                </div>
                            )}
                        </div>

                        <div className="custom-table-container" style={{ overflowX: 'auto' }}>
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Logical</th>
                                        <th>Physical</th>
                                        <th>Examples</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.properties && table.properties.map((col, cIdx) => (
                                        <tr key={cIdx}>
                                            <td style={{ fontWeight: '500', fontFamily: 'monospace' }}>
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
                                            <td>{col.logicalType}</td>
                                            <td style={{ fontSize: '13px' }}>{col.physicalType}</td>
                                            <td style={{
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
