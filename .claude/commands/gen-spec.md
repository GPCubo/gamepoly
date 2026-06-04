Generate specification files in the `./spec/` directory following the standard format.

**User input:** $ARGUMENTS
(Title of the spec to generate.)

---

## Step 1 — Determine next ID

Read `./spec/` directory, look for files matching `SPEC-NNN-*.md`.
Extract the highest number found and increment by 1.
If directory is empty or no files match, ID is `001`.
Always format with 3 digits: `001`, `002`, `023`, `100`.

## Step 2 — Build filename

- Take the title from user input.
- Convert to kebab-case (lowercase, spaces → hyphens, no special chars).
- Final name: `SPEC-NNN-kebab-title.md`
- Path: `./spec/SPEC-NNN-kebab-title.md`

## Step 3 — Write the spec file

Use current date (ISO 8601: `YYYY-MM-DDTHH:MM:SS`) and create the file with this exact structure:

```markdown
---
id: SPEC-NNN
title: { Exact title from user input }
created_at: { ISO timestamp }
status: draft
---

# SPEC-NNN: {Title}

## Description

{Explain in detail what is to be built or solved, including all additional data provided by the user.}

## Context and Motivation

{Why this functionality is needed. What problem it solves. Which module or flow it belongs to.}

## Technical Analysis

{Deep analysis: dependencies, project patterns to reuse, affected components, technical risks. Reference concrete project files and classes when relevant.}

## Implementation Plan

### Files to create

- `path/file.ext` - description

### Files to modify

- `path/file.ext` - what changes and why

### Ordered Steps

1. ...
2. ...

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Notes

{Design decisions, discarded alternatives, external dependencies if any.}
```

## Step 4 — Confirm

After creating the file, respond with a single line:
`✔ Spec created: ./spec/SPEC-NNN-kebab-title.md`
