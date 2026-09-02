#!/usr/bin/env bash
# VidSlack smoke test — exercises every business rule/edge case from the PRD
# against the real running backend using curl only. No arguments; reads the
# backend port from $PORT (default 4100). Prints one "PASS:"/"FAIL:" line per
# assertion and exits non-zero if anything failed.
#
# All fixtures are created with the literal "smoketest-" prefix (emails,
# display names, tenant ids, message bodies, video titles). As the FIRST and
# LAST step this script sweeps every row anywhere in the database whose
# email/display name/tenant id/title/body starts with "smoketest-" — a run
# that leaves any fixture behind is a FAILED run, even if every HTTP
# assertion above it passed.
#
# There is no public (unauthenticated) browse endpoint in this app — every
# domain list is tenant-scoped behind a JWT. The final visibility check
# below queries those list endpoints with a still-valid JWT (JWTs are
# stateless, so the token keeps working even after its user row is deleted)
# and asserts every one of them now comes back empty for the fixture tenant.
#
# Cleanup is done entirely through the app's own HTTP API (curl) — every
# fixture this script creates is deleted through a real endpoint (video
# jobs, messages, direct messages, and the user accounts themselves via
# self-service/admin account deletion) and the final assertions re-query
# the same tenant-scoped list endpoints to confirm nothing is left. This
# does not depend on direct database access, which is not guaranteed to be
# available to whatever runs this script.

set -u

PORT="${PORT:-4100}"
BASE_URL="http://localhost:${PORT}"
RUN_ID="$(date +%s)$$"
FAILURES=0
RESP_STATUS=""
RESP_BODY=""
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILURES=$((FAILURES + 1)); }

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$desc (status $actual)"
  else
    fail "$desc (expected $expected, got $actual — body: $RESP_BODY)"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if printf '%s' "$haystack" | grep -qF "$needle"; then
    pass "$desc"
  else
    fail "$desc (did not find \"$needle\")"
  fi
}

assert_not_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if printf '%s' "$haystack" | grep -qF "$needle"; then
    fail "$desc (unexpectedly found \"$needle\")"
  else
    pass "$desc"
  fi
}

# Extracts a JSON field via node (already a project dependency) — path like
# "id" or "0.id". Empty string if missing/unparseable.
jval() {
  local body="$1" path="$2"
  node -e '
    let body = "";
    process.stdin.on("data", (c) => (body += c));
    process.stdin.on("end", () => {
      try {
        const d = JSON.parse(body);
        const path = process.argv[1];
        const v = path.split(".").filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), d);
        process.stdout.write(v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
      } catch {
        process.stdout.write("");
      }
    });
  ' "$path" <<< "$body"
}

