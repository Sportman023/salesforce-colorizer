import * as vscode from 'vscode';

const EXTENSION_ID = 'salesforce-colorizer';
const COLOR_CUSTOMIZATIONS = 'workbench.colorCustomizations';
const SF_CONFIG_RELATIVE_PATH = '.sf/config.json';
const APPLIED_COLORS_STATE_KEY = 'appliedColors';

type ColorCustomizations = Record<string, unknown>;

let outputChannel: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Salesforce Colorizer', { log: true });
  context.subscriptions.push(outputChannel);
  outputChannel.info('Activated.');

  const update = () => updateTheme(context.workspaceState);

  // Survives atomic writes (rename) of the file and its creation/deletion, unlike fs.watch.
  // A glob pattern covers every workspace folder, including folders added later.
  const watcher = vscode.workspace.createFileSystemWatcher(`**/${SF_CONFIG_RELATIVE_PATH}`);
  watcher.onDidChange(update);
  watcher.onDidCreate(update);
  watcher.onDidDelete(update);

  context.subscriptions.push(
    watcher,
    vscode.workspace.onDidChangeWorkspaceFolders(update),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(EXTENSION_ID)) {
        update();
      }
    })
  );

  update();
}

async function readTargetOrg(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
  const sfConfigUri = vscode.Uri.joinPath(folder.uri, SF_CONFIG_RELATIVE_PATH);
  let content: string;

  try {
    content = new TextDecoder().decode(await vscode.workspace.fs.readFile(sfConfigUri));
  } catch {
    return undefined;
  }

  if (!content.trim()) {
    return undefined;
  }

  const targetOrg = JSON.parse(content)['target-org'];
  return typeof targetOrg === 'string' ? targetOrg : undefined;
}

async function findOrgToHighlight(keywords: string[]): Promise<string | undefined> {
  // workbench.colorCustomizations is window-scoped, so in a multi-root workspace
  // the window is highlighted if any folder targets a matching org.
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      const targetOrg = await readTargetOrg(folder);
      const orgName = targetOrg?.toLowerCase();

      if (orgName && keywords.some(keyword => orgName.includes(keyword.toLowerCase()))) {
        return targetOrg;
      }
    } catch (error) {
      outputChannel.error(`Failed to read ${SF_CONFIG_RELATIVE_PATH} in ${folder.name}: ${error}`);
    }
  }

  return undefined;
}

async function updateTheme(workspaceState: vscode.Memento) {
  try {
    const colorizerConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
    const keywords = colorizerConfig.get<string[]>('highlightKeywords', []).filter(keyword => keyword.trim());
    const customizationKeys = colorizerConfig.get<string[]>('workbenchColorCustomizations', []);
    const highlightColor = colorizerConfig.get<string>('highlightColor');

    const orgToHighlight = highlightColor ? await findOrgToHighlight(keywords) : undefined;
    const desired: Record<string, string> = {};

    if (orgToHighlight && highlightColor) {
      customizationKeys.forEach(key => (desired[key] = highlightColor));
    }

    // Only touch the workspace-level value so user/global customizations are not copied into the workspace settings.
    const workbenchConfig = vscode.workspace.getConfiguration();
    const current = workbenchConfig.inspect<ColorCustomizations>(COLOR_CUSTOMIZATIONS)?.workspaceValue ?? {};
    const updated: ColorCustomizations = { ...current };

    // Remove only colors this extension applied itself (and the user has not changed since),
    // so manual customizations and keys dropped from the settings are handled correctly.
    const previouslyApplied =
      workspaceState.get<Record<string, string>>(APPLIED_COLORS_STATE_KEY) ??
      guessAppliedColors(current, customizationKeys, highlightColor);
    Object.entries(previouslyApplied).forEach(([key, color]) => {
      if (!(key in desired) && updated[key] === color) {
        delete updated[key];
      }
    });

    Object.assign(updated, desired);
    await workspaceState.update(APPLIED_COLORS_STATE_KEY, desired);

    if (JSON.stringify(current) === JSON.stringify(updated)) {
      return;
    }

    // The configuration API edits .vscode/settings.json in place: it keeps comments and creates the file if needed.
    await workbenchConfig.update(
      COLOR_CUSTOMIZATIONS,
      Object.keys(updated).length ? updated : undefined,
      vscode.ConfigurationTarget.Workspace
    );

    outputChannel.info(orgToHighlight ? `Highlighted org "${orgToHighlight}".` : 'Highlight removed.');
  } catch (error) {
    outputChannel.error(`Error: ${error}`);
  }
}

// Versions before tracking the applied colors left no state: treat configured keys with the highlight color as ours.
function guessAppliedColors(current: ColorCustomizations, keys: string[], color: string | undefined): Record<string, string> {
  const applied: Record<string, string> = {};

  if (color) {
    keys.filter(key => current[key] === color).forEach(key => (applied[key] = color));
  }

  return applied;
}

export function deactivate() {}
