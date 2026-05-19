#!/usr/bin/env bash
# Migration test: apply → verify → reset → apply → verify
# Usage: ./scripts/test-migrations.sh
# Prerequisites: `supabase start` must be running

set -euo pipefail


db_query() {
  npx supabase db query "$1" 2>&1
}

expected_tables=(
  activity_log
  availability_rules
  blackout_dates
  invoices
  invitations
  locations
  notifications
  organizations
  processed_webhooks
  profiles
  push_subscriptions
  reservations
  tos_versions
)

verify_schema() {
  echo "  → Verifying tables..."
  for table in "${expected_tables[@]}"; do
    result=$(db_query "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'")
    if echo "$result" | grep -q '"cnt": "0"'; then
      echo "  ✗ MISSING table: $table"
      exit 1
    fi
    echo "    ✓ $table"
  done

  echo "  → Verifying RPC functions..."
  for fn in create_reservation_with_locks release_ghost_reservation; do
    result=$(db_query "SELECT COUNT(*) AS cnt FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='${fn}'")
    if echo "$result" | grep -q '"cnt": "0"'; then
      echo "  ✗ MISSING function: $fn"
      exit 1
    fi
    echo "    ✓ $fn()"
  done

  echo "  → Verifying RLS is enabled..."
  for table in "${expected_tables[@]}"; do
    result=$(db_query "SELECT relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='${table}'")
    if echo "$result" | grep -q '"rls": false'; then
      echo "  ✗ RLS NOT enabled on: $table"
      exit 1
    fi
    echo "    ✓ RLS on $table"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo " Nano Spaces — Migration Test Suite"
echo "═══════════════════════════════════════════════════"

echo ""
echo "Pass 1 — Applying migrations from scratch..."
npx supabase db reset --local 2>&1 | grep -E "(Applying|Seeding|ERROR|error)" || true
verify_schema
echo "✓ Pass 1 complete"

echo ""
echo "Pass 2 — Resetting and reapplying (simulates down→up cycle)..."
npx supabase db reset --local 2>&1 | grep -E "(Applying|Seeding|ERROR|error)" || true
verify_schema
echo "✓ Pass 2 complete"

echo ""
echo "═══════════════════════════════════════════════════"
echo " All migration tests passed ✓"
echo "═══════════════════════════════════════════════════"
