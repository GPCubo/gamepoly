Implement a spec step by step, marking acceptance criteria as completed as they are done, and update the spec status when finished.

**User input:** $ARGUMENTS
(Spec name or ID, e.g. `SPEC-002` or `SPEC-002-some-title.md`. If no argument is passed, find the most recent `status: draft` spec in `./spec/`.)

---

## Step 1 — Locate the spec

If `$ARGUMENTS` is empty:
- Search recursively in `./spec/` for all `SPEC-*.md` files.
- Open each and read the frontmatter until finding `status: draft`. Use that file.
- If multiple are in `draft`, pick the lowest ID.

If `$ARGUMENTS` contains an ID or name:
- Search in `./spec/` (recursively) for a file matching by prefix `SPEC-NNN` or exact name.
- If not found, report the error and stop.

Read the full file and memorize:
- The **frontmatter** (`id`, `title`, `status`).
- The **Ordered Steps** from the Implementation Plan.
- The **Acceptance Criteria** (`- [ ]` pending and `- [x]` already done).
- The **Files to create** and **Files to modify**.
- The **Notes** and any relevant technical detail from **Technical Analysis**.

---

## Step 2 — Audit current state

Before implementing anything, determine what is already done:

1. For each file listed in "Files to create", check if it already exists on disk.
2. For each acceptance criterion already marked `- [x]`, confirm it as completed.
3. Check `git status` and `git log --oneline -10` to understand current branch changes.

Build two lists mentally:
- **Already done**: `[x]` criteria and files that already exist.
- **Pending**: `[ ]` criteria whose files don't exist yet or whose logic is not implemented.

If everything is already done, update the frontmatter (`status: done`) and report it. Do nothing else.

---

## Step 3 — Implement step by step

Follow the order in **Implementation Plan → Ordered Steps**. For each step:

### 3a. Implement the step

- Read relevant project files to understand patterns before writing new code.
- Follow project patterns: check existing components in `components/`, stores in `stores/`, pages in `pages/`. Respect conventions (Vue 3 + Nuxt, `<script setup lang="ts">`, composables, etc.).
- Implement real code (not pseudocode). Create or modify each necessary file.
- Use utilities and libraries already installed in the project (do not install new dependencies without confirming with the user).

### 3b. Mark covered criteria

Immediately after implementing code that satisfies a criterion, edit the spec file:
- Change `- [ ] Criterion` → `- [x] Criterion`
- Do this for each criterion the newly written code satisfies.
- **Do not wait until the end** — mark criteria as they are fulfilled.

### 3c. Continue with the next step

Repeat 3a–3b until all criteria are marked `[x]`.

---

## Step 4 — Update the frontmatter

When all criteria are marked `[x]`:

1. Edit the spec frontmatter:
   ```
   status: draft  →  status: done
   ```
2. Report the summary: how many criteria were implemented, files created/modified.

If criteria remain incomplete (due to dependency on another spec, external data, or technical limitation), set `status: in-progress` and add a note at the end of the spec file indicating what blocks each pending criterion.

---

## Important rules

- **Never mark a criterion `[x]` without having actually implemented it.**
- If a criterion depends on another spec, mark it as blocked: `- [ ] Criterion *(blocked: requires SPEC-NNN)*` — do not mark it `[x]`.
- Follow project patterns: review existing files before creating new ones.
- Do not install npm dependencies without confirming with the user.
- Run `npm run lint` or available lint/typecheck command if the spec includes verifiable changes.

---

## Output format when finishing

After each step, write one line:

```
✔ Step N completed — [N] criteria ✓
```

When fully done, always show these two sections:

### Section 1 — Status

```
✔ SPEC-NNN implemented — N/N criteria completed — status: done
```

Or if there are pending items:

```
⚠ SPEC-NNN partially implemented — N/M criteria completed — status: in-progress
Blocked: [list of incomplete criteria and reason]
```

### Section 2 — Terminal commands (ALWAYS required)

Always generate this block at the end, even when there are no pending steps. Include all verification or activation commands the developer must run manually:

```
## Pending terminal steps

# [Step description]
<exact command>

# [Step description]
<exact command>
```
