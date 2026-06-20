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

import React, { useMemo } from 'react';

const QualityTable = ({ schema }) => {
    // Flatten the schema to get a list of rules with their context (field)
    // Flatten the schema to get a list of rules with their context (field)
    const rules = useMemo(() => {
        if (!schema) return [];

        const allRules = [];

        // 1. Column-level rules
        // Check if schema is an array (old behavior) or object with properties (new behavior)
        const columns = Array.isArray(schema) ? schema : (schema.properties || []);

        columns.forEach(column => {
            if (column.quality && column.quality.length > 0) {
                column.quality.forEach(rule => {
                    allRules.push({
                        ...rule,
                        _field: column.name // Context: Column Name
                    });
                });
            }
        });

        // 2. Table-level rules
        if (!Array.isArray(schema) && schema.quality && schema.quality.length > 0) {
            schema.quality.forEach(rule => {
                allRules.push({
                    ...rule,
                    _field: '-' // Context: Table Level
                });
            });
        }

        return allRules;
    }, [schema]);

    if (rules.length === 0) {
        return <div style={{ padding: '20px', color: '#64748b' }}>No data quality rules defined.</div>;
    }

    const renderSeverity = (severity) => {
        const styles = {
            critical: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
            error: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
            warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
            info: { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc' },
            default: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
        };

        const key = (severity || 'info').toLowerCase();
        const style = styles[key] || styles.default;

        return (
            <span style={{
                backgroundColor: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'capitalize',
                display: 'inline-block',
                whiteSpace: 'nowrap'
            }}>
                {severity || 'Info'}
            </span>
        );
    };

    const renderTags = (tags) => {
        if (!tags || tags.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {tags.map((tag, i) => (
                    <span key={i} style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        border: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap'
                    }}>
                        {tag}
                    </span>
                ))}
            </div>
        );
    };

    const renderCode = (content) => {
        if (!content) return null;
        let displayContent = content;
        if (typeof content === 'object') {
            try {
                displayContent = JSON.stringify(content, null, 2);
            } catch (e) { }
        }
        return (
            <pre style={{
                background: '#f8fafc',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '10px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                maxWidth: '200px', // Keep max-width here to prevent massive blowouts
                maxHeight: '100px',
                overflow: 'auto',
                fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid #e2e8f0'
            }} title={String(displayContent)}>
                {String(displayContent)}
            </pre>
        );
    };

    const renderOperator = (rule) => {
        if (rule.mustBe !== undefined) return `must be ${rule.mustBe}`;
        if (rule.mustNotBe !== undefined) return `must not be ${rule.mustNotBe}`;
        if (rule.mustBeGreaterThan !== undefined) return `> ${rule.mustBeGreaterThan}`;
        if (rule.mustBeLessThan !== undefined) return `< ${rule.mustBeLessThan}`;
        if (rule.mustBeLessOrEqualTo !== undefined) return `<= ${rule.mustBeLessOrEqualTo}`;
        if (rule.mustBeGreaterOrEqualTo !== undefined) return `>= ${rule.mustBeGreaterOrEqualTo}`;
        if (rule.mustBeBetween !== undefined && Array.isArray(rule.mustBeBetween)) {
            return `between ${rule.mustBeBetween[0]} and ${rule.mustBeBetween[1]}`;
        }
        if (rule.mustNotBeBetween !== undefined && Array.isArray(rule.mustNotBeBetween)) {
            return `not between ${rule.mustNotBeBetween[0]} and ${rule.mustNotBeBetween[1]}`;
        }
        return null;
    };

    const renderMetricArguments = (args) => {
        if (!args || typeof args !== 'object' || Object.keys(args).length === 0) return null;

        const supportedArgs = {
            'missingValues': 'missing values',
            'validValues': 'valid values',
            'pattern': 'pattern',
            'properties': 'properties'
        };

        const elements = [];

        Object.entries(args).forEach(([key, value]) => {
            if (supportedArgs[key]) {
                const codeStyle = {
                    fontFamily: "'JetBrains Mono', monospace",
                    backgroundColor: '#f1f5f9',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#334155',
                    border: '1px solid #e2e8f0'
                };

                let displayValue;
                if (Array.isArray(value)) {
                    displayValue = value.map((v, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && ", "}
                            <span style={codeStyle}>{v}</span>
                        </React.Fragment>
                    ));
                } else {
                    let strVal = typeof value === 'string' ? value : JSON.stringify(value);
                    displayValue = <span style={codeStyle}>{strVal}</span>;
                }

                elements.push(
                    <div key={key} style={{ whiteSpace: 'nowrap', lineHeight: '20px' }}>
                        <span style={{ fontWeight: '600', color: '#64748b', marginRight: '4px' }}>{supportedArgs[key]}:</span>
                        {displayValue}
                    </div>
                );
            } else {
                let displayValue;
                try {
                    displayValue = JSON.stringify(value);
                } catch (e) {
                    displayValue = String(value);
                }

                elements.push(
                    <div key={key} style={{
                        backgroundColor: '#fee2e2',
                        color: '#334155', // Standard text color
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                        width: 'fit-content'
                    }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                            {key}: {displayValue}
                        </span>
                        <span title={`Supported arguments: ${Object.keys(supportedArgs).join(', ')}`} style={{ cursor: 'help', fontSize: '12px' }}>⚠️</span>
                    </div>
                );
            }
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {elements}
            </div>
        );
    };

    const columns = [
        { label: 'Field', accessor: '_field', sticky: true },
        { label: 'Data quality ID', accessor: 'id' },
        { label: 'Description', accessor: 'description' },
        { label: 'Type', accessor: 'type' },
        { label: 'Metric', accessor: 'metric' },
        { label: 'Metric arguments', accessor: 'arguments', render: (args) => renderMetricArguments(args) },
        { label: 'Unit', accessor: 'unit' },
        { label: 'Operator', accessor: 'operator', render: (_, rule) => renderOperator(rule) },
        { label: 'DQ Engine', accessor: 'engine' },
        { label: 'Implementation', accessor: 'implementation', render: renderCode },
        { label: 'SQL Query', accessor: 'query', render: renderCode },
        { label: 'Scheduled', accessor: 'scheduler' },
        { label: 'Scheduler Config', accessor: 'schedule' },
        { label: 'Dimension', accessor: 'dimension' },
        { label: 'Severity', accessor: 'severity', render: renderSeverity },
        { label: 'Name', accessor: 'name' },
        { label: 'Method', accessor: 'method' },
        { label: 'Business Impact', accessor: 'businessImpact' },
        { label: 'Custom Properties', accessor: 'customProperties', render: renderCode },
        { label: 'Tags', accessor: 'tags', render: renderTags },
        { label: 'Auth Definitions', accessor: 'authoritativeDefinitions', render: renderCode },
    ];

    const visibleColumns = useMemo(() => {
        return columns.filter(col => {
            // Always show sticky columns (Context/Field)
            if (col.sticky) return true;
            // Check if any rule has data for this column
            return rules.some(rule => {
                if (col.accessor === 'operator') return renderOperator(rule) !== null;
                const value = rule[col.accessor];
                if (Array.isArray(value)) return value.length > 0;
                return value !== undefined && value !== null && value !== '';
            });
        });
    }, [rules]);

    return (
        <div className="custom-table-container" style={{ overflow: 'auto', height: '100%', width: '100%' }}>
            <table className="custom-table" style={{ minWidth: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr>
                        {visibleColumns.map((col, index) => (
                            <th key={index} style={{
                                whiteSpace: 'nowrap',
                                position: col.sticky ? 'sticky' : 'relative',
                                left: col.sticky ? 0 : 'auto',
                                zIndex: col.sticky ? 30 : 20,
                                boxShadow: col.sticky ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none'
                            }}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rules.map((rule, rowIndex) => (
                        <tr key={rowIndex}>
                            {visibleColumns.map((col, colIndex) => (
                                <td key={colIndex} style={{
                                    verticalAlign: 'top',
                                    position: col.sticky ? 'sticky' : 'relative',
                                    left: col.sticky ? 0 : 'auto',
                                    background: col.sticky ? 'var(--side-panel-bg, #ffffff)' : 'transparent',
                                    zIndex: col.sticky ? 10 : 'auto',
                                    boxShadow: col.sticky ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none'
                                }}>
                                    {col.render ? col.render(rule[col.accessor], rule) : (rule[col.accessor] || null)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default QualityTable;
