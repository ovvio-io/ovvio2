# Installation

We're using Deno as our server, and ES6 modules for package management.

First, install deno from here https://deno.com/manual/getting_started/installation

Second, install and run `npm install` inside the root directory of this
repository. This is a temporary hack to allow us to continue using an old
version of slate, and will be removed in the future.

## Running the Server

First, you'll need to set up a directory to which the server writes all of its
data.

Running the server will pull all dependencies, and compile the web-app.

Debug run:
`deno run --unstable -A --inspect-brk server/run-server.ts -d <path to data dir>`

NOTE: If you're having problems with deno.lock getting out of sync, add the
`--lock-write` flag to deno run which will force update the lock file.

### Compiling for Production

When compiling for production, run the following command:
`deno run -A server/build.ts`

This will create a `build` directory inside the repository, containing
executables both for the local OS and for x64 linux for production. These
executables are fully self contained, and have no external dependencies.

### Starting Fresh

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

## Publicly Available URLs

- `https://<tenantId>.ovvio.io/<repoId>/<key>`
  Shows the head of the specified key.

- `https://<tenantId>.ovvio.io/<repoId>/<key>/<commitId>`
  TODO: Shows the specific historic version (commit) of the specified key.

- `https://<tenantId>.ovvio.io/settings`
  Deep link for settings home page.

- `https://<tenantId>.ovvio.io/settings/<workspaceId>`
  Deep link for settings of the specific workspace.

- `https://<tenantId>.ovvio.io/new`
  Deep link for creating a new workspace.
