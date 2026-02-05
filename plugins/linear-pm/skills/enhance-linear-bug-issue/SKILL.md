---
name: enhance-linear-bug-issue
description: Enhance an existing Linear bug issue by investigating the bug, gathering additional context, and providing a root cause analysis.
---

1. **Get issue details** - Use `mcp__linear__get_issue` with the issue ID.

2. **Gather user context** - Ask the user for any additional context that may be relevant such as steps to reproduce, what happened vs the expected outcome, screenshots, error messages, etc.

3. **Gather non-codebase context** - Gather any important non-codebase context such as related git commits and PRs, error/issue tracking tools (e.g. Sentry), application/backend logs, database exploration (local dev DB or production read replicas), etc.

4. **Investigate the Bug** - Call the `root-cause-analyzer` agent to investigate the bug and provide enhanced context and analysis.

5. **Update the issue** - Use `mcp__linear__update_issue` to add the enhanced context and analysis to the issue. You *MUST* use the create-linear-issue skill to structure the issue properly.
