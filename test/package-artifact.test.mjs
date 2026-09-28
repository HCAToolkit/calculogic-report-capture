import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPORT_CAPTURE_METADATA_KEYS } from '../src/report-capture.contracts.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const runCommand = (command, args, { cwd }) =>
  spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });

const formatFailure = ({ command, args, cwd, result }) =>
  [
    `command: ${[command, ...args].join(' ')}`,
    `working directory: ${cwd}`,
    `exit status: ${result.status}`,
    `stdout:\n${result.stdout}`,
    `stderr:\n${result.stderr}`,
  ].join('\n\n');

const assertSuccess = ({ command, args, cwd, result }) => {
  assert.equal(result.error, undefined, formatFailure({ command, args, cwd, result }));
  assert.equal(result.status, 0, formatFailure({ command, args, cwd, result }));
};

test('packed artifact installs into a clean project and its command captures reports there', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'calculogic-report-capture-artifact-'));
  const packRoot = path.join(tempRoot, 'pack');
  const consumerRoot = path.join(tempRoot, 'consumer');

  try {
    await fs.mkdir(packRoot, { recursive: true });
    await fs.mkdir(consumerRoot, { recursive: true });
    await fs.writeFile(
      path.join(consumerRoot, 'package.json'),
      `${JSON.stringify({ name: 'report-capture-artifact-consumer', version: '1.0.0', private: true }, null, 2)}\n`,
    );

    const packArgs = ['pack', '--json', '--pack-destination', packRoot];
    const packResult = runCommand('npm', packArgs, { cwd: packageRoot });
    assertSuccess({ command: 'npm', args: packArgs, cwd: packageRoot, result: packResult });
    const [packInfo] = JSON.parse(packResult.stdout);
    const packedFiles = packInfo.files.map((file) => file.path).sort();
    assert.deepEqual(packedFiles, [
      'LICENSE',
      'README.md',
      'package.json',
      'src/report-capture.contracts.mjs',
      'src/report-capture.host.mjs',
      'src/report-capture.knowledge.mjs',
      'src/report-capture.logic.mjs',
    ]);
    const tarballPath = path.join(packRoot, packInfo.filename);

    const installArgs = ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath];
    const installResult = runCommand('npm', installArgs, { cwd: consumerRoot });
    assertSuccess({ command: 'npm', args: installArgs, cwd: consumerRoot, result: installResult });

    const binPath = path.join(consumerRoot, 'node_modules', '.bin', 'calculogic-report-capture');
    assert.equal(
      fsSync.existsSync(binPath),
      true,
      'calculogic-report-capture should be installed in the consumer.',
    );

    const captureArgs = [
      '--json',
      '--dir',
      './.reports',
      '--prefix',
      'artifact-check',
      '--',
      process.execPath,
      '-e',
      "process.stdout.write('captured stdout\\n'); process.stderr.write('captured stderr\\n'); process.exit(3);",
    ];
    const captureResult = runCommand(binPath, captureArgs, { cwd: consumerRoot });
    const failure = formatFailure({
      command: binPath,
      args: captureArgs,
      cwd: consumerRoot,
      result: captureResult,
    });
    assert.equal(captureResult.error, undefined, failure);
    assert.equal(captureResult.status, 3, failure);
    assert.match(captureResult.stdout, /captured stdout/u, failure);

    const metadataLine = captureResult.stderr.trim().split('\n').at(-1);
    const metadata = JSON.parse(metadataLine);
    assert.deepEqual(Object.keys(metadata).sort(), [...REPORT_CAPTURE_METADATA_KEYS].sort());
    assert.equal(metadata.exitCode, 3);
    assert.equal(metadata.prefix, 'artifact-check');
    assert.equal(metadata.dir, path.join(consumerRoot, '.reports'));
    assert.equal(path.dirname(metadata.path), path.join(consumerRoot, '.reports'));
    assert.equal(metadata.path.includes('node_modules'), false);

    const reportContent = await fs.readFile(metadata.path, 'utf8');
    assert.match(reportContent, /captured stdout/u);
    assert.match(reportContent, /captured stderr/u);
    assert.equal(Buffer.byteLength(reportContent), metadata.bytes);

    const argumentErrorResult = runCommand(binPath, ['--not-an-option', '--', 'node'], {
      cwd: consumerRoot,
    });
    assert.equal(argumentErrorResult.status, 1);
    assert.match(argumentErrorResult.stderr, /Unknown option: --not-an-option/u);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
