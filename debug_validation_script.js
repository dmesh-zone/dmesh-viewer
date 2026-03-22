import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Ajv from 'ajv/dist/2019.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true, strict: false });
// Load draft 7 meta-schema if needed
const draft7MetaSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_modules/ajv/dist/refs/json-schema-draft-07.json'), 'utf8'));
ajv.addMetaSchema(draft7MetaSchema);
addFormats(ajv);

console.log('Loading schemas...');
const dpSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/schemas/odps-json-schema-v1.0.0.json'), 'utf8'));
const dcSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/schemas/odcs-json-schema-v3.1.0.json'), 'utf8'));
const duaSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/schemas/datausageagreement.schema-v0.0.1.json'), 'utf8'));

console.log('Compiling schemas...');
let validateDP, validateDC, validateDUA;
try {
    console.log('Compiling DP schema...');
    validateDP = ajv.compile(dpSchema);
    console.log('Compiling DC schema...');
    validateDC = ajv.compile(dcSchema);
    console.log('Compiling DUA schema...');
    validateDUA = ajv.compile(duaSchema);
} catch (e) {
    console.error('Compilation failed:');
    console.error(e);
    process.exit(1);
}

console.log('Parsing registry...');
const registryRaw = fs.readFileSync(path.join(__dirname, 'public/DataMeshOperationalDataPetsExample.yaml'), 'utf8');
const registry = YAML.parse(registryRaw);

console.log('Validating items...');
const errors = [];
registry.forEach((item, index) => {
    let validateFn = null;
    let type = 'Unknown';

    if (item.kind === 'DataProduct') {
        type = 'DataProduct';
        validateFn = validateDP;
    } else if (item.kind === 'DataContract') {
        type = 'DataContract';
        validateFn = validateDC;
    } else if (item.dataUsageAgreementSpecification) {
        type = 'DataUsageAgreement';
        validateFn = validateDUA;
    }

    if (validateFn && !validateFn(item)) {
        validateFn.errors.forEach(err => {
            errors.push({
                id: item.id || `Item ${index}`,
                type,
                path: err.instancePath,
                message: err.message,
                params: err.params
            });
        });
    }
});

console.log(`Validation complete. Found ${errors.length} errors.`);
if (errors.length > 0) {
    console.log(JSON.stringify(errors, null, 2));
} else {
    console.log('Registry is valid!');
}
