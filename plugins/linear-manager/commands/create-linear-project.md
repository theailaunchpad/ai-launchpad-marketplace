---
name: Create Linear Project
description: Create a self-contained Linear project and associated issues such that any AI coding agent can implement the entire project without needing additional context.
---

# Create Linear Project

## Goal

Break down complex initiatives into focused, dependency-aware issues that an AI agent can work through sequentially, without needing additional context.

## Principles

- **One concern per project** - Unrelated tracks of work should be separate projects
- **5-7 issues maximum** - More than this means the scope is too broad
- **Issues stay small** - Max 3 acceptance criteria; split if larger

## Workflow

1. **Understand the initiative** - What problem are we solving? What's the end state? Ask clarifying questions about the problem, desired behavior, priority, etc.
2. **Explore the codebase** - Understand current implementation to inform structure
3. **Identify milestones** - Break work into logical phases (e.g., Foundation → Core → Integration)
4. **Draft issues per milestone** - Use the `/create-linear-issue` template for each issue
5. **Review with user** - Present structure, adjust based on feedback
6. **Create in Linear** - Project first, then issues with dependencies

## Project Template

```markdown
## Goal
[1-2 sentences: what this accomplishes when complete]

## Milestones
### 1. [Phase Name]
[What this phase accomplishes]

### 2. [Phase Name]
[What this phase accomplishes]

## Technical Context
[Relevant details about current implementation]

## Out of Scope
[What this project does NOT cover]
```

## Naming Conventions

**Project names** - noun phrases describing the initiative:
- Good: "Facebook OAuth Integration", "Order Analytics Dashboard"
- Bad: "Add Facebook login", "Auth improvements"

**Issue titles** - `[Milestone] Action phrase` format:
- Good: "[Foundation] Configure Facebook OAuth provider"
- Bad: "Setup", "Fix auth"

## Dependencies

Use `blockedBy` to establish order: Foundation issues have no blockers, later phases block on earlier ones.

## Creating in Linear

**Project:** `mcp__linear__create_project` with Team

**Issues:** `mcp__linear__create_issue` with:
- `project`: Link to project created above
- `blockedBy`: Array of blocking issue IDs
- `labels`: Feature | Improvement | Bug

## Common Patterns

**Research-then-implement**: Unsure about approach? Create a standalone research issue first.

**Parallel tracks**: Independent milestone tracks don't need blockers between them.

**Follow-up projects**: Scope expanding? Create a low-priority reminder issue to plan a separate project.
