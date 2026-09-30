import * as vscode from 'vscode';

const EXTENSION_ID = 'salesforce-colorizer';
const COLOR_CUSTOMIZATIONS = 'workbench.colorCustomizations';
const SF_CONFIG_RELATIVE_PATH = '.sf/config.json';

type ColorCustomizations = Record<string, unknown>;

let outputChannel: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Salesforce Colorizer', { log: true });
  context.subscriptions.push(outputChannel);
  outputChannel.info('Activated.');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    outputChannel.error('Workspace folder not found.');
    return;
  }

  const sfConfigUri = vscode.Uri.joinPath(workspaceFolder.uri, SF_CONFIG_RELATIVE_PATH);
  const update = () => updateTheme(sfConfigUri);

  // Survives atomic writes (rename) of the file and its creation/deletion, unlike fs.watch.
  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, SF_CONFIG_RELATIVE_PATH));
  watcher.onDidChange(update);
  watcher.onDidCreate(update);
  watcher.onDidDelete(update);

  context.subscriptions.push(
    watcher,
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(EXTENSION_ID)) {
        update();
      }
    })
  );

  update();
}

async function readTargetOrg(sfConfigUri: vscode.Uri): Promise<string | undefined> {
  let content: string;

  try {
    content = new TextDecoder().decode(await vscode.workspace.fs.readFile(sfConfigUri));
  } catch {
    outputChannel.warn(`${sfConfigUri.fsPath} not found.`);
    return undefined;
  }

  if (!content.trim()) {
    return undefined;
  }

  const targetOrg = JSON.parse(content)['target-org'];
  return typeof targetOrg === 'string' ? targetOrg : undefined;
}

async function updateTheme(sfConfigUri: vscode.Uri) {
  try {
    const targetOrg = await readTargetOrg(sfConfigUri);

    if (!targetOrg) {
      outputChannel.warn('No default Salesforce org set.');
    }

    const colorizerConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
    const keywords = colorizerConfig.get<string[]>('highlightKeywords', []).filter(keyword => keyword.trim());
    const customizationKeys = colorizerConfig.get<string[]>('workbenchColorCustomizations', []);
    const highlightColor = colorizerConfig.get<string>('highlightColor');

    const orgName = targetOrg?.toLowerCase() ?? '';
    const toHighlight = !!orgName && !!highlightColor && keywords.some(keyword => orgName.includes(keyword.toLowerCase()));

    // Only touch the workspace-level value so user/global customizations are not copied into the workspace settings.
    const workbenchConfig = vscode.workspace.getConfiguration();
    const current = workbenchConfig.inspect<ColorCustomizations>(COLOR_CUSTOMIZATIONS)?.workspaceValue ?? {};
    const updated: ColorCustomizations = { ...current };

    customizationKeys.forEach(key => {
      if (toHighlight) {
        updated[key] = highlightColor;
      } else {
        delete updated[key];
      }
    });

    if (JSON.stringify(current) === JSON.stringify(updated)) {
      return;
    }

    // The configuration API edits .vscode/settings.json in place: it keeps comments and creates the file if needed.
    await workbenchConfig.update(
      COLOR_CUSTOMIZATIONS,
      Object.keys(updated).length ? updated : undefined,
      vscode.ConfigurationTarget.Workspace
    );

    outputChannel.info(toHighlight ? `Highlighted org "${targetOrg}".` : 'Highlight removed.');
  } catch (error) {
    outputChannel.error(`Error: ${error}`);
  }
}

export function deactivate() {}
