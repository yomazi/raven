# raven

A sanity-inducing tool for any Google Workspace.

# basic cloudflare commands

```
// log into cloudflare
/usr/local/bin/cloudflared login

// list all cloudflare tunnels
/usr/local/bin/cloudflared tunnel list

// define a tunnel called "raven" which will be exposed via "raven.neuron9.io"
/usr/local/bin/cloudflared tunnel route dns raven raven.neuron9.io

/*
/** to start the Cloudflare tunnel **/
 */
// 1. start your server
npm run dev

// 2. in a different terminal window...
/usr/local/bin/cloudflared tunnel run raven

// ...or, to run in debug mode:
/usr/local/bin/cloudflared tunnel --loglevel debug run raven
```

# basic docker commands

```
// Start MongoDB from the project root folder
docker-compose up -d      s// -d runs it in the background

// check logs
docker-compose logs -f mongo

// stop the container
docker-compose down
```

# color scheme

```
Background:         #1C232D
Surface / cards:    #273142
Borders / dividers: #3A4556

Primary text:       #E6EDF3
Secondary text:     #B8C0CC
Muted text:         #8A94A6

Primary accent:     #22D3EE
Secondary accent:   #F97316
```

# mongodb

```
// make sure the mongo service is running
brew services start mongodb-community

// restart the service (if you have to)
brew services restart mongodb-community

// verify it's running
mongosh

```

# Database Migrations

Raven has a lightweight migration system for managing changes to the Raven MongoDB database over time.

## Overview

Instead of manually modifying the database when the data model changes, you add a numbered script describing exactly what to change. The runner tracks which scripts have already been applied in a `_migrations` collection in MongoDB, so each script only ever runs once.

Migrations connect directly to MongoDB — the Express server does not need to be running.

## Folder Structure

```
server/
└── migrations/
    ├── runner.js          — the migration engine
    ├── new-migration.js   — creates new migration files
    └── scripts/
        └── 001_add_builds_shouldShowInRoster.js
```

## npm Scripts

All commands can be run from the repo root.

| Script                                 | Description                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `npm run migrate`                      | Run all pending migrations                           |
| `npm run migrate:list`                 | Show the status of all migrations                    |
| `npm run migrate:dry`                  | Preview what would run without touching the database |
| `npm run migrate:down -- <number>`     | Roll back a specific migration                       |
| `npm run migrate:new -- <description>` | Create a new migration file                          |

## Writing a Migration

### 1. Create the file

```bash
npm run migrate:new -- your_description_here
```

This creates a new numbered file in `server/migrations/scripts/` — for example, `002_your_description_here.js` — pre-populated with a starter template.

### 2. Implement `up()`

`up()` is the change to apply. It receives a raw MongoDB `db` instance (not Mongoose) and should use the native driver API.

```js
export async function up(db) {
  const col = db.collection("Shows");
  const result = await col.updateMany(
    { someField: { $exists: false } },
    { $set: { someField: defaultValue } }
  );
  console.log(`     someField: ${result.modifiedCount} documents updated`);
}
```

**`up()` should be idempotent where possible** — meaning it can be run more than once without causing harm. Use `$exists` checks, upserts, and similar guards to ensure this.

### 3. Implement `down()` (optional but encouraged)

`down()` reverses the migration. It is optional but strongly recommended for anything that can be meaningfully reversed.

```js
export async function down(db) {
  const col = db.collection("Shows");
  const result = await col.updateMany(
    { someField: { $exists: true } },
    { $unset: { someField: "" } }
  );
  console.log(`     someField removed from ${result.modifiedCount} documents`);
}
```

Note that destructive operations — deleting documents, dropping collections — cannot be reversed unless a backup was made first.

## Running Migrations

### Check status

Before running anything, check what's pending:

```bash
npm run migrate:list
```

Output shows each migration file as either `✔ applied` or `○ pending`.

### Preview with a dry run

To see what would run without touching the database:

```bash
npm run migrate:dry
```

This is strongly recommended before running migrations against any database with real data.

### Apply pending migrations

```bash
npm run migrate
```

Migrations run in numerical order. If any migration fails, the runner aborts immediately — remaining migrations are not run, and the failed migration is not marked as applied so it can be fixed and re-run.

### Roll back a migration

```bash
npm run migrate:down -- 001
```

This calls the `down()` function of the specified migration and removes it from the `_migrations` collection, marking it as no longer applied. The migration number is the three-digit prefix of the filename.

If the migration does not export a `down()` function, the runner will report an error and exit without making any changes.

## Naming Convention

Migration files follow the pattern:

```
NNN_description_in_snake_case.js
```

Where `NNN` is a zero-padded sequence number (`001`, `002`, `003` ...). The `migrate:new` script handles numbering automatically.

## How State is Tracked

The runner stores a record in the `_migrations` collection in MongoDB for each applied migration:

```json
{
  "name": "001_add_builds_shouldShowInRoster.js",
  "appliedAt": "2025-01-15T10:30:00.000Z"
}
```

This collection is the source of truth for what has and hasn't been applied. It can be inspected directly in MongoDB Compass.

## Configuration

The runner reads from `server/.env`:

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=raven_db
```
