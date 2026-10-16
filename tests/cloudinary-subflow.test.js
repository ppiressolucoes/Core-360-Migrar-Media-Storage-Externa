const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/sub-midia-externa-cloudinary.json'), 'utf8'
));
const node = name => workflow.nodes.find(item => item.name === name);

async function hashItems(contents) {
  const items = contents.map((content, index) => ({
    json: {post_id: index + 1},
    binary: {data: {fileName: `image-${index}.jpg`, mimeType: 'image/jpeg'}}
  }));
  const code = node('SHA-256 Featured IMG').parameters.jsCode;
  const run = vm.runInNewContext(`(async function () {\n${code}\n})`, {
    $input: {all: () => items},
    $: name => {
      assert.equal(name, 'BASE-64');
      return {first: () => ({json: {
        'API-USER': 'test-cloud', 'API-FOLDER': 'pel/featured',
        AUTHORIZATION: 'Basic test'
      }})};
    }
  });
  return run.call({helpers: {getBinaryDataBuffer: async index => Buffer.from(contents[index])}});
}

test('SHA-256 processa cada item e preserva o binário para upload', async () => {
  const output = await hashItems(['abc', '']);
  assert.deepEqual(Array.from(output, item => item.json.cloudinary_public_id), [
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  ]);
  assert.equal(output[1].json.post_id, 2);
  assert.equal(output[1].binary.data.fileName, 'image-1.jpg');
});

test('export usa public_id determinístico e exige reconciliação de upload repetido', () => {
  const upload = node('Upload Cloudinary featured IMG').parameters;
  const fields = Object.fromEntries(upload.bodyParameters.parameters
    .filter(item => item.parameterType !== 'formBinaryData')
    .map(item => [item.name, item.value]));
  const headers = Object.fromEntries(upload.headerParameters.parameters
    .map(item => [item.name, item.value]));

  assert.match(fields.public_id, /cloudinary_public_id/);
  assert.equal(fields.overwrite, 'false');
  assert.equal(fields.unique_filename, 'false');
  assert.equal(headers['X-Proxy-Key'], '={{ $env.CLOUDINARY_PROXY_KEY }}');
  assert.equal(workflow.active, false);
  assert.equal('pinData' in workflow, false);
  assert.ok(workflow.nodes.every(item => !('credentials' in item)));
});
