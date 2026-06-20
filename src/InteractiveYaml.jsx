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

import React, { useState, useMemo } from 'react';
import YAML from 'yaml';

const YamlItem = ({ label, value, level = 0, isArrayItem = false, inlineParentProps = null }) => {
    const [expanded, setExpanded] = useState(true);
    const gutter = 60; // Gutter for line numbers
    const indent = gutter + (level * 20);

    const toggleExpand = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    // Styling helpers
    const keyColor = '#0891b2'; // Cyan-700
    const stringColor = '#16a34a'; // Green-600
    const numberColor = '#d97706'; // Amber-600
    const booleanColor = '#9333ea'; // Purple-600
    const nullColor = '#94a3b8'; // Slate-400
    const wrapperStyle = { paddingLeft: `${indent}px`, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', position: 'relative' };

    // Inline Parent Indicator Helper
    const renderInlineParent = () => {
        if (!inlineParentProps) return null;
        const parentIndent = gutter + (inlineParentProps.level * 20);
        return (
            <>
                {/* Parent Arrow */}
                <span
                    onClick={inlineParentProps.toggleExpand}
                    style={{
                        position: 'absolute',
                        left: `${parentIndent - 16}px`, // Position arrow
                        top: '2px', // Fine-tune vertical align
                        fontSize: '10px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transform: inlineParentProps.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        zIndex: 2
                    }}
                >▶</span>
                {/* Parent Dash */}
                <span style={{
                    position: 'absolute',
                    left: `${parentIndent}px`, // Position dash
                    color: '#64748b',
                    top: '0px'
                }}>-</span>
            </>
        );
    };

    // Helper for primitives
    const renderPrimitive = (val) => {
        if (val === null || val === undefined) return <span style={{ color: nullColor }}>null</span>;
        if (typeof val === 'string') return <span style={{ color: stringColor }}>"{val}"</span>;
        if (typeof val === 'number') return <span style={{ color: numberColor }}>{val}</span>;
        if (typeof val === 'boolean') return <span style={{ color: booleanColor }}>{String(val)}</span>;
        return <span>{String(val)}</span>;
    };

    // NULL / UNDEFINED
    if (value === null || value === undefined) {
        return (
            <div style={wrapperStyle} className="yaml-line">
                {renderInlineParent()}
                {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
                {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
                <span style={{ color: nullColor }}>null</span>
            </div>
        );
    }

    // ARRAYS
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <div style={wrapperStyle} className="yaml-line">
                    {renderInlineParent()}
                    {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
                    {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
                    <span style={{ color: '#64748b' }}>[]</span>
                </div>
            );
        }

        return (
            <div>
                <div
                    onClick={toggleExpand}
                    className="yaml-line"
                    style={{
                        ...wrapperStyle,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    {renderInlineParent()}
                    {/* Icon */}
                    <span style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        marginRight: '6px',
                        marginLeft: isArrayItem ? '-14px' : '-16px' // pull icon left
                    }}>▶</span>

                    {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
                    {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
                    {!expanded && <span style={{ color: '#94a3b8', fontSize: '12px' }}>Array({value.length})</span>}
                </div>
                {expanded && value.map((item, index) => (
                    <YamlItem
                        key={index}
                        value={item}
                        level={level + 1}
                        isArrayItem={true}
                    />
                ))}
            </div>
        );
    }

    // OBJECTS
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return (
                <div style={wrapperStyle} className="yaml-line">
                    {renderInlineParent()}
                    {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
                    {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
                    <span style={{ color: '#64748b' }}>{ }</span>
                </div>
            );
        }

        // --- SPECIAL INLINE LOGIC FOR ARRAY ITEMS ---
        if (isArrayItem && expanded) {
            return (
                <div>
                    {entries.map(([k, v], index) => (
                        <YamlItem
                            key={k}
                            label={k}
                            value={v}
                            level={level + 1}
                            inlineParentProps={index === 0 ? {
                                toggleExpand,
                                expanded,
                                level // Pass PARENT level for dash positioning
                            } : null}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div>
                <div
                    onClick={toggleExpand}
                    className="yaml-line"
                    style={{
                        ...wrapperStyle,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    {renderInlineParent()}
                    {/* Icon */}
                    <span style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        marginRight: '6px',
                        marginLeft: isArrayItem ? '-14px' : '-16px' // pull icon left
                    }}>▶</span>

                    {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
                    {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
                    {!expanded && <span style={{ color: '#94a3b8', fontSize: '12px' }}>{'{...}'}</span>}
                </div>
                {expanded && entries.map(([k, v]) => (
                    <YamlItem
                        key={k}
                        label={k}
                        value={v}
                        level={level + 1}
                    />
                ))}
            </div>
        );
    }

    // PRIMITIVES
    return (
        <div style={wrapperStyle} className="yaml-line">
            {renderInlineParent()}
            {isArrayItem && <span style={{ color: '#64748b', marginRight: '8px' }}>-</span>}
            {label && <span style={{ color: keyColor, fontWeight: '600', marginRight: '8px' }}>{label}:</span>}
            {renderPrimitive(value)}
        </div>
    );
};

const InteractiveYaml = ({ data, filterText }) => {

    // Convert to YAML Lines if filter is present
    const filteredContent = useMemo(() => {
        if (!filterText) return null;

        const yamlString = YAML.stringify(data);
        const lines = yamlString.split('\n');
        const matches = [];

        // Find matches
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(filterText.toLowerCase())) {
                matches.push(index);
            }
        });

        if (matches.length === 0) return [];

        // Expand context (10 lines up/down)
        const ranges = [];
        matches.forEach(matchIndex => {
            ranges.push([
                Math.max(0, matchIndex - 10),
                Math.min(lines.length - 1, matchIndex + 10)
            ]);
        });

        // Merge overlapping ranges
        ranges.sort((a, b) => a[0] - b[0]);
        const mergedRanges = [];
        if (ranges.length > 0) {
            let current = ranges[0];
            for (let i = 1; i < ranges.length; i++) {
                if (current[1] >= ranges[i][0] - 1) { // Overlap or adjacent
                    current[1] = Math.max(current[1], ranges[i][1]);
                } else {
                    mergedRanges.push(current);
                    current = ranges[i];
                }
            }
            mergedRanges.push(current);
        }

        // Build result
        const result = [];
        mergedRanges.forEach((range, i) => {
            // Add top ellipsis if not first or gap exists
            if (i > 0 || range[0] > 0) {
                result.push({ type: 'ellipsis', line: '...' });
            }
            // Add lines
            for (let j = range[0]; j <= range[1]; j++) {
                result.push({
                    type: 'line',
                    number: j + 1,
                    content: lines[j],
                    highlight: lines[j].toLowerCase().includes(filterText.toLowerCase())
                });
            }
        });
        // Add bottom ellipsis if not at end
        if (mergedRanges.length > 0 && mergedRanges[mergedRanges.length - 1][1] < lines.length - 1) {
            result.push({ type: 'ellipsis', line: '...' });
        }

        return result;

    }, [data, filterText]);


    if (filterText && filteredContent) {
        if (filteredContent.length === 0) {
            return (
                <div style={{ padding: '20px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                    No matches found for "{filterText}"
                </div>
            );
        }

        return (
            <div className="yaml-container" style={{ padding: '16px', background: 'var(--side-panel-bg, #f8fafc)', borderRadius: '0px', border: '1px solid var(--side-panel-container-border, #e5e7eb)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.5' }}>
                {filteredContent.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', background: item.highlight ? '#fef08a' : 'transparent' }}>
                        {item.type === 'line' ? (
                            <>
                                <span style={{ width: '40px', color: '#94a3b8', textAlign: 'right', marginRight: '15px', userSelect: 'none' }}>{item.number}</span>
                                <span style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{item.content}</span>
                            </>
                        ) : (
                            <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', padding: '5px 0' }}>...</div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="yaml-container" style={{ padding: '16px 16px 16px 0', background: 'var(--side-panel-bg, #f8fafc)', borderRadius: '0px', border: '1px solid var(--side-panel-container-border, #e5e7eb)' }}>
            {typeof data === 'object' && data !== null && !Array.isArray(data) ? (
                Object.entries(data).map(([key, value]) => (
                    <YamlItem key={key} label={key} value={value} level={0} />
                ))
            ) : (
                <YamlItem value={data} level={0} />
            )}
        </div>
    );
};

export default InteractiveYaml;
