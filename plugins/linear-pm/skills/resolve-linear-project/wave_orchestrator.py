#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "claude-agent-sdk",
# ]
# ///
"""Wave orchestrator for parallel Linear issue resolution.

Reads wave config from stdin or a file argument, spawns parallel Claude Agent SDK
workers (each a top-level query() call that can spawn its own subagents), streams
progress to stdout, and outputs structured JSON results.

Run with uv (auto-installs dependencies):
    uv run wave_orchestrator.py /tmp/wave_config.json
    uv run wave_orchestrator.py < wave_config.json
    uv run wave_orchestrator.py --dry-run < wave_config.json
"""

import asyncio
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime

from claude_agent_sdk import ClaudeAgentOptions, AssistantMessage, ResultMessage, query


@dataclass
class WorkerResult:
    issue_id: str
    identifier: str
    session_id: str | None
    success: bool
    error: str | None = None
    cost_usd: float | None = None
    num_turns: int | None = None


def log(identifier: str, message: str):
    print(
        f"[{datetime.now().strftime('%H:%M:%S')}] [{identifier}] {message}", flush=True
    )


async def resolve_issue(issue: dict, main_project_dir: str) -> WorkerResult:
    prompt = f"""You must resolve Linear issue {issue['identifier']} (ID: {issue['id']}).

CRITICAL: You MUST invoke the resolve-linear-issue skill using the Skill tool
BEFORE starting any implementation work. Do NOT implement steps yourself.

Use the Skill tool with skill: "resolve-linear-issue" and args: "{issue['identifier']}"

The workflow is NOT complete when the PR is opened. You must continue through
PR checks, pr-reviewer review, and Linear issue update."""

    options = ClaudeAgentOptions(
        cwd=issue["worktree_path"],
        add_dirs=[main_project_dir],
        setting_sources=["project"],
        plugins=[
            {
                "type": "local",
                "path": os.path.join(
                    main_project_dir, "plugins", "linear-pm"
                ),
            }
        ],
        allowed_tools=[
            "Read",
            "Write",
            "Edit",
            "Bash",
            "Glob",
            "Grep",
            "Task",
            "Skill",
            "WebSearch",
            "WebFetch",
            "TodoWrite",
            "ToolSearch",
        ],
        permission_mode="bypassPermissions",
        max_turns=200,
        env={"CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD": "1"},
    )

    session_id = None
    try:
        log(issue["identifier"], "Starting resolution")
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if hasattr(block, "name"):  # ToolUseBlock
                        if block.name in ("Skill", "Task", "Bash"):
                            detail = ""
                            if block.name == "Skill":
                                detail = f" {block.input.get('skill', '')}"
                            elif block.name == "Task":
                                detail = f" type={block.input.get('subagent_type', '')}"
                            log(issue["identifier"], f"-> {block.name}{detail}")
            elif isinstance(message, ResultMessage):
                session_id = message.session_id
                if message.is_error:
                    log(
                        issue["identifier"],
                        f"FAILED (cost: ${message.total_cost_usd:.2f})",
                    )
                    return WorkerResult(
                        issue["id"],
                        issue["identifier"],
                        session_id,
                        False,
                        message.result,
                        message.total_cost_usd,
                        message.num_turns,
                    )
                else:
                    log(
                        issue["identifier"],
                        f"Complete (cost: ${message.total_cost_usd:.2f}, turns: {message.num_turns})",
                    )
                    return WorkerResult(
                        issue["id"],
                        issue["identifier"],
                        session_id,
                        True,
                        None,
                        message.total_cost_usd,
                        message.num_turns,
                    )
    except Exception as e:
        log(issue["identifier"], f"ERROR: {e}")
        return WorkerResult(
            issue["id"], issue["identifier"], session_id, False, str(e)
        )

    # Should not reach here, but handle gracefully
    return WorkerResult(
        issue["id"],
        issue["identifier"],
        session_id,
        False,
        "No result message received",
    )


async def run_wave(
    issues: list, main_project_dir: str, max_concurrent: int = 3
):
    sem = asyncio.Semaphore(max_concurrent)

    async def bounded(issue):
        async with sem:
            return await resolve_issue(issue, main_project_dir)

    results = await asyncio.gather(
        *[bounded(i) for i in issues], return_exceptions=True
    )

    final = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            final.append(
                WorkerResult(
                    issues[i]["id"],
                    issues[i]["identifier"],
                    None,
                    False,
                    str(r),
                )
            )
        else:
            final.append(r)
    return final


def main():
    # Support both stdin and file argument
    if len(sys.argv) > 1 and sys.argv[1] != "--dry-run":
        with open(sys.argv[1]) as f:
            data = json.load(f)
    else:
        data = json.loads(sys.stdin.read())

    issues = data["issues"]
    main_dir = data["main_project_dir"]
    max_concurrent = data.get("max_concurrent", 3)

    if "--dry-run" in sys.argv:
        print(
            f"Would resolve {len(issues)} issues (max {max_concurrent} concurrent)"
        )
        for i in issues:
            print(f"  {i['identifier']}: {i['title']}")
        sys.exit(0)

    print(f"\n{'='*60}")
    print(
        f"WAVE: Resolving {len(issues)} issue(s), max {max_concurrent} concurrent"
    )
    for i in issues:
        print(f"  {i['identifier']}: {i['title']}")
    print(f"{'='*60}\n", flush=True)

    results = asyncio.run(run_wave(issues, main_dir, max_concurrent))

    successes = [r for r in results if r.success]
    failures = [r for r in results if not r.success]
    print(f"\n{'='*60}")
    print(
        f"WAVE COMPLETE: {len(successes)} succeeded, {len(failures)} failed"
    )
    for r in successes:
        print(f"  + {r.identifier}")
    for r in failures:
        print(f"  x {r.identifier}: {r.error}")
    print(f"{'='*60}\n", flush=True)

    # Structured output delimiter for machine parsing
    print("---RESULTS---", flush=True)
    print(json.dumps([asdict(r) for r in results], default=str), flush=True)


if __name__ == "__main__":
    main()
