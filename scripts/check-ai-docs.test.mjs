import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REQUIRED_DOCUMENTS,
  validateDocumentation,
} from "./check-ai-docs.mjs";

const TASK_SECTIONS = [
  "Status",
  "Goal",
  "Context",
  "Scope",
  "Out of scope",
  "Stack",
  "Architecture",
  "Relevant files",
  "Reuse",
  "Requirements",
  "Edge cases",
  "Constraints",
  "Acceptance criteria",
  "Verification",
  "Technical debt",
];

function buildTask(status = "Ready") {
  return [
    "# TASK-001: Test task",
    "",
    ...TASK_SECTIONS.flatMap((section) => [
      `## ${section}`,
      "",
      section === "Status" ? status : "Test content.",
      "",
    ]),
  ].join("\n");
}

async function writeProjectFile(rootDir, relativePath, contents = "# Document\n") {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

async function createValidFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "videoflow-docs-"));

  for (const relativePath of REQUIRED_DOCUMENTS) {
    await writeProjectFile(rootDir, relativePath);
  }

  await writeProjectFile(
    rootDir,
    "docs/ai/tasks/TASK-001-test-task.md",
    buildTask(),
  );
  await writeProjectFile(
    rootDir,
    "docs/ai/CURRENT_SPRINT.md",
    "# Current Sprint\n\n- [TASK-001](tasks/TASK-001-test-task.md)\n",
  );

  return rootDir;
}

async function withFixture(run) {
  const rootDir = await createValidFixture();

  try {
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test("accepts a complete documentation context", async () => {
  await withFixture(async (rootDir) => {
    assert.deepEqual(await validateDocumentation(rootDir), []);
  });
});

test("reports a missing required document", async () => {
  await withFixture(async (rootDir) => {
    await rm(path.join(rootDir, "docs/ai/PROJECT.md"));

    const errors = await validateDocumentation(rootDir);

    assert.ok(errors.some((error) => error.includes("docs/ai/PROJECT.md")));
  });
});

test("reports a broken local Markdown link", async () => {
  await withFixture(async (rootDir) => {
    await writeProjectFile(
      rootDir,
      "README.md",
      "# Project\n\n[Missing](docs/ai/MISSING.md)\n",
    );

    const errors = await validateDocumentation(rootDir);

    assert.ok(errors.some((error) => error.includes("MISSING.md")));
  });
});

test("reports duplicate task identifiers", async () => {
  await withFixture(async (rootDir) => {
    await writeProjectFile(
      rootDir,
      "docs/ai/tasks/TASK-001-another-task.md",
      buildTask(),
    );

    const errors = await validateDocumentation(rootDir);

    assert.ok(errors.some((error) => error.includes("Duplicate task ID TASK-001")));
  });
});

test("reports an unsupported task status", async () => {
  await withFixture(async (rootDir) => {
    await writeProjectFile(
      rootDir,
      "docs/ai/tasks/TASK-001-test-task.md",
      buildTask("Waiting"),
    );

    const errors = await validateDocumentation(rootDir);

    assert.ok(errors.some((error) => error.includes("Unsupported status Waiting")));
  });
});
