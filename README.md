# istore

A file manager with direct-to-storage uploads, nested folders, and expiring
share links. NestJS API, Next.js frontend, nginx in front, Postgres and
MinIO behind.

---

## 1. Running it

**Requires:** Docker with Compose v2. Nothing else — no local Node needed.

```bash
git clone <repo-url> istore && cd istore
make up      # generates secrets + TLS cert, builds, starts, waits until ready
make seed    # creates the demo account below
```

Then open **https://localhost**.

> Your browser will warn about the certificate once. That is expected — the
> cert is self-signed and generated locally, because the alternative is
> committing a private key to the repo. Click through it.

### Demo credentials

| | |
|---|---|
| **Email** | `demo@istore.app` |
| **Password** | `istore-demo-2026` |

Registering a new account works too, and is the normal path.

### Other commands

```bash
make ps       # container status
make logs     # tail all services
make down     # stop         (ARGS=-v also wipes the database and files)
make clean    # stop + wipe + remove generated .env files and certs
make hooks    # enable the git hooks (only if you'll commit)
```

### What `make up` does

`make up` runs `scripts/bootstrap.sh` first, which creates the two things
that are deliberately **not** in git:

- `backend/.env.production` and `frontend/.env.production`, copied from the
  committed `.env.example` files, with a **freshly generated `JWT_SECRET`**.
- A self-signed TLS certificate in `nginx/certs/`.

It is safe to re-run; existing files are never overwritten.

Every environment variable is documented inline in
[`backend/.env.example`](backend/.env.example) and
[`frontend/.env.example`](frontend/.env.example). The API validates all of
them at boot with Joi and **refuses to start** if any is missing or
malformed — a missing secret fails loudly at startup rather than as a
confusing 500 later.

### Working on the code

```bash
make install     # dependencies for both apps
make dev-infra   # Postgres + MinIO only, with host ports published
make lint        # lint + typecheck both apps
make test        # unit tests for both apps
```

Then run `npm run start:dev` (backend) and `npm run dev` (frontend). Set
`STORAGE_PUBLIC_ENDPOINT=http://localhost:9000` in `backend/.env` for this
mode — see §3 for why that value differs under Docker.

Postgres is published on **5434**, not 5432, to avoid colliding with an
existing local Postgres. Override with `POSTGRES_HOST_PORT`.

---

## 2. Architecture

```
                    ┌─────────────────────────────────────────┐
   browser ────────▶│ nginx  (TLS, security headers, limits)   │
        │           └──┬───────────┬──────────────┬───────────┘
        │              │ /         │ /api/*       │ /file-app/*
        │              ▼           ▼              ▼
        │         Next.js      NestJS API      MinIO
        │                          │              ▲
        │                          ▼              │
        │                      Postgres           │
        └─────────── file bytes, direct ──────────┘
```

nginx is the only container with published ports. The API, frontend and
database sit on an internal Docker network and are not reachable from
outside.

**File bytes never pass through the API.** Uploads and downloads go
browser↔storage on presigned URLs. The API only signs URLs and reads object
metadata.

### The upload flow, and the race it avoids

```
POST /uploads/init      → validates size + type, writes a PENDING row,
                          returns a presigned PUT
PUT  <presigned url>    → browser → storage, direct
POST /uploads/:id/complete → HEADs the object, then flips the row to READY
```

The brief asks how `init` and `complete` avoid racing. The answer is that
**everything the server controls is decided at `init`** — owner, folder,
storage key, declared size and content type are all committed before any
bytes exist. `complete` therefore trusts nothing from the client except the
id, which it scopes by owner. Specifically:

- The **storage key is always server-generated**:
  `users/<ownerId>/<fileId>/<sanitised name>`. A client-supplied key would
  let one user overwrite another's object. Filenames are stripped of any
  directory component, so `../../etc/passwd.png` becomes `passwd.png` inside
  the owner's prefix.
- Rows are **`PENDING` until verified**, and PENDING rows are excluded from
  every listing — so a half-finished upload is invisible rather than a
  phantom entry that cannot be opened.
- `complete` is **idempotent**. A client retrying after a dropped response
  gets the same answer rather than an error.
- `complete` trusts the **measured** size from the storage HEAD over the
  declared one.

### Data model

Four tables: `users`, `folders`, `files`, `share_links`. The full schema
with commentary is in
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

