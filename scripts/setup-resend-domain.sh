#!/usr/bin/env bash
#
# One-time setup: register the OViz email-sending domain with Resend.
#
# This is NOT part of `npm run build`. Run it once per Resend account/
# environment, before patient email intake can send mail. Re-running is
# harmless — Resend returns the existing domain if it already exists.
#
# After it succeeds, add the DKIM/SPF DNS records Resend prints to the
# mail.oviz.ca DNS zone, then verify the domain in the Resend dashboard.
# Email intake itself is sent via the Resend REST API (fetch), not this CLI.
#
# Requires:
#   - RESEND_API_KEY in the environment
#   - the Resend CLI on PATH (https://resend.com/docs/cli), or run via npx
#
# Usage:
#   RESEND_API_KEY=re_xxx ./scripts/setup-resend-domain.sh

set -euo pipefail

DOMAIN="mail.oviz.ca"

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "error: RESEND_API_KEY is not set." >&2
  echo "       export RESEND_API_KEY=re_... and re-run." >&2
  exit 1
fi

if ! command -v resend >/dev/null 2>&1; then
  echo "error: the 'resend' CLI is not on PATH." >&2
  echo "       Install it (https://resend.com/docs/cli) or run the command via npx." >&2
  exit 1
fi

echo "Creating Resend sending domain: ${DOMAIN}"
resend domains create \
  --name "${DOMAIN}"

echo "Done. Add the printed DKIM/SPF records to the ${DOMAIN} DNS zone and verify in Resend."
