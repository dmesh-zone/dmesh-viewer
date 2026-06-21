import React, { useState, useMemo } from 'react';

const JsonItem = ({ label, value, level = 0, isLast = true }) => {
    const [expanded, setExpanded] = useState(true);
    const gutter = 40; // Gutter for line numbers
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

    // Helper for primitives
    const renderPrimitive = (val) => {
        if (val === null || val === undefined) return <span style={{ color: nullColor }}>null</span>;
        if (typeof val === 'string') return <span style={{ color: stringColor }}>"{val}"</span>;
        if (typeof val === 'number') return <span style={{ color: numberColor }}>{val}</span>;
        if (typeof val === 'boolean') return <span style={{ color: booleanColor }}>{String(val)}</span>;
        return <span>{String(val)}</span>;
    };

    const renderKey = (lbl) => {
        if (lbl === undefined || lbl === null) return null;
        return <span style={{ color: keyColor, fontWeight: '600', marginRight: '6px' }}>"{lbl}":</span>;
    };
    
    const comma = isLast ? '' : ',';

    // NULL / UNDEFINED
    if (value === null || value === undefined) {
        return (
            <div style={wrapperStyle}>
                {renderKey(label)}
                <span style={{ color: nullColor }}>null</span>{comma}
            </div>
        );
    }

    // ARRAYS
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <div style={wrapperStyle}>
                    {renderKey(label)}
                    <span style={{ color: '#64748b' }}>[]</span>{comma}
                </div>
            );
        }

        return (
            <div>
                <div
                    onClick={toggleExpand}
                    style={{
                        ...wrapperStyle,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    {/* Icon */}
                    <span style={{
                        position: 'absolute',
                        left: `${indent - 16}px`,
                        fontSize: '10px',
                        color: '#94a3b8',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}>▶</span>

                    {renderKey(label)}
                    <span style={{ color: '#64748b' }}>{expanded ? '[' : `Array(${value.length})]${comma}`}</span>
                </div>
                {expanded && (
                    <>
                        {value.map((item, index) => (
                            <JsonItem
                                key={index}
                                value={item}
                                level={level + 1}
                                isLast={index === value.length - 1}
                            />
                        ))}
                        <div style={{ ...wrapperStyle, color: '#64748b' }}>]{comma}</div>
                    </>
                )}
            </div>
        );
    }

    // OBJECTS
    if (typeof value === 'object') {
        const entries = Object.entries(value).sort((a, b) => {
            if (a[0] === 'property' && b[0] !== 'property') return -1;
            if (a[0] !== 'property' && b[0] === 'property') return 1;
            if (a[0] === 'value' && b[0] !== 'value') return 1;
            if (a[0] !== 'value' && b[0] === 'value') return -1;
            return 0;
        });
        if (entries.length === 0) {
            return (
                <div style={wrapperStyle}>
                    {renderKey(label)}
                    <span style={{ color: '#64748b' }}>{'{ }'}</span>{comma}
                </div>
            );
        }

        return (
            <div>
                <div
                    onClick={toggleExpand}
                    style={{
                        ...wrapperStyle,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    {/* Icon */}
                    <span style={{
                        position: 'absolute',
                        left: `${indent - 16}px`,
                        fontSize: '10px',
                        color: '#94a3b8',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}>▶</span>

                    {renderKey(label)}
                    <span style={{ color: '#64748b' }}>{expanded ? '{' : `{...}${comma}`}</span>
                </div>
                {expanded && (
                    <>
                        {entries.map(([k, v], index) => (
                            <JsonItem
                                key={k}
                                label={k}
                                value={v}
                                level={level + 1}
                                isLast={index === entries.length - 1}
                            />
                        ))}
                        <div style={{ ...wrapperStyle, color: '#64748b' }}>{`}${comma}`}</div>
                    </>
                )}
            </div>
        );
    }

    // PRIMITIVES
    return (
        <div style={wrapperStyle}>
            {renderKey(label)}
            {renderPrimitive(value)}{comma}
        </div>
    );
};

const InteractiveJson = ({ data, filterText }) => {
    // Convert to JSON Lines if filter is present
    const filteredContent = useMemo(() => {
        if (!filterText) return null;

        const jsonString = JSON.stringify(data, null, 2);
        const lines = jsonString.split('\n');
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
        if (mergedRanges.length > 0 && mergedRanges[mergedRanges.length - 1] < lines.length - 1) {
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
            <div className="json-container" style={{ padding: '16px', background: 'var(--side-panel-bg, #f8fafc)', borderRadius: '0px', border: '1px solid var(--side-panel-container-border, #e5e7eb)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.5' }}>
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
        <div className="json-container" style={{ padding: '16px 16px 16px 0', background: 'var(--side-panel-bg, #f8fafc)', borderRadius: '0px', border: '1px solid var(--side-panel-container-border, #e5e7eb)' }}>
            <div style={{ paddingLeft: '40px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', color: '#64748b' }}>{'{'}</div>
            {typeof data === 'object' && data !== null && !Array.isArray(data) ? (
                Object.entries(data).sort((a, b) => {
                    if (a[0] === 'property' && b[0] !== 'property') return -1;
                    if (a[0] !== 'property' && b[0] === 'property') return 1;
                    if (a[0] === 'value' && b[0] !== 'value') return 1;
                    if (a[0] !== 'value' && b[0] === 'value') return -1;
                    return 0;
                }).map(([key, value], idx, arr) => (
                    <JsonItem key={key} label={key} value={value} level={1} isLast={idx === arr.length - 1} />
                ))
            ) : (
                <JsonItem value={data} level={1} />
            )}
            <div style={{ paddingLeft: '40px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', color: '#64748b' }}>{'}'}</div>
        </div>
    );
};

export default InteractiveJson;
