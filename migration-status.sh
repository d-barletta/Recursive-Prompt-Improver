#!/bin/bash

# Script to check migration status from Carbon to shadcn/ui

echo "======================================"
echo "Carbon to shadcn/ui Migration Status"
echo "======================================"
echo ""

echo "Files with Carbon React imports:"
grep -rl "@carbon/react" src/ --include="*.js" --include="*.jsx" | wc -l

echo ""
echo "Files with Carbon Icons imports:"
grep -rl "@carbon/icons-react" src/ --include="*.js" --include="*.jsx" | wc -l

echo ""
echo "Detailed breakdown:"
echo ""

echo "=== Pages ==="
find src/pages -name "*.js" -exec bash -c '
  if grep -q "@carbon" "$1"; then
    echo "  ❌ $(basename "$1")"
  else
    echo "  ✅ $(basename "$1")"
  fi
' _ {} \;

echo ""
echo "=== Components ==="
find src/components -maxdepth 2 -name "*.js" -exec bash -c '
  if grep -q "@carbon" "$1"; then
    echo "  ❌ $(basename "$1")"
  else
    echo "  ✅ $(basename "$1")"
  fi
' _ {} \;

echo ""
echo "=== Modals ==="
find src/components/modals -name "*.js" -exec bash -c '
  if grep -q "@carbon" "$1"; then
    echo "  ❌ $(basename "$1")"
  else
    echo "  ✅ $(basename "$1")"
  fi
' _ {} \;

echo ""
echo "======================================"
echo "Legend:"
echo "  ✅ = Migrated (no Carbon imports)"
echo "  ❌ = Needs migration (has Carbon imports)"
echo "======================================"
