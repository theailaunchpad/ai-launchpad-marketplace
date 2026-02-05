---
name: Investigate Bug
description: Investigate a bug and provide enhanced context and analysis using the systematic-debugging skill.
---

1. **Gather user context** - Ask the user for any additional context that may be relevant such as steps to reproduce, what happened vs the expected outcome, screenshots, error messages, etc.

2. **Gather non-codebase context** - Gather any important non-codebase context such as related git commits and PRs, error/issue tracking tools (e.g. Sentry), application/backend logs, database exploration (local dev DB or production read replicas), etc.

3. **Investigate the Bug** - You *MUST* use the systematic-debugging skill to investigate the bug and provide enhanced context about the code, including a root cause analysis. Do not assume to know the root cause, instead list possible causes and their likelihood based on the evidence. Do not propose any solutions, just provide the facts and analysis.
