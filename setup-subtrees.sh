#!/bin/bash
# Setup git subtrees for packages
# Run this from the project root: bash setup-subtrees.sh

set -e

echo "Setting up git subtrees for outliner and llm-runtime..."

# Remove the .git directories from packages (they will be managed as subtrees)
echo "Removing package .git directories..."
rm -rf packages/outliner/.git
rm -rf packages/llm-runtime/.git

# Add packages to the main repo
echo "Adding packages to main repo..."
git add packages/

# Commit the packages
echo "Committing packages..."
git commit -m "Add outliner and llm-runtime packages to monorepo"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Push to main repo: git push origin main"
echo "2. To push packages to their separate repos, use:"
echo "   npm run push:outliner"
echo "   npm run push:llm-runtime"
echo ""
echo "Note: The first subtree push may take a moment as it creates the history."
