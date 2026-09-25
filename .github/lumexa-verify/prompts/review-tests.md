You wrote functional browser tests for a live web app (tests in
`${WORK}/harness/tests/`, PRD in `${WORK}/PRD.md`, app source read-only in
`${REPO_DIR}`, live app at `${APP_URL}`, admin login in env `ADMIN_EMAIL` /
`ADMIN_PASSWORD`, `playwright` MCP browser tools available).

The latest run's failures are in `${WORK}/failures.md`. Before anyone changes
the app because of them, each failure must be a REAL functional bug.

For every failing test, reproduce it in the browser and decide:
- The test is wrong — bad selector, wrong assumption about how the feature
  works, or it checks something that is not functional (wording, labels, copy,
  exact routes, HTTP codes, internals, third-party integrations, out-of-scope
  items) → fix the test, or delete that assertion/test.
- The feature genuinely does not work as the PRD requires → leave it failing.

Do not weaken a test that catches a real functional bug. Do not change the app.

When done, run the whole suite in the FOREGROUND and wait for it to finish:
`cd ${WORK}/harness && npx playwright test`
Never run it in the background and never stop while it is running. End with the
list of remaining failures and, for each, the functional bug it proves.
