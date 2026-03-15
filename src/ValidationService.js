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

import Ajv from 'ajv/dist/2019';
import addFormats from 'ajv-formats';
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';
import YAML from 'yaml';
import dataProductSchema from './schemas/odps-json-schema-v1.0.0.json';
import dataContractSchema from './schemas/odcs-json-schema-v3.1.0.json';
import duaSchema from './schemas/datausageagreement.schema-v0.0.1.json';
import metricsSchema from './schemas/odps-observability-metrics-schema-v0.0.1.json';

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addMetaSchema(draft7MetaSchema);
addFormats(ajv);

let validateDataProduct = () => true;
let validateDataContract = () => true;
let validateDUA = () => true;
let validateMetrics = () => true;

try {
    validateDataProduct = ajv.compile(dataProductSchema);
} catch (e) {
    console.error("Failed to compile Data Product schema", e);
}

try {
    validateDataContract = ajv.compile(dataContractSchema);
} catch (e) {
    console.error("Failed to compile Data Contract schema", e);
}

try {
    validateDUA = ajv.compile(duaSchema);
} catch (e) {
    console.error("Failed to compile DUA schema", e);
}

try {
    validateMetrics = ajv.compile(metricsSchema);
} catch (e) {
    console.error("Failed to compile Metrics schema", e);
}

export const validateRegistry = (registry, rawRegistry) => {
    const errors = [];
    let doc = null;
    let lineCounter = null;

    if (rawRegistry) {
        try {
            lineCounter = new YAML.LineCounter();
            doc = YAML.parseDocument(rawRegistry, { lineCounter });
        } catch (e) {
            console.error("Failed to parse YAML document for line numbers", e);
        }
    }

    registry.forEach((item, index) => {
        let validateFn = null;
        let type = 'Unknown';

        if (item.kind === 'DataProduct') {
            type = 'DataProduct';
            validateFn = validateDataProduct;
        } else if (item.kind === 'DataContract') {
            type = 'DataContract';
            validateFn = validateDataContract;
        } else if (item.dataUsageAgreementSpecification) {
            type = 'DataUsageAgreement';
            validateFn = validateDUA;
        } else if (item.kind === 'DataProductObservabilityMetrics') {
            type = 'DataProductObservabilityMetrics';
            validateFn = validateMetrics;
        } else {
            console.warn(`Skipping unknown item type at index ${index}`, item);
            return;
        }

        if (validateFn && !validateFn(item)) {
            validateFn.errors.forEach(err => {
                let line = null;
                if (doc && lineCounter) {
                    try {
                        const path = [index, ...err.instancePath.split('/').filter(Boolean)];
                        const node = doc.getIn(path, true);
                        if (node && node.range) {
                            line = lineCounter.linePos(node.range[0]).line;
                        }
                    } catch (e) {
                        console.warn("Could not determine line number", e);
                    }
                }

                let message = err.message;
                if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
                    message += `: '${err.params.additionalProperty}'`;
                }

                errors.push({
                    index,
                    id: item.id || `Item ${index}`,
                    type,
                    path: err.instancePath,
                    message: message,
                    params: err.params,
                    line: line
                });
            });
        }
    });

    return errors;
};
