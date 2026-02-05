---
name: resolve-linear-issue-tdd
description: Resolve a linear issue end-to-end using Test Driven Development. This involves investigating the issue and relevant context, generating a detailed plan, implementing the plan using Test Driven Development (TDD), and deploying the changes.
---

# Resolve Linear Issue

This a workflow to resolve a Linear issue end-to-end using Test Driven Development (TDD). It is designed to be flexible and adaptable to different types of issues. Use your understanding of the issue, project context, tools, etc. to adjust the workflow as needed. You should leverage your team of agents whenever possible - see specifically the steps that call for "General", "Plan", and "test-analyzer" agents.

Start by creating a TODO list to complete all steps outlined below.

## Steps

1. Get issue details

Use the `mcp__linear__get_issue` tool directly to fetch the issue details (e.g. with `{"id": "<issue-id>"}`).

2. Generate issue branch

Create a new issue branch following the user's typical process, typically from the base branch (e.g. `main` or `dev` if they have a staging branch). Name the branch after the issue ID to automatically link it to Linear (e.g. `eng-123-my-feature`). This automatically moves the issue to "In Progress" in Linear.

3. **Call a new Plan agent** to investigate the issue and generate a plan to resolve the issue using Test Driven Development (TDD).

The following instructions are an example, modify or add as needed.

<example_prompt>
You **MUST** use the test-driven-development skill for this task. Start by invoking the skill to understand the implementation strategy.

Use the `mcp__linear__get_issue` tool directly to fetch the issue details (e.g. with `{"id": "<issue-id>"}`).

Gather additional context if relevant, e.g.:

- Related git commits and PRs
- Explore relevant code
- Error/issue tracking tools (e.g. Sentry)
- Database exploration (local dev DB or production read replicas)
- Application/backend logs
</example_prompt>

4. Call a new General agent to implement the plan. 

The General agent *MUST*:
    a. Implement the plan using TDD.
    b. Run the tests and ensure they pass. 
    c. Ensure that all linters and type checkers pass
    d. Run any necessary database migrations
    e. Ensure the project builds successfully
    f. Commit and push the changes on the issue branch
    g. Open a PR into the base branch for review.

5. Monitor the PR checks until they've all completed running. 

    If any checks failed, call a new General agent to:
    a. Read the check results
    b. Fix the failures
    c. Commit and push the changes
    d. Add a comment to the PR summarizing the changes made.

6. Review and Fix

    a. Call the `pr-reviewer` agent to review the PR or re-review if new commits have been pushed.

    b. You, Claude, must read the complete PR Review. If any issues/recommendations have been raised, call a General agent to address **ALL** issues, even minor ones.

    The general agent should: 
    - Read the full PR review
    - Address **ALL** issues, even minor ones
    - Re-run tests as needed
    - Commit the updates and push
    - Add a comment to the PR summarizing the changes made.

    c. Repeat 7a and 7b until the PR has been approved.

7. Clean up by killing any background tasks

8. Update the linear issue with any relevant information or findings that are important for posterity. Do not change the issue status/state, it will automatically move to "Done" when the PR is merged.