**Folder tree: adjacency list, not materialised path.** A materialised path
makes subtree reads cheap but turns *moving* a folder into a subtree-wide
path rewrite. An adjacency list makes a move a single-column update, and
Postgres recursive CTEs handle the subtree reads. Since a file/folder move
is the most likely next feature, I optimised for the operation that would
otherwise get expensive.

**Moving is a single-column update**, which is the payoff of that choice.
`PATCH /files/:id` and `PATCH /folders/:id` accept a destination alongside an
optional new name, where `folderId`/`parentId` distinguishes three cases:
omitted means "not a move", `null` means "move to root", and a uuid means
that folder. Moving a folder runs one recursive query first to reject moving
it into itself or any of its own descendants — that would detach the subtree
from the root and leave the recursive CTEs looping forever. A move never
touches object storage: the storage key is immutable, so an existing share
link keeps working.

**Soft-delete cascade is one statement, not a tree walk.** Deleting a folder
runs a recursive CTE that collects the subtree, then two data-modifying CTEs
that mark the folders and their files *in the same snapshot*:

```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
  UNION ALL
  SELECT child.id FROM folders child
    JOIN subtree ON child.parent_id = subtree.id
   WHERE child.deleted_at IS NULL
), deleted_folders AS ( UPDATE folders ... RETURNING id ),
   deleted_files   AS ( UPDATE files   ... RETURNING id )
SELECT ...counts...
```

That makes the cascade atomic — there is no window where a child is deleted
but its parent is not — and costs one round trip regardless of depth. The
anchor row carries `owner_id`, so the recursion can only ever walk a tree
the caller owns. Verified against a four-level tree.

**Folder size rollup is computed, not stored.** A denormalised counter needs
updating on every upload, delete and move, and any missed path leaves a
permanently wrong number that nothing detects. The recursive sum is a query.

**Share tokens are stored only as SHA-256 hashes.** A database leak
therefore yields no usable share URLs. SHA-256 rather than bcrypt because
the lookup must be an indexed equality match and the token is 256 bits of
CSPRNG output, not a low-entropy password — the slow-hash property buys
nothing here.

**Share expiry is enforced in the WHERE clause**, per the brief:

```ts
where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() },
         file: { deletedAt: null, status: 'READY' } }
```

There is no code path where a forgotten `if` could serve an expired link,
and soft-deleting a file kills its share links implicitly as a consequence.

### Ownership

Every data query scopes by `ownerId` **in the WHERE clause** rather than
fetching a row and comparing afterwards, so a missed check returns nothing
instead of silently leaking. Mutations use `updateMany` for the same reason:
a mismatched owner updates zero rows.

Authentication is deny-by-default — a global `JwtAuthGuard` protects every
route and `@Public()` is the explicit opt-out, so forgetting a decorator
fails closed (401) rather than exposing an endpoint.

Verified: a second user gets **404 on every endpoint** for another user's
file or folder — read, rename, delete, download, complete-upload, share,
revoke, and creating a subfolder under it.

### Auth

JWT in an **httpOnly cookie** set by the API. Because nginx serves the app
and API from one origin, the browser attaches it automatically — so the
frontend never handles a token and JavaScript cannot read it, which means an
XSS bug cannot exfiltrate the session. `SameSite=lax` blocks the cross-site
POST that CSRF relies on. The `Authorization: Bearer` header still works for
non-browser clients.

Login **cannot be used to enumerate accounts**: "unknown email" and "wrong
password" return an identical message *and* both perform a bcrypt
comparison, so they cannot be distinguished by response time either.

### Why nginx proxies object storage

`/file-app/*` is proxied to MinIO. This is not cosmetic. The browser uploads
directly to storage, and pointing it at `http://minio:9000` failed twice
over: the page is HTTPS so the request is mixed content, **and** our own CSP
`connect-src 'self'` blocks a cross-origin upload XHR. Serving storage from
the same origin fixes both without weakening the CSP. The path and `Host`
pass through unchanged because SigV4 signs both.

---

## 3. Frontend

Feature-first: each feature under `src/modules/<feature>/` owns its
components, hooks, services and types. Shared primitives live in
`src/common/`. Components render; hooks hold state and effects; services own
every network call — no component calls `fetch` directly.

**Server state is TanStack Query; client state is local.** There is no
global store, because after separating server state there was almost nothing
left to put in one — view mode and which row is being renamed are local
concerns. Adding Redux or Zustand would have been ceremony.

**Upload progress uses `XMLHttpRequest`, not `fetch`.** `fetch` cannot
report request upload progress in any current browser, so it could only have
produced the indeterminate spinner the brief explicitly rules out. Each file
runs its own independent `init → PUT → complete` chain, so one failure never
stops the rest of the batch.

