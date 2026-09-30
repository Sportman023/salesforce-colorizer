# Salesforce Colorizer

Salesforce Colorizer is a Visual Studio Code extension that changes the theme based on the Salesforce org configuration. It highlights the status bar and other UI elements to help you easily identify different orgs (e.g., Production, Sandbox).

## Features

-   Automatically updates the theme based on the Salesforce org configuration.
-   Customizable highlight keywords and colors.

## Installation

1. Download .vsix file. Go to extension => Install from VSIX... Or run the `code --install-extension salesforce-colorizer-<version>.vsix`.
2. Open your Salesforce project in VS Code.

## Configuration

The extension uses the following settings, which can be configured in your `settings.json` file:

-   `salesforce-colorizer.highlightKeywords`: An array of keywords to identify orgs to highlight (e.g., Production, Important). Default is `["Production"]`.
-   `salesforce-colorizer.workbenchColorCustomizations`: An array of workbench color customizations to highlight (e.g., statusBar.background). Default is `["statusBar.background", "menu.selectionBackground", "quickInput.list.focusBackground"]`.
-   `salesforce-colorizer.highlightColor`: The color to use for highlighted orgs. Default is `"#570000b2"`.

Example configuration:

```json
{
    "salesforce-colorizer.highlightKeywords": ["Production", "Important"],
    "salesforce-colorizer.workbenchColorCustomizations": ["statusBar.background", "menu.selectionBackground", "quickInput.list.focusBackground"],
    "salesforce-colorizer.highlightColor": "#570000b2"
}
```

## Notes

-   Colors are written to the workspace settings (`.vscode/settings.json`, or the `.code-workspace` file in a multi-root workspace). Comments in the file are preserved.
-   In a multi-root workspace the window is highlighted if any folder targets a matching org.
-   When the highlight is removed, only the colors applied by the extension are deleted; manual customizations are kept.