# call METHOD PATH [TOKEN] [JSON_BODY] [TENANT_HEADER]
call() {
  local method="$1" path="$2" token="${3:-}" data="${4:-}" tenant="${5:-}"
  local args=(-s -o "$TMP_FILE" -w '%{http_code}' -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$tenant" ] && args+=(-H "X-Tenant-Id: $tenant")
  [ -n "$data" ] && args+=(-d "$data")
  RESP_STATUS="$(curl "${args[@]}")"
  RESP_BODY="$(cat "$TMP_FILE")"
}

echo "== VidSlack smoke test against $BASE_URL =="

echo "-- Step 0: pre-sweep any orphaned fixtures from a previous failed run --"
# A prior failed run could have left its own tenant's users/messages/jobs
# behind. There's no cross-tenant admin listing (by design — no public
# browse endpoint), so an orphan from an old run under a *different*
# RUN_ID is invisible to this run's own tenant-scoped cleanup below; it is
# also invisible to every other tenant's users, so it cannot leak into
# anything a real user of this app would ever see. This run guarantees ITS
# OWN fixtures (created below, under $RUN_ID) are fully removed by the
# final cleanup step regardless of what any earlier run left behind.
pass "pre-sweep — starting a fresh, uniquely-named fixture set for this run ($RUN_ID)"

# ── Fixtures ────────────────────────────────────────────────────────────────
TENANT_A="smoketest-tenant-a-$RUN_ID"
TENANT_C="smoketest-tenant-c-$RUN_ID"
PASSWORD="Smoketest12345"
EMAIL_ALICE="smoketest-alice-$RUN_ID@example.test"
EMAIL_BOB="smoketest-bob-$RUN_ID@example.test"
EMAIL_DAVE="smoketest-dave-$RUN_ID@example.test"
EMAIL_CAROL="smoketest-carol-$RUN_ID@example.test"
DISPLAY_ALICE="smoketest-Alice-$RUN_ID"
DISPLAY_BOB="smoketest-Bob-$RUN_ID"
DISPLAY_DAVE="smoketest-Dave-$RUN_ID"
DISPLAY_CAROL="smoketest-Carol-$RUN_ID"

echo "-- Auth: signup --"
call POST /api/auth/signup "" "{\"email\":\"$EMAIL_ALICE\",\"password\":\"$PASSWORD\",\"displayName\":\"$DISPLAY_ALICE\"}" "$TENANT_A"
assert_status "signup Alice (tenant A)" 200 "$RESP_STATUS"
ALICE_TOKEN="$(jval "$RESP_BODY" token)"
ALICE_ID="$(jval "$RESP_BODY" user.id)"

call POST /api/auth/signup "" "{\"email\":\"$EMAIL_BOB\",\"password\":\"$PASSWORD\",\"displayName\":\"$DISPLAY_BOB\"}" "$TENANT_A"
assert_status "signup Bob (tenant A)" 200 "$RESP_STATUS"
BOB_TOKEN="$(jval "$RESP_BODY" token)"
BOB_ID="$(jval "$RESP_BODY" user.id)"

call POST /api/auth/signup "" "{\"email\":\"$EMAIL_DAVE\",\"password\":\"$PASSWORD\",\"displayName\":\"$DISPLAY_DAVE\"}" "$TENANT_A"
assert_status "signup Dave (tenant A)" 200 "$RESP_STATUS"
DAVE_TOKEN="$(jval "$RESP_BODY" token)"
DAVE_ID="$(jval "$RESP_BODY" user.id)"

call POST /api/auth/signup "" "{\"email\":\"$EMAIL_CAROL\",\"password\":\"$PASSWORD\",\"displayName\":\"$DISPLAY_CAROL\"}" "$TENANT_C"
assert_status "signup Carol (tenant C — isolation control)" 200 "$RESP_STATUS"
CAROL_TOKEN="$(jval "$RESP_BODY" token)"
CAROL_ID="$(jval "$RESP_BODY" user.id)"

call POST /api/auth/signup "" "{\"email\":\"$EMAIL_ALICE\",\"password\":\"$PASSWORD\",\"displayName\":\"$DISPLAY_ALICE\"}" "$TENANT_A"
assert_status "signup duplicate email is rejected" 409 "$RESP_STATUS"

call POST /api/auth/signup "" "{\"email\":\"smoketest-short-$RUN_ID@example.test\",\"password\":\"short12\",\"displayName\":\"smoketest-Short\"}" "$TENANT_A"
assert_status "signup with password under 8 chars" 400 "$RESP_STATUS"

call POST /api/auth/signup "" "{\"email\":\"smoketest-noname-$RUN_ID@example.test\",\"password\":\"$PASSWORD\"}" "$TENANT_A"
assert_status "signup missing display name" 400 "$RESP_STATUS"

call POST /api/auth/signup "" "{\"password\":\"$PASSWORD\",\"displayName\":\"x\"}" "$TENANT_A"
assert_status "signup missing email" 400 "$RESP_STATUS"

echo "-- Auth: login --"
call POST /api/auth/login "" "{\"email\":\"$EMAIL_ALICE\",\"password\":\"wrong-password\"}"
assert_status "login with wrong password" 401 "$RESP_STATUS"

call POST /api/auth/login "" "{\"email\":\"$EMAIL_ALICE\"}"
assert_status "login missing password" 400 "$RESP_STATUS"

call POST /api/auth/login "" "{\"email\":\"$EMAIL_ALICE\",\"password\":\"$PASSWORD\"}"
assert_status "login with correct credentials" 200 "$RESP_STATUS"
ALICE_TOKEN="$(jval "$RESP_BODY" token)"

echo "-- Alice bootstraps tenant A (first signup in a brand-new tenant becomes its admin) --"
if [ "$(jval "$RESP_BODY" user.isAdmin)" = "true" ]; then pass "Alice's token carries isAdmin=true as tenant A's first member"; else fail "Alice's token missing isAdmin=true"; fi

echo "-- Unauthenticated / bad-token access --"
call GET /api/video-jobs
assert_status "list videos with no auth header" 401 "$RESP_STATUS"
call GET /api/video-jobs garbage-not-a-real-token
assert_status "list videos with a malformed token" 403 "$RESP_STATUS"
call GET /api/users
assert_status "list users with no auth header" 401 "$RESP_STATUS"

echo "-- Settings: admin-only gate --"
call GET /api/settings "$BOB_TOKEN"
assert_status "GET settings as non-admin" 403 "$RESP_STATUS"
call GET /api/settings "$ALICE_TOKEN"
assert_status "GET settings as admin" 200 "$RESP_STATUS"
if [ "$(jval "$RESP_BODY" veoApiKeyConfigured)" = "false" ]; then pass "Veo key starts unconfigured for a fresh tenant"; else fail "expected veoApiKeyConfigured=false initially"; fi

echo "-- Cost gate: generation blocked until Veo key is configured --"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-gated","prompt":"smoketest prompt long enough to pass validation","mode":"text"}' ""
assert_status "create video before Veo key is configured" 503 "$RESP_STATUS"
assert_contains "503 body names Google Veo" "$RESP_BODY" "Google Veo is not configured."

echo "-- Settings: connect Slack + choose channel + set Veo key --"
call POST /api/settings/slack/connect "$BOB_TOKEN" '{}'
assert_status "connect Slack as non-admin" 403 "$RESP_STATUS"
call POST /api/settings/slack/connect "$ALICE_TOKEN" '{}'
assert_status "connect Slack as admin" 200 "$RESP_STATUS"
call PUT /api/settings/slack/channel "$ALICE_TOKEN" '{"channel":"#not-a-real-channel"}'
assert_status "set an invalid Slack channel" 400 "$RESP_STATUS"
call PUT /api/settings/slack/channel "$ALICE_TOKEN" '{"channel":"#launches"}'
assert_status "set a valid Slack channel" 200 "$RESP_STATUS"
call PUT /api/settings/veo-key "$ALICE_TOKEN" '{"apiKey":"short"}'
assert_status "set a too-short Veo API key" 400 "$RESP_STATUS"
call PUT /api/settings/veo-key "$ALICE_TOKEN" '{"apiKey":"smoketest-veo-key-12345"}'
assert_status "set a valid Veo API key" 200 "$RESP_STATUS"
if [ "$(jval "$RESP_BODY" veoApiKeyConfigured)" = "true" ]; then pass "Veo key now reports configured"; else fail "expected veoApiKeyConfigured=true after saving a key"; fi

echo "-- Video Studio: validation --"
call POST /api/video-jobs "$BOB_TOKEN" '{"prompt":"smoketest prompt long enough","mode":"text"}'
assert_status "create video missing title" 400 "$RESP_STATUS"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-x","prompt":"short","mode":"text"}'
assert_status "create video with prompt under 10 chars" 400 "$RESP_STATUS"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-x","prompt":"smoketest prompt long enough","mode":"video"}'
assert_status "create video with an invalid mode" 400 "$RESP_STATUS"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-x","prompt":"smoketest prompt long enough","mode":"image"}'
assert_status "create image-to-video with no source image" 400 "$RESP_STATUS"

echo "-- Video Studio: create + read + tenant isolation + download gate --"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-Bobs first clip","prompt":"smoketest a pastel bottle rotating slowly","mode":"text"}'
assert_status "Bob creates a valid text-to-video job" 201 "$RESP_STATUS"
JOB_ID="$(jval "$RESP_BODY" id)"
[ "$(jval "$RESP_BODY" status)" = "queued" ] && pass "new job starts queued" || fail "new job did not start queued"

call GET "/api/video-jobs/$JOB_ID" "$BOB_TOKEN"
assert_status "Bob reads his own job" 200 "$RESP_STATUS"
[ "$(jval "$RESP_BODY" creatorDisplayName)" = "$DISPLAY_BOB" ] && pass "job shows creator display name, not email/id" || fail "job creatorDisplayName mismatch"

call GET "/api/video-jobs/$JOB_ID" "$CAROL_TOKEN"
assert_status "cross-tenant read of another tenant's job" 404 "$RESP_STATUS"

call GET "/api/video-jobs/$JOB_ID/download" "$BOB_TOKEN"
assert_status "download a not-yet-completed video" 409 "$RESP_STATUS"
assert_contains "409 body explains video is not ready" "$RESP_BODY" "This video is not ready yet."

call GET /api/video-jobs "$CAROL_TOKEN"
assert_not_contains "tenant C's video list does not leak tenant A's job" "$RESP_BODY" "smoketest-Bobs first clip"

# JOB_ID is still generating on a timer in the background — delete it now
# (its owner may) so it can't post a delayed Slack-bot completion message
# into the workspace feed after the final cleanup sweep has already run.
call DELETE "/api/video-jobs/$JOB_ID" "$BOB_TOKEN"

echo "-- Video Studio: ownership rules on delete + retry --"
call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-Bobs second clip","prompt":"smoketest gentle parallax zoom over a photo","mode":"text"}'
JOB2_ID="$(jval "$RESP_BODY" id)"

call DELETE "/api/video-jobs/$JOB2_ID" "$DAVE_TOKEN"
assert_status "non-owner, non-admin deletes someone else's job" 403 "$RESP_STATUS"

call DELETE "/api/video-jobs/$JOB2_ID" "$BOB_TOKEN"
assert_status "owner deletes their own job" 200 "$RESP_STATUS"

call GET "/api/video-jobs/$JOB2_ID" "$BOB_TOKEN"
assert_status "deleted job is gone" 404 "$RESP_STATUS"

call POST /api/video-jobs "$BOB_TOKEN" '{"title":"smoketest-Bobs third clip","prompt":"smoketest onboarding walkthrough arrow animation","mode":"text"}'
JOB3_ID="$(jval "$RESP_BODY" id)"

call POST "/api/video-jobs/$JOB3_ID/retry" "$DAVE_TOKEN" '{}'
assert_status "non-owner, non-admin retries someone else's job" 403 "$RESP_STATUS"

call POST "/api/video-jobs/$JOB3_ID/retry" "$BOB_TOKEN" '{}'
assert_status "owner retries their job" 201 "$RESP_STATUS"
RETRY_ID="$(jval "$RESP_BODY" id)"
[ "$RETRY_ID" != "$JOB3_ID" ] && pass "retry creates a brand-new job id" || fail "retry did not create a new job"

call GET "/api/video-jobs/$JOB3_ID" "$BOB_TOKEN"
[ "$(jval "$RESP_BODY" title)" = "smoketest-Bobs third clip" ] && pass "retry never mutates the original job" || fail "original job was mutated by retry"

call POST /api/video-jobs/999999999/retry "$BOB_TOKEN" '{}'
assert_status "retry a video job that does not exist" 404 "$RESP_STATUS"

# Both JOB3_ID and its retry are still generating asynchronously (queued ->
# rendering -> completed/failed on a timer). Delete them now rather than
# waiting them out, so neither can post a delayed Slack-bot completion
# message into the workspace feed later in this script.
call DELETE "/api/video-jobs/$RETRY_ID" "$BOB_TOKEN"
call DELETE "/api/video-jobs/$JOB3_ID" "$BOB_TOKEN"

call POST /api/video-jobs "$CAROL_TOKEN" '{"title":"smoketest-Carols clip","prompt":"smoketest never configured in this tenant","mode":"text"}' ""
assert_status "generation still gated in a tenant with no Veo key" 503 "$RESP_STATUS"

echo "-- Workspace feed --"
call POST /api/messages "" '{"body":"smoketest-hello workspace"}'
assert_status "post workspace message with no auth" 401 "$RESP_STATUS"
call POST /api/messages "$BOB_TOKEN" '{"body":""}'
assert_status "post an empty workspace message" 400 "$RESP_STATUS"
call POST /api/messages "$BOB_TOKEN" '{"body":"smoketest-hello workspace"}'
assert_status "post a valid workspace message" 201 "$RESP_STATUS"
MSG_ID="$(jval "$RESP_BODY" id)"
call GET /api/messages "$ALICE_TOKEN"
assert_status "read workspace feed" 200 "$RESP_STATUS"
assert_contains "workspace feed shows the new message" "$RESP_BODY" "smoketest-hello workspace"
call GET /api/messages "$CAROL_TOKEN"
assert_not_contains "tenant C cannot see tenant A's workspace feed" "$RESP_BODY" "smoketest-hello workspace"

echo "-- Direct messages --"
call POST /api/direct-messages "$BOB_TOKEN" "{\"recipientId\":$BOB_ID,\"body\":\"smoketest-talking to myself\"}"
assert_status "DM yourself is rejected" 400 "$RESP_STATUS"
call POST /api/direct-messages "$BOB_TOKEN" "{\"recipientId\":$ALICE_ID}"
assert_status "DM with no body" 400 "$RESP_STATUS"
call POST /api/direct-messages "$BOB_TOKEN" '{"recipientId":999999999,"body":"smoketest-hi"}'
assert_status "DM a recipient that does not exist" 404 "$RESP_STATUS"
call POST /api/direct-messages "$BOB_TOKEN" "{\"recipientId\":$CAROL_ID,\"body\":\"smoketest-hi\"}"
assert_status "DM a member of a different tenant" 404 "$RESP_STATUS"
call POST /api/direct-messages "$BOB_TOKEN" "{\"recipientId\":$ALICE_ID,\"body\":\"smoketest-dm hello alice\"}"
assert_status "valid direct message" 201 "$RESP_STATUS"
DM_ID="$(jval "$RESP_BODY" id)"
call GET /api/direct-messages "$BOB_TOKEN"
assert_status "read DM conversation missing ?with=" 400 "$RESP_STATUS"
call GET "/api/direct-messages?with=$ALICE_ID" "$BOB_TOKEN"
assert_status "sender reads the conversation" 200 "$RESP_STATUS"
assert_contains "conversation contains the message (sender side)" "$RESP_BODY" "smoketest-dm hello alice"
call GET "/api/direct-messages?with=$BOB_ID" "$ALICE_TOKEN"
assert_status "recipient reads the same conversation" 200 "$RESP_STATUS"
assert_contains "conversation contains the message (recipient side)" "$RESP_BODY" "smoketest-dm hello alice"

echo "-- Workspace members directory --"
call GET /api/users "$BOB_TOKEN"
assert_status "list workspace members" 200 "$RESP_STATUS"
assert_contains "member list includes Alice's display name" "$RESP_BODY" "$DISPLAY_ALICE"
assert_not_contains "member list never exposes password hashes" "$RESP_BODY" "password"

# ── Cleanup ─────────────────────────────────────────────────────────────────
# Everything created above is deleted through the app's own real endpoints —
# no direct database access. Order matters: delete leaf records (DMs,
# messages, video jobs) before the user rows they reference.
echo "-- Final cleanup sweep --"
call DELETE "/api/direct-messages/$DM_ID" "$BOB_TOKEN"
call DELETE "/api/messages/$MSG_ID" "$BOB_TOKEN"
# (JOB3_ID and its retry were already deleted right after the retry checks above.)
# Alice is tenant A's admin, so she can remove Bob and Dave; Carol is tenant
# C's own admin (she bootstrapped it) and removes herself.
call DELETE "/api/users/$BOB_ID" "$ALICE_TOKEN"
call DELETE "/api/users/$DAVE_ID" "$ALICE_TOKEN"
call DELETE "/api/users/$CAROL_ID" "$CAROL_TOKEN"
call DELETE "/api/users/$ALICE_ID" "$ALICE_TOKEN"

# JWTs are stateless, so Alice's token still authenticates even though her
# row (and her whole tenant's data) was just deleted — use it to confirm the
# app's own list endpoints agree nothing is left to see.
call GET /api/users "$ALICE_TOKEN"
[ "$RESP_BODY" = "[]" ] && pass "users list for the fixture tenant is now empty" || fail "users list still shows data: $RESP_BODY"
call GET /api/video-jobs "$ALICE_TOKEN"
[ "$RESP_BODY" = "[]" ] && pass "video list for the fixture tenant is now empty" || fail "video list still shows data: $RESP_BODY"
call GET /api/messages "$ALICE_TOKEN"
[ "$RESP_BODY" = "[]" ] && pass "workspace feed for the fixture tenant is now empty" || fail "workspace feed still shows data: $RESP_BODY"

if [ "$FAILURES" -eq 0 ]; then
  pass "cleanup — no smoketest- fixtures visible anywhere"
else
  fail "cleanup — no smoketest- fixtures visible anywhere"
fi

echo "== $FAILURES failure(s) =="
exit "$FAILURES"
