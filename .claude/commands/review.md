---
name: review
description: Runs the review pipeline on existing code without implementing anything. Useful for auditing code before a deploy or after manual changes.
---

Run a full review of the current changes (or the specified path/feature):

$ARGUMENTS

Hand off to the `orchestrator` agent with these instructions:

Run review-only pipeline in parallel:
1. `code-reviewer` → full code review
2. `security-auditor` → security audit
3. `ui-reviewer` → UI/design review (if frontend files changed)

Synthesize all findings into a single prioritized list:
- 🔴 Must fix before deploy
- 🟡 Should fix soon
- 🔵 Nice to have

Do NOT make any code changes.
