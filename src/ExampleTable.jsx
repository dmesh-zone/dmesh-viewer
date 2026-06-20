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

import React from 'react';

const ExampleTable = ({ schema }) => {
    if (!schema || schema.length === 0) {
        return <div style={{ padding: '20px', color: '#64748b' }}>No schema defined.</div>;
    }

    // 1. Identify columns (fields)
    const columns = schema.map(col => col.name);

    // 2. Determine max rows
    // Find column with most examples
    let maxRows = 0;
    schema.forEach(col => {
        if (col.examples && Array.isArray(col.examples)) {
            maxRows = Math.max(maxRows, col.examples.length);
        }
    });

    if (maxRows === 0) {
        return <div style={{ padding: '20px', color: '#64748b' }}>No examples defined in schema.</div>;
    }

    // 3. Generate Rows
    const rows = [];
    for (let i = 0; i < maxRows; i++) {
        const rowData = {};
        columns.forEach((colName, colIndex) => {
            // Get example at index i for this column, or use the last available example
            const colDef = schema[colIndex];

            if (colDef.examples && colDef.examples.length > 0) {
                if (colDef.examples[i] !== undefined) {
                    rowData[colName] = colDef.examples[i];
                } else {
                    // Use the last available example
                    rowData[colName] = colDef.examples[colDef.examples.length - 1];
                }
            } else {
                // Column has no examples at all
                rowData[colName] = '';
            }
        });
        rows.push(rowData);
    }

    return (
        <div className="custom-table-container" style={{ overflow: 'auto', height: '100%', width: '100%' }}>
            <table className="custom-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr>
                        {columns.map(col => (
                            <th key={col}>
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map(col => (
                                <td key={col} style={{ whiteSpace: 'nowrap' }}>
                                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ExampleTable;
