---
name: resolve-linear-project
description: Use when resolving all issues in a Linear project end-to-end. Spawns parallel Claude Code workers via the Agent SDK, each resolving one issue in its own git worktree. Dependencies are respected via wave-based execution.
---

# Resolve Linear Project

Orchestrate resolving ALL issues in a Linear project.
Each issue is resolved by an independent Claude Code worker session
running in its own git worktree. Issue dependencies are respected
via wave-based execution (Wave 0 completes before Wave 1 starts).

Start by creating a TODO list to complete all steps outlined below.

## Prerequisites

- `uv` installed (Python package runner — handles Python + dependencies automatically)
- Git worktrees support (standard git)
- Linear MCP configured

## Steps

### 1. Fetch Project and Issues

Use `mcp__linear__get_project` to fetch the project.
Then use `mcp__linear__list_issues` filtered to the project
to get ALL issues.

Collect for each issue:
- ID, title, identifier (e.g., `ENG-123`)
- Status (skip Done/Canceled issues)
- `blockedBy` array (issue IDs this depends on)
- Priority

### 2. Build Dependency Graph and Wave Plan

Analyze `blockedBy` relationships. See `dependency-graph.md` for the
full algorithm.

Classify issues into execution waves:
- **Wave 0**: Issues with no unresolved blockers (start immediately)
- **Wave 1**: Issues whose blockers are all in Wave 0
- **Wave N**: Issues whose blockers are all in prior waves

If a cycle is detected, STOP and report to the user.

### 3. Determine Parallelism

```
max_concurrent = min(count(current_wave_issues), 3)
```

Cap at 3 concurrent workers. Linear projects are 5-7 issues max;
more than 3 creates diminishing returns from overhead and merge
conflict risk.

### 4. Verify Prerequisites

Run via Bash:

```bash
uv run --script plugins/linear-pm/skills/resolve-linear-project/wave_orchestrator.py --dry-run <<< '{"issues":[],"main_project_dir":"."}'
```

This verifies that `uv` can resolve dependencies and execute the script.
If it fails, stop and report the error to the user.

### 5. Process Each Wave (repeat for Wave 0, 1, ..., N)

#### 5a. Create Git Worktrees for Current Wave

**REQUIRED:** Use the `using-git-worktrees` skill conventions for
directory selection and safety verification.

For each issue in this wave:

```bash
git worktree add .worktrees/<issue-identifier> -b <issue-identifier>-<slug>
```

Example: `.worktrees/eng-123` with branch `eng-123-configure-oauth`

Run project setup in each worktree (auto-detect: npm install, etc.).

Copy environment files from the main working directory to each worktree.
Environment files (`.env`, `.env.local`, `.env.test`, etc.) are typically
gitignored and will NOT exist in new worktrees:

```bash
cp <main-dir>/.env* <worktree-path>/  2>/dev/null || true
```

If the project has nested env files (e.g. `frontend/.env.local`),
copy those to the corresponding subdirectory in the worktree.

#### 5b. Build Wave Config JSON

Write a temporary JSON file (`/tmp/wave_config_<wave>.json`) with:

```json
{
  "issues": [
    {
      "id": "<linear-issue-id>",
      "identifier": "ENG-101",
      "title": "Configure OAuth",
      "worktree_path": "/absolute/path/to/.worktrees/eng-101",
      "branch_name": "eng-101-configure-oauth"
    }
  ],
  "main_project_dir": "/absolute/path/to/project",
  "max_concurrent": 3
}
```

#### 5c. Run Wave Orchestrator (foreground Bash)

```bash
uv run --script plugins/linear-pm/skills/resolve-linear-project/wave_orchestrator.py /tmp/wave_config_<wave>.json
```

This blocks until all workers in the wave complete. Progress streams
to stdout so the user can see real-time status of each worker.

Set a generous timeout (e.g. 30 minutes) since workers may take
significant time to resolve complex issues.

#### 5d. Parse Results

Read everything after the `---RESULTS---` delimiter as JSON array.
Each element has:
- `issue_id`, `identifier` — which issue
- `success` — boolean
- `error` — error message if failed
- `session_id` — for potential retry
- `cost_usd`, `num_turns` — cost tracking

For each successful result: verify PR exists with
`gh pr list --head <branch>`.

For each failed result: record error and session_id.

#### 5e. Handle Failures

- If a failed issue has no downstream dependencies in later waves:
  continue to merge successful PRs and proceed to the next wave.
- If a failed issue blocks downstream issues: report to the user
  and ask whether to retry, skip (remove dependent issues), or abort.
- To retry: re-run the orchestrator with only the failed issues
  (write a new config JSON with just those issues).

#### 5f. Merge PRs in Dependency Order

For each successful issue in this wave, merge its PR:

```bash
gh pr merge <pr-number> --merge
```

Merge foundational PRs first (those that other issues depend on).
Since next-wave worktrees haven't been created yet, they'll be
based on post-merge main automatically.

Wait for each merge to complete before creating next-wave worktrees.

### 6. Cleanup

Once ALL waves are complete:

a. Remove worktrees:
```bash
git worktree remove .worktrees/<identifier>
```
for each worktree created.

b. Update the Linear project with a summary of all resolved issues,
   including cost and success/failure status.

## Red Flags

**Never:**
- Run more than 3 concurrent workers per wave
- Let workers share a worktree
- Skip dependency analysis (issues may have blockers)
- Merge Wave N+1 PRs before Wave N PRs
- Leave worktrees uncleaned after completion
- Inline resolve-linear-issue steps in worker prompts
  (the orchestrator handles this via the Skill tool invocation)

**Always:**
- Create worktrees lazily (per wave, not all at once)
- Merge PRs in dependency order
- Verify PR approval before merging
- Parse and verify orchestrator results before merging
