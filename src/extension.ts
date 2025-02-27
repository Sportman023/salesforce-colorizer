import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const ROOT_PATH = getRootPath();
const OUTPUT_CHANNEL = vscode.window.createOutputChannel('Salesforce Colorizer', { log: true });

export function activate(context: vscode.ExtensionContext) {
  OUTPUT_CHANNEL.info('Activated.');

  if (!ROOT_PATH) {
    OUTPUT_CHANNEL.error('Root path not found.');
    return;
  }

  const sfConfigPath = path.join(ROOT_PATH, '.sf', 'config.json');

  if (!fs.existsSync(sfConfigPath)) {
    OUTPUT_CHANNEL.error(`${sfConfigPath} not found.`);
    return;
  }

  fs.watch(sfConfigPath, eventType => {
    if (eventType === 'change') {
      updateTheme();
    }
  });
}

function getRootPath() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
}

function updateTheme() {
  if (!ROOT_PATH) {
    OUTPUT_CHANNEL.error('Root path not found.');
    return;
  }

  try {
    const sfConfigFilePath = path.join(ROOT_PATH, '.sf', 'config.json');
    const sfConfigFile = fs.readFileSync(sfConfigFilePath, 'utf8');

    if (!sfConfigFile) {
      return;
    }

    const sfConfig = JSON.parse(sfConfigFile);
    console.log(sfConfig);
    const targetOrg = sfConfig['target-org'];

    if (!targetOrg) {
      OUTPUT_CHANNEL.error('No default Salesforce org set.');
      return;
    }

    const colorizerConfig = vscode.workspace.getConfiguration('salesforce-colorizer');
    const userKeywords: string[] | undefined = colorizerConfig.get('highlightKeywords');

    if (!userKeywords) {
      OUTPUT_CHANNEL.error('No highlight keywords set.');
      return;
    }

    const userWorkbenchColorCustomizations: string[] | undefined = colorizerConfig.get('workbenchColorCustomizations');
    if (!userWorkbenchColorCustomizations) {
      OUTPUT_CHANNEL.error('No Workbench Color Customizations set.');
      return;
    }

    const vsSettingsFilePath = path.join(ROOT_PATH, '.vscode', 'settings.json');

    if (!fs.existsSync(vsSettingsFilePath)) {
      OUTPUT_CHANNEL.error(`${vsSettingsFilePath} not found.`);
      return;
    }

    const vsSettingsFile = fs.readFileSync(vsSettingsFilePath, 'utf8');

    if (!vsSettingsFile) {
      OUTPUT_CHANNEL.error(`${vsSettingsFilePath} not found or empty.`);
      return;
    }

    const highlightColor: string | undefined = colorizerConfig.get('highlightColor');

    if (highlightColor === undefined) {
      OUTPUT_CHANNEL.error('No highlightColor set.');
      return;
    }

    const toHighlight = userKeywords.some(keyword => targetOrg.toLowerCase().includes(keyword.toLowerCase()));

    const vsSettings = JSON.parse(vsSettingsFile);

    if (!vsSettings['workbench.colorCustomizations']) {
      vsSettings['workbench.colorCustomizations'] = {};
    }

    const wbColorCustomizations = vsSettings['workbench.colorCustomizations'];

    const color = toHighlight ? highlightColor : undefined;

    userWorkbenchColorCustomizations.forEach(setting => {
      wbColorCustomizations[setting] = color;
    });

    fs.writeFileSync(vsSettingsFilePath, JSON.stringify(vsSettings, null, 4));
  } catch (error) {
    OUTPUT_CHANNEL.error(`Error:  ${error}`);
  }
}

export function deactivate() {
  if (!ROOT_PATH) {
    OUTPUT_CHANNEL.error('Root path not found.');
    return;
  }

  const sfConfigPath = path.join(ROOT_PATH, '.sf', 'config.json');
  if (fs.existsSync(sfConfigPath)) {
    fs.unwatchFile(sfConfigPath);
  }
}
