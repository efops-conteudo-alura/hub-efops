---
name: feature
description: Starts the full development pipeline for a new feature. Invokes the orchestrator with the feature request.
---

Start the full development pipeline for the following feature request:

$ARGUMENTS

Hand off to the `orchestrator` agent with this request and all available project context. The orchestrator will:
1. Create a feature branch
2. Write a spec (PM)
3. Define the technical approach (Architect)
4. Implement frontend and backend in parallel
5. Run code review, security audit, and tests in parallel
6. Validate against acceptance criteria (QA)
7. Update documentation and commit

Keep me informed at the start of each phase.
