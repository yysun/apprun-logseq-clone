# Monorepo Setup Guide

This project uses npm workspaces to manage multiple packages in a monorepo structure with git subtrees for syncing to separate GitHub repositories.

## Structure

```
apprun-logseq-clone/
├── packages/
│   ├── outliner/          # Syncs to github.com/yysun/outliner
│   └── llm-runtime/       # Syncs to github.com/yysun/llm-runtime
└── src/                   # Main application code
```

## Local Development

All packages are automatically symlinked via npm workspaces:

```bash
# Install all dependencies (including workspace packages)
npm install

# Work on any package
code packages/outliner/src/index.ts
code packages/llm-runtime/src/index.ts

# Changes are immediately available (no need to rebuild/reinstall)
import { something } from 'outliner'  # Uses packages/outliner
```

## Committing Changes

### 1. Commit to main repo (local development)

```bash
# Make changes to any package
git add packages/outliner/src/
git commit -m "Add new feature to outliner"
git push origin main
```

### 2. Push to separate GitHub repos

After committing to main repo, sync changes to individual package repos:

```bash
# Push outliner changes
npm run push:outliner

# Push llm-runtime changes
npm run push:llm-runtime
```

## Pulling Updates

If someone makes changes directly to the separate repos:

```bash
# Pull outliner updates
npm run pull:outliner

# Pull llm-runtime updates
npm run pull:llm-runtime
```

## Manual Git Subtree Commands

If you need more control:

```bash
# Push specific package
git subtree push --prefix packages/outliner https://github.com/yysun/outliner.git main

# Pull specific package
git subtree pull --prefix packages/outliner https://github.com/yysun/outliner.git main --squash

# Split and force push (if histories diverge)
git subtree split --prefix packages/outliner -b temp-outliner
git push https://github.com/yysun/outliner.git temp-outliner:main --force
git branch -D temp-outliner
```

## First-Time Setup (Already Done)

For reference, here's what was set up:

1. Created `packages/` directory
2. Copied existing packages into it
3. Added `workspaces` to package.json
4. Added workspace dependencies: `"outliner": "workspace:*"`
5. Added npm scripts for push/pull
6. Updated .gitignore to exclude package build artifacts

## Publishing Packages to npm

Each package can be published independently:

```bash
cd packages/outliner
npm version patch  # or minor, major
npm publish

cd ../llm-runtime
npm version patch
npm publish
```

## Troubleshooting

**Symlinks not working?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Subtree push failing?**
```bash
# Make sure you have a clean working tree
git status

# Try splitting manually
git subtree split --prefix packages/outliner -b temp-branch
git push https://github.com/yysun/outliner.git temp-branch:main
git branch -D temp-branch
```

**Package changes not reflected?**
- Workspace packages update immediately (no rebuild needed)
- Just import and use: `import { foo } from 'outliner'`
