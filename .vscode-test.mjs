import { defineConfig } from '@vscode/test-cli';
import { tmpdir } from 'os';
import { join } from 'path';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// The default user data dir lives inside the project; deep project paths exceed the unix socket path limit on macOS.
	launchArgs: ['--user-data-dir', join(tmpdir(), 'sfc-vscode-test')],
});
