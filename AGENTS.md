# Calculogic Report Capture Repository Instructions

These instructions apply to the entire `HCAToolkit/calculogic-report-capture` repository.

## Authority and scope

- This repository is the authoritative source for `@calculogic/report-capture`: its implementation, tests and tool contract (`doc/cfg-reportCapture.md`).
- The tool is generic. It must not import from, or encode knowledge of, the Calculogic Validator, the React app, or any report format inside captured files. Consumer-specific presets, verifiers and summarizers belong to their consumers.
- Consumers (`HCAToolkit/calculogic-validator`, `HCAToolkit/Calculogic_React_App`) install this package by pinned Git commit. Do not change consumer repositories from here. Consumer migration is tracked in HCAToolkit/Calculogic_React_App#713.

## Change discipline

- Update `doc/cfg-reportCapture.md` first when a change affects the CLI contract, filenames, default directory, exit codes or JSON metadata. Then change the implementation and tests.
- Treat the command name `calculogic-report-capture`, its flags, the filename pattern and the JSON metadata keys as a public contract. Consumers depend on them.
- Keep one bounded concern per PR. Use `Refs #<issue>` rather than closing keywords unless the owner asks for one.

## Verification

- Run `npm test`. It includes `test/package-artifact.test.mjs`, which packs this package, installs the tarball into a clean temporary project and runs the installed command.
- Record the exact commands and results in the PR. Say which checks were not run.
