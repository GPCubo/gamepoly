---
name: gen-spec
description: Generate spec files in ./spec/ following the SPEC-NNN-kebab-title.md format with structured sections (Description, Context, Technical Analysis, Implementation Plan, Acceptance Criteria, Notes). Use when the user asks to create a spec document.
---

# gen-spec Skill

Generate specification files in the `./spec/` directory following the standard format.

## Usage

When the user asks to create a spec, execute the generator script or manually create the file.

## Spec Format

Every spec file follows this exact structure:

```markdown
---
id: SPEC-NNN
title: Exact title from user input
created_at: YYYY-MM-DDTHH:MM:SS
status: draft
---

# SPEC-NNN: Title

## Description

## Context and Motivation

## Technical Analysis

## Implementation Plan

### Files to create

### Files to modify

### Ordered Steps

1.
2.

## Acceptance Criteria

- [ ]
- [ ]

## Notes
```

## Steps to Generate

### Step 1 - Determine next ID

Read `./spec/` directory, look for files matching `SPEC-NNN-*.md`.
Extract the highest number found and increment by 1.
If directory is empty or no files match, ID is `001`.
Always format with 3 digits: `001`, `002`, `023`, `100`.

### Step 2 - Build filename

- Take the title from user input.
- Convert to kebab-case (lowercase, spaces → hyphens, no special chars).
- Final name: `SPEC-NNN-kebab-title.md`
- Path: `./spec/SPEC-NNN-kebab-title.md`

### Step 3 - Write the spec file

Use current timestamp (ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`) and create the file with this exact structure:

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

{Why this functionality is needed. What problem it solves. Which module or flow of the system it belongs to (GAME, CAE, SGA, EPIS, STAFF, etc.).}

## Technical Analysis

{Deep analysis: dependencies, project patterns to reuse, affected components, technical risks or restrictions. Reference concrete project files and classes when relevant.}

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

### Step 4 - Confirm

After creating the file, respond with a single line:
`✔ Spec created: ./spec/SPEC-NNN-kebab-title.md`