**Optimistic where it is safe, and not where it isn't.** Creating and
renaming apply immediately with a snapshot rollback on failure. **Deletes
are deliberately not optimistic** — a delete that appeared to succeed and
then failed would tell someone their file is gone when it still exists,
which is worse than a brief wait. Optimistic folders carry a placeholder id
and render non-navigable, because opening one would 404 before the server
responds.

**Move has two paths, because drag-and-drop is not accessible.** Dragging a
row onto a folder is the fast path, but it is unusable with a keyboard or a
screen reader, so every item's action menu also has "Move to…", which opens
a destination picker. Drops use a custom MIME type so a row-drag is never
confused with a file dragged in from the desktop, which the upload dropzone
handles. Moves are not optimistic: the item leaves the current view entirely
and the server can legitimately refuse the move.

**Navigation lives in the URL** (`/files/[id]`), so the back button and
pasted links both work.

**Theming is token-paired.** A light pink surface and the text on it are
defined together (`--brand-surface` / `--brand-on-surface`) and both flip in
dark mode. This came from a real bug: I first used the raw pink scale, which
is theme-invariant, with `text-foreground`, which is not — so the call-to-
action band rendered as near-white text on near-white pink, a contrast ratio
of **1.00:1**. It is now 15:1. There are no `dark:` variants left in the
codebase; the tokens handle it.

**Accessibility:** semantic landmarks, a skip link, labelled inputs with
`aria-describedby` error wiring, `aria-pressed` on the view toggle,
`role="progressbar"` on upload bars, keyboard-operable rows (Enter to open,
F2 to rename), Escape-dismissible menus and dialogs, one consistent
focus-visible treatment, and `prefers-reduced-motion` respected. Colour is
never the only carrier of meaning — the shared badge and file-type icons
differ by shape and text too.

---

### Test coverage, honestly

52 backend unit tests covering auth, the upload state machine, storage-key
sanitisation, folder ownership and share-token behaviour; 3 frontend
component tests. **The recursive CTE logic is not unit-tested** — against a
mock, such a test would only prove `$queryRaw` was called, not that the SQL
is correct, which is a test that passes while the feature is broken. Those
paths were verified against a real Postgres instead, including reading
`deleted_at` directly out of the database to confirm the cascade was a soft
delete. The unit tests cover the ownership and control flow around them.

---

## 5. What I would do differently

**Commit the browser tests.** Two bugs shipped past a green API test suite
and were only caught by driving a real browser: presigned uploads blocked by
our own CSP, and a dark-mode contrast failure that made a whole section
invisible. Both were invisible to `curl`. That is the strongest argument for
a Playwright suite in CI, and it is the first thing I would add.

**Make the healthcheck assert schema state.** A corrupted Docker build layer
once produced a zero-byte `schema.prisma`; `prisma migrate deploy` exited 0
without applying anything, and the API started **healthy** against a
database with no tables — because the healthcheck only pings the connection.
Asserting migration state would have caught it, though it is a real tradeoff:
a healthcheck that fails during a rolling migration causes its own outage.

**Paginate the listings.** `GET /folders/:id` returns every child. Fine for
a demo, wrong for a folder with 10,000 files. Search is already capped at 50.

**Reconsider size enforcement.** A presigned `PUT` cannot enforce a size
limit at the storage layer — only a presigned `POST` policy can. Today a
client can push 12MB through a URL issued for 70 bytes; storage accepts it
and `complete` rejects it on the measured size, so the file never becomes
visible, but an orphaned object is left behind. A POST policy would refuse
it outright.

**Add structured audit logging.** Every log line carries a `traceId` and the
error envelope returns it, but there is no durable record of who did what.

---

## Notes

- **Ports:** 80/443 (nginx), 9000/9001 (MinIO API + console), 5434
  (Postgres, dev overlay only). MinIO's console is at http://localhost:9001
  with the credentials in `backend/.env.example`.
- **Migrations** run as a one-shot container before the API starts, so the
  Prisma CLI never ships in the runtime image and the API cannot start
  against an out-of-date schema.
- **Images** are multi-stage and run as non-root with read-only root
  filesystems and `no-new-privileges`, including nginx.
- **Git hooks** (`.githooks/`) run lint + typecheck pre-commit and tests +
  builds pre-push. There is deliberately no root `package.json` — git hooks
  are per-repository, so one shared hook invokes each app's own scripts.
