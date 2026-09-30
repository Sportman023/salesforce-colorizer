# Change Log

All notable changes to the "salesforce-colorizer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2026-09-30

- Apply the highlight on startup and when extension settings change.
- Reliable watching of `.sf/config.json` (atomic writes, creation, deletion).
- Keep comments in `settings.json`; create it when missing.
- Support multi-root workspaces.
- Remove only colors applied by the extension, including keys dropped from `workbenchColorCustomizations`.

## [0.1.3]

- Initial release