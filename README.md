# calculogic-report-capture

`@calculogic/report-capture` runs a command, streams its output to the terminal, and saves the combined stdout/stderr to a timestamped report file. With `--json`, it also prints one line of JSON metadata about the capture. It works with any command and has no dependencies beyond Node.js.

This repository is the authoritative source for the tool. It was extracted from `calculogic-validator/tools/report-capture` in [`HCAToolkit/Calculogic_React_App`](https://github.com/HCAToolkit/Calculogic_React_App), keeping its commit history, because it has no dependency on the Validator and already serves more than one consumer. Migration tracking: [Calculogic_React_App#713](https://github.com/HCAToolkit/Calculogic_React_App/issues/713).

## Current status

- **Consumers:** [`HCAToolkit/calculogic-validator`](https://github.com/HCAToolkit/calculogic-validator) and [`HCAToolkit/Calculogic_React_App`](https://github.com/HCAToolkit/Calculogic_React_App). Both still use their own copy of this tool (`tools/report-capture` and the embedded `calculogic-validator/tools/report-capture`, respectively). Moving them onto this package happens in separate, later changes in those repositories.
- **Distribution:** not published to the npm registry. Consumers pin a Git commit (see below). `"private": true` prevents accidental publication; it does not block Git installs.

## Install

Pin a specific commit, not a branch:

```bash
npm install --save-dev "git+https://github.com/HCAToolkit/calculogic-report-capture.git#<commit-sha>"
```

This installs the `calculogic-report-capture` command.

## Usage

```text
calculogic-report-capture [options] -- <command> [args...]
```

The `--` separator and a command after it are required.

| Option                                   | Meaning                                                                           | Default                             |
| ---------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| `--dir <path>`                           | Report directory. A relative path is resolved from the current working directory. | OS user cache directory (see below) |
| `--keep <n>`                             | Number of newest reports to keep for the prefix after the run                     | `20`                                |
| `--no-prune`                             | Keep all reports                                                                  | pruning on                          |
| `--prefix <name>`                        | Report filename prefix (sanitized to be filesystem-safe)                          | `report`                            |
| `--warn-on-prune` / `--no-warn-on-prune` | Warn before a run that will prune older reports                                   | warn                                |
| `--json`                                 | Print one JSON metadata line to stderr after the run                              | off                                 |

Examples:

```bash
calculogic-report-capture --json --dir ./.reports --keep 20 --prefix naming-app -- calculogic-validate-naming --scope=app
calculogic-report-capture --prefix build -- npm run build
```

There is no `--help` option yet. An unknown option exits `1` with `Unknown option: <option>`.

## Behavior

- **Report file:** `<dir>/<prefix>-YYYY-MM-DD_HH-MM-SS.txt`, using a zero-padded local-time timestamp. Stdout and stderr are both streamed to the terminal and appended to the same file.
- **Default directory:** under the OS user cache base, in `calculogic-report-capture/reports`. The cache base is `$XDG_CACHE_HOME` or `~/.cache` on Linux, `~/Library/Caches` on macOS, and `%LOCALAPPDATA%` or `~/AppData/Local` on Windows.
- **Pruning:** after the run, keeps the newest `--keep` files matching `<prefix>-*.txt` by modification time and deletes older ones, unless `--no-prune` is given.
- **Exit code:** the wrapped command's exit code. Argument errors exit `1`.
- **JSON metadata (`--json`):** one compact line on stderr with `path`, `exitCode`, `bytes`, `startedAt`, `endedAt`, `durationMs`, `dir` and `prefix`.
- **Windows:** an extensionless command is resolved through `PATH` and `PATHEXT` (for example `.cmd`) before it is spawned. The command is never run through a shell.

The full contract is in [`doc/cfg-reportCapture.md`](doc/cfg-reportCapture.md).

## Development

```bash
npm test
```

Requires Node.js 22 or later. `test/package-artifact.test.mjs` packs this package, installs the tarball into a clean temporary project, and runs the installed command there.

## License

MIT. See [`LICENSE`](LICENSE).
