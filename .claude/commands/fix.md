---
name: fix
description: Starts a focused pipeline for a bug fix. Lighter than /feature — skips the PM spec phase and goes straight to diagnosis and implementation.
---

Start a bug fix pipeline for:

$ARGUMENTS

Hand off to the `orchestrator` agent with these instructions:

Run a lighter pipeline:
1. `git-manager` → create a `fix/[description]` branch
2. `architect` → diagnose the root cause and define the fix approach (no spec needed)
3. Relevant dev agent (`frontend-dev` or `backend-dev` or both) → implement the fix
4. `code-reviewer` + `security-auditor` → review in parallel
5. `test-writer` → add a regression test for this specific bug
6. `git-manager` → commit with `fix:` prefix

Skip the PM and QA phases to move faster.
