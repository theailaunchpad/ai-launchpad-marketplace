import { LinearClient } from "@linear/sdk";
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

const envPath = resolve(__dirname, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("ERROR: LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

const MANIFEST_PATH = resolve(__dirname, "test-manifest.json");
if (existsSync(MANIFEST_PATH)) {
  console.error(
    "ERROR: test-manifest.json already exists. Run teardown first."
  );
  process.exit(1);
}

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ---------------------------------------------------------------------------
// Issue definitions
// ---------------------------------------------------------------------------

interface IssueDef {
  key: string;
  title: string;
  wave: number;
  priority: number;
  blockedByKeys: string[];
  description: string;
}

const ISSUES: IssueDef[] = [
  {
    key: "A",
    title: "[Foundation] Set up Express + TypeScript project scaffold",
    wave: 0,
    priority: 2,
    blockedByKeys: [],
    description: `## Summary
Set up the Express + TypeScript project scaffold so that all subsequent features have a working server to build upon.

## Current vs Expected Behavior
**Current:** The project has a minimal \`src/index.ts\` with a single GET / endpoint. No health check, no dev tooling configured.
**Expected:** A fully configured Express + TypeScript server with health check endpoint and hot-reload dev workflow.

## Acceptance Criteria
- [ ] Express server listens on configurable PORT (env var), GET /health returns \`{ status: "ok" }\`
- [ ] TypeScript strict mode enabled, ESLint configuration passes with no errors
- [ ] \`npm run dev\` starts the server with hot-reload (tsx watch)

## Scope
**In scope:** Express server setup, TypeScript config, health endpoint, dev script
**Out of scope:** Database setup, any business logic endpoints, testing framework`,
  },
  {
    key: "B",
    title: "[Foundation] Configure PostgreSQL with Prisma ORM",
    wave: 0,
    priority: 2,
    blockedByKeys: [],
    description: `## Summary
Configure Prisma ORM with PostgreSQL so the application has a database layer for persisting tasks and users.

## Current vs Expected Behavior
**Current:** Prisma schema exists with generator and datasource config only — no models defined.
**Expected:** Prisma schema defines Task and User models, migrations run successfully, and Prisma Client is exported for use.

## Acceptance Criteria
- [ ] Prisma schema defines Task model (id, title, description, status, createdAt, updatedAt) and User model (id, email, name, createdAt)
- [ ] \`npx prisma migrate dev\` creates tables without errors
- [ ] Prisma Client is exported from \`src/lib/prisma.ts\` as a singleton

## Scope
**In scope:** Prisma schema models, migration, client export
**Out of scope:** API endpoints, seed data, connection pooling`,
  },
  {
    key: "C",
    title: "[Core] Implement Task CRUD endpoints",
    wave: 1,
    priority: 3,
    blockedByKeys: ["A", "B"],
    description: `## Summary
Implement full CRUD endpoints for the Task resource so users can create, read, update, and delete tasks via the REST API.

## Current vs Expected Behavior
**Current:** No task endpoints exist.
**Expected:** Five REST endpoints for task management with proper HTTP status codes.

## Acceptance Criteria
- [ ] POST /tasks creates a task (201), GET /tasks lists all tasks (200), GET /tasks/:id returns one task (200) or 404
- [ ] PUT /tasks/:id updates a task (200) or 404, DELETE /tasks/:id removes a task (204) or 404
- [ ] All responses use consistent JSON format, proper Content-Type headers

## Scope
**In scope:** Task CRUD endpoints, basic error responses for not-found
**Out of scope:** Input validation, pagination, sorting, user associations`,
  },
  {
    key: "D",
    title: "[Core] Implement User CRUD endpoints",
    wave: 1,
    priority: 3,
    blockedByKeys: ["A", "B"],
    description: `## Summary
Implement full CRUD endpoints for the User resource so the application can manage user accounts.

## Current vs Expected Behavior
**Current:** No user endpoints exist.
**Expected:** Five REST endpoints for user management with email uniqueness enforcement.

## Acceptance Criteria
- [ ] POST /users creates a user (201), GET /users lists all users (200), GET /users/:id returns one user (200) or 404
- [ ] PUT /users/:id updates a user (200) or 404, DELETE /users/:id removes a user (204) or 404
- [ ] Email uniqueness is enforced at the database level — duplicate email returns 409 Conflict

## Scope
**In scope:** User CRUD endpoints, email uniqueness constraint
**Out of scope:** Authentication, password hashing, user roles`,
  },
  {
    key: "E",
    title: "[Integration] Add user-task associations and filtering",
    wave: 2,
    priority: 3,
    blockedByKeys: ["C", "D"],
    description: `## Summary
Add the ability to assign tasks to users and filter tasks by assignee, connecting the Task and User resources.

## Current vs Expected Behavior
**Current:** Tasks and users exist independently with no relationship between them.
**Expected:** Tasks can optionally be assigned to a user, and tasks can be filtered by assignee.

## Acceptance Criteria
- [ ] Tasks have an optional assigneeId foreign key to User; GET /users/:id/tasks returns that user's tasks
- [ ] GET /tasks?assigneeId=<id> filters tasks by assignee
- [ ] Assigning a task to a non-existent user returns 404

## Scope
**In scope:** assigneeId FK, user-task query endpoint, assignee filter
**Out of scope:** Multiple assignees, task status workflows, notifications`,
  },
  {
    key: "F",
    title: "[Integration] Add input validation and error handling",
    wave: 2,
    priority: 3,
    blockedByKeys: ["C", "D"],
    description: `## Summary
Add input validation to all POST/PUT endpoints and a global error handler so the API returns helpful, consistent error responses.

## Current vs Expected Behavior
**Current:** No input validation — invalid data may cause unhandled errors or silent data corruption.
**Expected:** All endpoints validate required fields and return descriptive 400 errors; unhandled errors return generic 500 responses.

## Acceptance Criteria
- [ ] POST/PUT endpoints validate required fields and return 400 with descriptive error messages for invalid input
- [ ] Global error handler catches unhandled errors and returns 500 with generic message (no stack traces in response)
- [ ] All error responses use consistent format: \`{ error: string, details?: string[] }\`

## Scope
**In scope:** Request body validation, global error handler, consistent error format
**Out of scope:** Authentication/authorization, rate limiting, request logging`,
  },
  {
    key: "G",
    title: "[Polish] Add pagination and sorting to list endpoints",
    wave: 3,
    priority: 4,
    blockedByKeys: ["E"],
    description: `## Summary
Add pagination and sorting support to all list endpoints so the API can handle large datasets efficiently.

## Current vs Expected Behavior
**Current:** GET /tasks and GET /users return all records with no pagination or sorting.
**Expected:** List endpoints support page/limit pagination and sortBy/order parameters.

## Acceptance Criteria
- [ ] ?page=N&limit=N query parameters supported (defaults: page=1, limit=20)
- [ ] Response includes \`{ data, pagination: { page, limit, total, totalPages } }\`
- [ ] ?sortBy=createdAt&order=asc|desc supported on all list endpoints

## Scope
**In scope:** Pagination, sorting, response metadata
**Out of scope:** Cursor-based pagination, full-text search, caching`,
  },
];

const DEPENDENCY_MAP: Record<string, string[]> = {};
for (const issue of ISSUES) {
  if (issue.blockedByKeys.length > 0) {
    DEPENDENCY_MAP[issue.key] = issue.blockedByKeys;
  }
}

const WAVES: Record<string, string[]> = {};
for (const issue of ISSUES) {
  const w = String(issue.wave);
  if (!WAVES[w]) WAVES[w] = [];
  WAVES[w].push(issue.key);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Resolving team...");
  let teamId: string;
  let teamKey: string;

  const teamKeyEnv = process.env.LINEAR_TEAM_KEY;
  if (teamKeyEnv) {
    const teams = await client.teams({ filter: { key: { eq: teamKeyEnv } } });
    const team = teams.nodes[0];
    if (!team) {
      console.error(`ERROR: Team with key "${teamKeyEnv}" not found`);
      process.exit(1);
    }
    teamId = team.id;
    teamKey = team.key;
  } else {
    const teams = await client.teams();
    const team = teams.nodes[0];
    if (!team) {
      console.error("ERROR: No teams found in workspace");
      process.exit(1);
    }
    teamId = team.id;
    teamKey = team.key;
  }
  console.log(`  Team: ${teamKey} (${teamId})`);

  // Create project
  const timestamp = new Date().toISOString();
  const projectName = `[Test] Task Manager REST API - ${timestamp}`;
  console.log(`\nCreating project: ${projectName}`);

  const projectDescription = `## Goal
Build a production-ready Task Manager REST API with Express and TypeScript that supports full CRUD for tasks and users, user-task associations, input validation, and paginated list endpoints.

## Milestones
### 1. Foundation
Stand up the Express + TypeScript server scaffold and configure PostgreSQL with Prisma ORM so all subsequent features have a working server and database layer.

### 2. Core
Implement full CRUD endpoints for both Task and User resources with proper HTTP status codes and consistent JSON responses.

### 3. Integration
Connect tasks to users via assignee associations with filtering support, and add input validation with a global error handler across all endpoints.

### 4. Polish
Add pagination and sorting to all list endpoints so the API handles large datasets efficiently.

## Technical Context
The project starts from a minimal Express scaffold (\`src/index.ts\` with a single GET / route) and an empty Prisma schema (generator + PostgreSQL datasource, no models). Dependencies include Express 4.x, Prisma 6.x, and TypeScript 5.x.

## Out of Scope
Authentication, authorization, rate limiting, WebSocket support, deployment configuration, and frontend clients.`;

  const projectPayload = await client.createProject({
    name: projectName,
    content: projectDescription,
    teamIds: [teamId],
  });
  const project = await projectPayload.project;
  if (!project) {
    console.error("ERROR: Failed to create project");
    process.exit(1);
  }
  console.log(`  Project ID: ${project.id}`);

  // Get the team's default "Backlog" state for new issues
  const workflowStates = await client.workflowStates({
    filter: { team: { id: { eq: teamId } } },
  });
  const backlogState = workflowStates.nodes.find(
    (s) => s.name === "Backlog" || s.type === "backlog"
  );
  const stateId = backlogState?.id;

  // Create issues sequentially to maintain order
  console.log("\nCreating issues...");
  const issueMap = new Map<
    string,
    { id: string; identifier: string; title: string }
  >();

  for (const def of ISSUES) {
    const payload = await client.createIssue({
      title: def.title,
      description: def.description,
      teamId,
      projectId: project.id,
      priority: def.priority,
      ...(stateId ? { stateId } : {}),
    });
    const issue = await payload.issue;
    if (!issue) {
      console.error(`ERROR: Failed to create issue ${def.key}: ${def.title}`);
      process.exit(1);
    }
    issueMap.set(def.key, {
      id: issue.id,
      identifier: issue.identifier,
      title: def.title,
    });
    console.log(`  ${def.key}: ${issue.identifier} — ${def.title}`);
  }

  // Create dependency relations
  // createIssueRelation({ issueId: C, relatedIssueId: A, type: "blocks" })
  // means "A blocks C" (A is the blocker, C is blocked)
  console.log("\nCreating dependency relations...");
  for (const def of ISSUES) {
    for (const blockerKey of def.blockedByKeys) {
      const blocker = issueMap.get(blockerKey)!;
      const blocked = issueMap.get(def.key)!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.createIssueRelation({
        issueId: blocked.id,
        relatedIssueId: blocker.id,
        type: "blocks" as any,
      });
      console.log(
        `  ${blocker.identifier} (${blockerKey}) blocks ${blocked.identifier} (${def.key})`
      );
    }
  }

  // Init stub repo
  console.log("\nInitializing stub git repo...");
  const repoTimestamp = timestamp.replace(/[:.]/g, "-");
  const testReposDir = resolve(__dirname, ".test-repos");
  const repoDir = resolve(testReposDir, `task-manager-api-${repoTimestamp}`);
  const fixtureDir = resolve(__dirname, "fixtures", "task-manager-api");

  mkdirSync(testReposDir, { recursive: true });
  cpSync(fixtureDir, repoDir, { recursive: true });
  execSync("git init && git add -A && git commit -m 'Initial scaffold'", {
    cwd: repoDir,
    stdio: "pipe",
  });
  console.log(`  Repo: ${repoDir}`);

  // Write manifest
  console.log("\nWriting manifest...");
  const manifest = {
    createdAt: timestamp,
    projectId: project.id,
    projectName,
    teamId,
    teamKey,
    issues: ISSUES.map((def) => {
      const created = issueMap.get(def.key)!;
      return {
        key: def.key,
        id: created.id,
        identifier: created.identifier,
        title: created.title,
        wave: def.wave,
        blockedByKeys: def.blockedByKeys,
      };
    }),
    dependencyMap: DEPENDENCY_MAP,
    waves: WAVES,
    testRepoPath: repoDir,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`  Manifest: ${MANIFEST_PATH}`);

  console.log("\nSetup complete!");
  console.log(`  Project: ${projectName}`);
  console.log(`  Issues: ${issueMap.size}`);
  console.log(`  Repo: ${repoDir}`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
