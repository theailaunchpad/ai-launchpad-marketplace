---
name: create-linear-issue
description: Create a self-contained Linear issue that any AI coding agent can implement without needing additional context. Always use this skill when you need to create a new Linear issue.
---

# Create Linear Issue

## Goal

Create issues that an AI coding agent can pick up and implement without needing additional context or to ask clarifying questions. Focus on **what** needs to be done and **why**, not **how** to implement it.

## Principles

- **Describe intent, not implementation** - Let the implementing agent figure out which files to modify
- **Be specific about outcomes** - Vague requirements lead to misaligned implementations
- **Define boundaries clearly** - What's in scope matters as much as what's out of scope
- **Keep issues small** - If it has >3 acceptance criteria, it should probably be split

## Workflow

1. **Understand what the user wants** - Ask clarifying questions about the problem, desired behavior, and priority
    - If the issue is a bug:
        - Ask about the steps to reproduce.
        - You *MUST USE* the `root-cause-analyzer` agent to provide a root cause analysis.
2. **Draft the issue** - Write it up using the template below
3. **Review with user** - Present the draft and adjust based on feedback
4. **Create in Linear** - Use the MCP tool to create the issue

## Issue Template

```markdown
## Summary
[1-2 sentences: what this accomplishes and why it matters]

## Current vs Expected Behavior
**Current:** [What happens now, or "N/A" for new features]
**Expected:** [What should happen after this is implemented]

## Acceptance Criteria
- [ ] [Specific, testable outcome 1]
- [ ] [Specific, testable outcome 2]
- [ ] [Specific, testable outcome 3 - max 3, split if more needed]

## Scope
**In scope:** [What this issue covers]
**Out of scope:** [What this issue explicitly does NOT cover]

## Additional Context
[Optional: logs, screenshots, error messages, links to designs, related issues, or hints about existing patterns to follow - only include if genuinely helpful]
```

### Issue-Specific Template Sections (REQUIRED)

#### Bugs

```markdown
## Reproduction Steps
1. [Specific step 1]
2. [Specific step 2]
3. [Specific step 3]

## Root Cause Analysis

### Evidence Gathered
[Summarize what was found in error tracking, logs, code review]

### Possible Root Causes
1. **[Most likely cause]** - [Evidence supporting this]
2. **[Alternative cause]** - [Evidence supporting this]

### Relevant Code Paths
- [File/function involved]
- [File/function involved]
```

## Writing Tips

**Titles** should complete "This issue will...":
- Good: "Add Google OAuth login to signup flow"
- Bad: "Google login" or "Auth improvements"

**Acceptance criteria** should be pass/fail testable:
- Good: "User sees error message when email is already registered"
- Bad: "Handle duplicate emails gracefully"

**Scope boundaries** prevent misunderstandings:
- Good: "In scope: Add login button. Out of scope: Forgot password flow"
- Bad: Omitting the section entirely

**Reproduction steps** must be specific and repeatable:
- Good: "1. Log in as admin 2. Navigate to /settings 3. Click 'Save' without changes"
- Bad: "Sometimes the settings page doesn't work"

## Priority & Labels

**Priority** (ask user if unclear):
- **Urgent**: Production broken, security issue
- **High**: Blocking other work, significant user impact
- **Medium**: Normal feature work (default)
- **Low**: Nice-to-have, can wait

**Labels**: Feature | Improvement | Bug

## Creating the Issue

Use `mcp__linear__create_issue` with:
- **Team:** <your-team>
- **Project:** <your-project>
- **State:** <your-state>
- **Priority:** 1=Urgent, 2=High, 3=Medium, 4=Low
- **Label:** Based on issue type
