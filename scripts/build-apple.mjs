import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appleRoot = path.join(projectRoot, 'apple', 'Simple Video Speed Controller');
const xcodeProject = path.join(appleRoot, 'Simple Video Speed Controller.xcodeproj');
const derivedData = path.join(projectRoot, 'build', 'apple-derived');

function run(command, argumentsList) {
  const result = spawnSync(command, argumentsList, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.error) {
    throw new Error(`Unable to start ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

run(process.execPath, [path.join(projectRoot, 'scripts', 'build.mjs')]);
run('swift', [
  path.join(projectRoot, 'scripts', 'generate-apple-icons.swift'),
  path.join(projectRoot, 'icon.png'),
  appleRoot
]);

const commonBuildArguments = [
  '-quiet',
  '-project', xcodeProject,
  '-configuration', 'Debug',
  '-derivedDataPath', derivedData,
  'CODE_SIGNING_ALLOWED=NO',
  'build'
];

run('xcodebuild', [
  '-scheme', 'Simple Video Speed Controller (macOS)',
  '-destination', 'platform=macOS',
  ...commonBuildArguments
]);

run('xcodebuild', [
  '-scheme', 'Simple Video Speed Controller (iOS)',
  '-destination', 'generic/platform=iOS Simulator',
  ...commonBuildArguments
]);

console.log('Built unsigned macOS and iOS Simulator Apple apps.');
