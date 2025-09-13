# Copilot / Automated Agent Instructions

Purpose
- Help an automated coding assistant (Copilot-style) make safe, useful changes to this repository.

Repository overview (short)
- Backend: Go (modules). Main server: `cmd/server/main.go` and HTTP handlers in `internal/handlers/`.
- Data layer: `internal/data/repository.go` (in-memory indexes + JSON persistence under `data/`). Models in `models/`.
- Frontend: Svelte (Vite) in `static/svelte/` with sources under `static/svelte/src/`.
- Scripts: `build_and_run.sh` builds frontend + backend and runs the server.

Quick run / build
- Full (recommended): `./build_and_run.sh` from repo root.
- Frontend only: cd `static/svelte` && `npm install` && `npm run build` (Vite).
- Backend only: `go run ./cmd/server` or `go build -o webgpu ./cmd/server`.
- Ports & endpoints: server exposes API under `/api/*` (see `cmd/server/main.go`). Frontend expects API on same origin; fetch calls use `credentials: 'include'`.

Data & persistence notes
- Persistent JSON files live in `data/` (e.g., `data/users.json`, `data/shaders.json`, `data/tags.json`). The repository code reads/writes these files — treat them as single-writer resources.
- When changing data schema, update `internal/data/repository.go` read/write code and call `buildIndexes()` where appropriate.

Where to make common changes
- Add/change API routes: `internal/handlers/api.go`.
- Business/data logic: `internal/data/repository.go` (thread-safety: `r.mu` usage required).
- Models/types: `models/types.go`.
- Frontend UI components: `static/svelte/src/components/`.
- Frontend stores/state: `static/svelte/src/stores/` (important: do NOT use Svelte `$` store shorthand inside plain `.js` modules; use `get(store)` or `store.subscribe`).
- Network helpers: `static/svelte/src/utils/api.js`.

Coding & style rules (agent-safe)
- Go: run `gofmt` or `go fmt` on changed files. Keep exported names clear. Avoid changing public interfaces without updating call sites.
- JavaScript / Svelte: follow existing conventions: module files use ES modules, Svelte components export props with `export let`. Use `set()`/`update()` on writable stores to trigger reactivity; don't mutate arrays/objects in-place without reassigning.
- Tests & checks: run `go build` after Go changes; run `npm run build` inside `static/svelte` after frontend changes.

Behavioral constraints for the agent
- Make minimal, focused commits. Prefer small atomic changes with clear commit messages.
- When modifying data-layer code (`internal/data/*`) preserve concurrency locking (`r.mu`) and ensure indexes (`shadersByTag`, `shadersByUser`) are updated.
- When changing API signatures, update all call sites (frontend & backend). Prefer adding compatibility shims where possible.
- Do not edit `data/*.json` directly unless explicitly asked. If you must, prefer adding migration code in `internal/data` rather than manual edits.
- Avoid large refactors without user approval. Propose refactors as a plan first.

Validation & quality gates (what the agent must run)
- After Go changes: run `go build ./...` (or at least `go build ./cmd/server`) and fix compile errors.
- After frontend changes: run `cd static/svelte && npm ci && npm run build` and fix build errors.
- Run quick smoke tests: exercise `/api/shaders` and `/api/tags` endpoints (check JSON responses). Verify login/register endpoints return JSON, not HTML.
- For store changes: verify no runtime Svelte errors like "is not a function" due to binding to derived stores (derived stores are read-only).

Useful pointers & known pitfalls
- Svelte store quirk: `$store` syntax only works inside `.svelte` files; inside `.js` files use `get()` from `svelte/store` or `store.subscribe`.
- Tag-filter semantics: server expects `tags` as an array of strings. Query parsing should split comma-separated values and trim whitespace.
- When editing shader/tag search logic, ensure `intersectIDs` semantics (AND vs OR) are explicit and tested.
- Session handling: sessions are stored in memory and cookies are used for authentication. Don't assume persistent sessions across restarts.

Commit messages
- Keep one-line summary + optional body. Examples:
  - "Add CreateUser to repository and wire to /api/register"
  - "Fix TagFilters import + Svelte store usage"
  - "Parse comma-separated tag query params in GetShaders"

If you're blocked or not sure
- Stop and summarize what you'd change and why, with file list and a small test plan, then ask the repo owner.

Contact / assumptions
- Assumes a POSIX environment (macOS / Linux). Node and Go toolchains are available for builds.
- If CI or tests are added later, prefer running them before merging.

---
Generated automatically for agents working on this repository. If you'd like changes to these instructions, open an issue or request an update.
