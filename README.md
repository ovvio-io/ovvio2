# Installation

We're using Deno as our server. Install it from here https://deno.com/manual/getting_started/installation.

## Running the Server

First, run `npm-install`.

Second, you'll need to set up a directory to which the server writes all of its
data.

### Required Deno permissions:

`--allow-read --allow-env --allow-run --allow-sys --allow-write --allow-net`

### Debug Run:

`deno run -A server/debug-server.ts -d <path to data dir>`

Useful Options (Google them):

- `--inspect-brk`
- `--inspect`
- `--lock-write`
- `--no-lock`

### Production-Like Run:

`deno run --allow-read --allow-env --allow-run --allow-sys --allow-write --allow-net server/run-server -d <path to data dir>`

Note: You'll need to run the build script for all the required assets to be
generated in the `./build/` dir.

## Production Build:

A production build generates a standalone executable with all required
dependencies bundled into it. The resulting binaries are placed in the `./build/`
directory.

`deno run -A server/build.ts` will generate a production like build for the
current OS, assuming an alpha level release.

Useful Flags (refer to the script's help page for additional info):

- `--control`
- `--linux`
- `--upload`
- `--beta`
- `--release`

## Server Control

An additional control binary is deployed alongside the server binary. The
control process does not respond to outside traffic directly, and can't be
communicated with actively. Instead, the server control periodically polls
publicly accessible configuration files stored on our S3 bucket - `arn:aws:s3:::ovvio2-release`.

When the server control detects the machine's configuration does not match the
desired configuration, it'll take the needed steps and reconfigure the machine.

The control process itself is managed by `systemd`, and is initially
bootstrapped using the launch script located at
`server-control/launch-script.sh`.

### Debugging Server Control

`deno run -A server-control/server-control.ts`

## Starting Fresh

Since Ovvio is designed to resist data loss using automatic replication, it's
a bit tricky to clean all data and start fresh. To do so, perform the following
steps:

1. Stop the server. Also stop all running replicas if you have any.

2. In any non-incognito window you have open, open the developer tools, go to
   the _Application_ tab > _Storage_ and click the _Clear site data_ button.

3. Close all browser windows including incognito tabs.

4. Clear all contents in the data directories of any servers/replicas you have
   running (the -d flag to the server).

## Admin CLI

The admin CLI allows you to connect to a specific repository, replicate it
locally, and perform manual manipulation of the repository data.

`deno run -A --unstable cli/admin.ts -s <http(s)://server.url/data/wsId>`

The CLI will immediately replicate the remote repository locally, then enter
an interactive mode.

NOTE: The CLI does not automatically sync local changes to the origin
repository. You must manually trigger a sync for changes to be published.

# Overview

## Development Requirements

Ovvio must be developed using only a small team of engineers. We try to
optimize for operational costs first, then for technical requirements.
Thus our requirements are:

- Zero DevOps and SREs. Our engineering team must be able to maintain and scale
  the service without hiring additional team members for the next couple of
  years.

- Aggressively minimize external dependencies, both in code and infrastructure.
  This enables us to play around with the business model until we reach an
  adequate level of Product Market Fit, and easily pass compliance certification
  for critical markets.

# Misc

Here you'll find a few random notes about various areas of the system.

## Repository Layout on Server Disk

_Note: Everything is relative to a base data directory._

- `/data/<workspace_id>`
  Stores a single workspace's contents.

- `/user/<user_id>`
  Stores a single users's private contents. This is really a personal workspace
  and holds the same type of records like a workspace.

- `/sys/dir`
  Main organization directory. Stores global records like workspaces, users,
  tags, etc. Servers constantly keep this repository open and use it for
  authorization of actions.

- `/logs/<user_id>`
  Stores a single user's usage data (client events, aka analytics). This is not
  a repository. Rather than commits, it stores individual log messages.

### Workspace Repository

Workspace repository holds all Notes contained in this workspace. It's typically
accessed by a small number of participants. Usually all participants have access
to all or most data stored in the specific repository.

Note that the workspace's record itself is stored in `/sys/dir`.

### User Repository

A personal place designed to hold private items. This repository stores the
following schemes:

- Notes (drafts)
- Views

Typically only the owner will access this repository. External access will
typically be limited to specific items.

### System Directory

A large repository containing all configuration data for the entire
organization. The server keeps this repository open at all times, and may employ
some application level caching when needed.

Most users have access only to a small number of items in this repository, while
Admins may have the ability to access most (but not all) items.

In this repository you'll find the following schemes:

- Workspaces
- Users

### Logs Repository

A single user generates a bunch of usage data (events), also called analytics
data. This is a logs repository and contains log messages rather than records.

## Workspace Creation

When a client creates a new workspace, it'll locally create a new workspace
record, a new workspace repository, and start adding contents to it. It'll then
blindly try to sync everything in no particular order.

The server, however, will deny all access to the non-existing workspace
repository until the workspace record had been sync'ed to `/sys/dir`,
effectively granting 'create' permissions. This enables us, the operators, to
log the creation before actually accepting any data.

The client isn't bothered by all of this, it'll just wait happily for everything
to sync.
