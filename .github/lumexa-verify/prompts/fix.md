You are fixing a deployed web app so it matches its PRD. Browser tests ran
against the live app and some failed. Fix the APP so they pass.

## Inputs

- App source — your working directory: `${REPO_DIR}` (a React + Vite
  `frontend/` and an Express + Prisma `backend/`; read `CLAUDE.md` and
  `README-agent.md` first for the layout and conventions).
- PRD: `${WORK}/PRD.md`
- Failing tests with errors and screenshot/trace paths: `${WORK}/failures.md`
- The tests themselves (read-only): `${WORK}/harness/tests/`
- Live app for reproducing: `${APP_URL}` (admin login in env `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`; the `playwright` MCP browser tools are available).

## Rules — a fix that breaks one is thrown away

- Change only application source under `frontend/src/` and `backend/src/`
  (plus `frontend/index.html` if truly needed). Make the smallest change that
  fixes the root cause; keep the existing design, layout and naming.
- Do NOT touch: anything under `.github/`, any `package.json` or lockfile (no new
  dependencies), `backend/prisma/` (no schema or seed changes), Dockerfiles,
  `buildspec.yml`, `backend/bootstrap.js`, `backend/config/index.ts`,
  `backend/src/lib/prisma.ts`, `frontend/.env*`, `backend/public/`, `design-kit/`.
- Do not delete or rename files.
- Do not edit the tests. If you are CERTAIN a failing test is wrong about the
  PRD (not the app), append its exact id (the `## ` heading line from
  `failures.md`, without the `## `) as one line to `${WORK}/invalid-tests.txt`
  and leave the app alone for it.
- A failure that needs a schema change or a new dependency cannot be fixed
  here — skip it and say so.
- Never touch third-party integration code (payment, email/SMS, OAuth, maps,
  AI providers, `backend/src/lib/integrationSeam.ts`, anything under an
  `integrations`/`kits` folder) and never replace a seam's "not configured"
  error with fake output. A test that only fails on a missing integration is
  invalid — list it in `invalid-tests.txt`.
- Nothing that works today may break: before stopping, re-read the tests that
  were passing and make sure your change cannot affect them.
- Never run database commands (`prisma db push`, `migrate`, `seed`) and never
  call the live app's API to change data.

## Before you stop

- `cd backend && npm run build` must succeed.
- `cd frontend && npx vite build --base /` must succeed.

End with a short list: each failing test → fixed (what you changed) / invalid /
not fixable (why).
