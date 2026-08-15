import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_DOCUMENTS = [
  "README.md",
  "AGENTS.md",
  "docs/source/DiPost_TZ_v1.0.md",
  "docs/product-requirements.md",
  "docs/platform-feasibility.md",
  "docs/adr/0001-architecture.md",
  "docs/architecture.md",
  "docs/roadmap.md",
  "docs/ai/README.md",
  "docs/ai/PROJECT.md",
  "docs/ai/TECH_STACK.md",
  "docs/ai/ARCHITECTURE.md",
  "docs/ai/DATABASE.md",
  "docs/ai/UI_KIT.md",
  "docs/ai/EDGE_CASES.md",
  "docs/ai/LINKS.md",
  "docs/ai/CURRENT_SPRINT.md",
  "docs/ai/BACKLOG.md",
  "docs/ai/TECH_DEBT.md",
  "docs/ai/LEGACY_WARNINGS.md",
  "docs/ai/CHANGES.md",
  "docs/ai/templates/TASK.md",
  "docs/ai/templates/CHANGE_REQUEST.md",
];

const REQUIRED_TASK_SECTIONS = [
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

const TASK_STATUS = new Set([
  "Draft",
  "Ready",
  "In progress",
  "Blocked",
  "Done",
]);

const ACTIVE_TASK_STATUS = new Set(["Ready", "In progress"]);
const TASK_FILENAME_PATTERN = /^(TASK-\d{3})-[a-z0-9-]+\.md$/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(directory) {
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeLinkTarget(rawTarget) {
  let target = rawTarget.trim();

  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1);
  }

  const titleSeparator = target.search(/\s+["']/);

  if (titleSeparator >= 0) {
    target = target.slice(0, titleSeparator);
  }

  return target.split("#", 1)[0]?.split("?", 1)[0] ?? "";
}

function isExternalLink(target) {
  return (
    target.length === 0 ||
    target.startsWith("#") ||
    /^[a-z][a-z\d+.-]*:/i.test(target) ||
    target.startsWith("//")
  );
}

function getTaskStatus(contents) {
  const match = contents.match(/^## Status\s*\n+([^\n]+)/m);
  return match?.[1]?.trim().replace(/^`|`$/g, "") ?? null;
}

function getTaskSections(contents) {
  return new Set(
    [...contents.matchAll(/^## (.+?)\s*$/gm)].map((match) => match[1]?.trim()),
  );
}

async function validateRequiredDocuments(rootDir, errors) {
  for (const relativePath of REQUIRED_DOCUMENTS) {
    if (!(await exists(path.join(rootDir, relativePath)))) {
      errors.push(`Missing required document: ${relativePath}`);
    }
  }
}

async function validateMarkdownLinks(rootDir, markdownFiles, errors) {
  for (const absolutePath of markdownFiles) {
    const contents = await readFile(absolutePath, "utf8");
    const relativeSource = path.relative(rootDir, absolutePath);

    for (const match of contents.matchAll(MARKDOWN_LINK_PATTERN)) {
      const target = normalizeLinkTarget(match[1] ?? "");

      if (isExternalLink(target)) {
        continue;
      }

      const decodedTarget = decodeURIComponent(target);
      const resolvedTarget = decodedTarget.startsWith("/")
        ? path.join(rootDir, decodedTarget.slice(1))
        : path.resolve(path.dirname(absolutePath), decodedTarget);

      if (!(await exists(resolvedTarget))) {
        errors.push(`Broken local link in ${relativeSource}: ${target}`);
      }
    }
  }
}

async function validateTasks(rootDir, errors) {
  const tasksDir = path.join(rootDir, "docs/ai/tasks");
  const taskFiles = (await listMarkdownFiles(tasksDir)).sort();
  const taskByPath = new Map();
  const pathByTaskId = new Map();

  for (const absolutePath of taskFiles) {
    const filename = path.basename(absolutePath);
    const filenameMatch = filename.match(TASK_FILENAME_PATTERN);

    if (filenameMatch === null) {
      errors.push(`Invalid task filename: docs/ai/tasks/${filename}`);
      continue;
    }

    const taskId = filenameMatch[1];
    const previousPath = pathByTaskId.get(taskId);

    if (previousPath !== undefined) {
      errors.push(
        `Duplicate task ID ${taskId}: ${path.basename(previousPath)}, ${filename}`,
      );
    } else {
      pathByTaskId.set(taskId, absolutePath);
    }

    const contents = await readFile(absolutePath, "utf8");
    const sections = getTaskSections(contents);
    const status = getTaskStatus(contents);

    for (const section of REQUIRED_TASK_SECTIONS) {
      if (!sections.has(section)) {
        errors.push(`Missing section ${section} in docs/ai/tasks/${filename}`);
      }
    }

    if (status === null) {
      errors.push(`Missing task status in docs/ai/tasks/${filename}`);
    } else if (!TASK_STATUS.has(status)) {
      errors.push(`Unsupported status ${status} in docs/ai/tasks/${filename}`);
    }

    taskByPath.set(path.normalize(absolutePath), { filename, status });
  }

  return taskByPath;
}

async function validateCurrentSprint(rootDir, taskByPath, errors) {
  const currentSprintPath = path.join(rootDir, "docs/ai/CURRENT_SPRINT.md");

  if (!(await exists(currentSprintPath))) {
    return;
  }

  const contents = await readFile(currentSprintPath, "utf8");
  const linkedTasks = [];

  for (const match of contents.matchAll(MARKDOWN_LINK_PATTERN)) {
    const target = normalizeLinkTarget(match[1] ?? "");

    if (isExternalLink(target)) {
      continue;
    }

    const resolvedTarget = path.normalize(
      path.resolve(path.dirname(currentSprintPath), decodeURIComponent(target)),
    );

    if (taskByPath.has(resolvedTarget)) {
      linkedTasks.push(resolvedTarget);
    }
  }

  const uniqueLinkedTasks = [...new Set(linkedTasks)];

  if (uniqueLinkedTasks.length !== 1) {
    errors.push(
      `CURRENT_SPRINT must link exactly one task, found ${uniqueLinkedTasks.length}`,
    );
    return;
  }

  const activeTask = taskByPath.get(uniqueLinkedTasks[0]);

  if (activeTask === undefined || !ACTIVE_TASK_STATUS.has(activeTask.status)) {
    errors.push(
      `CURRENT_SPRINT task must have status Ready or In progress: ${activeTask?.filename ?? "unknown"}`,
    );
  }
}

export async function validateDocumentation(rootDir) {
  const normalizedRoot = path.resolve(rootDir);
  const errors = [];

  await validateRequiredDocuments(normalizedRoot, errors);

  const rootMarkdownFiles = ["README.md", "AGENTS.md"].map((relativePath) =>
    path.join(normalizedRoot, relativePath),
  );
  const existingRootMarkdownFiles = [];

  for (const absolutePath of rootMarkdownFiles) {
    if (await exists(absolutePath)) {
      existingRootMarkdownFiles.push(absolutePath);
    }
  }

  const docsMarkdownFiles = await listMarkdownFiles(path.join(normalizedRoot, "docs"));
  await validateMarkdownLinks(
    normalizedRoot,
    [...existingRootMarkdownFiles, ...docsMarkdownFiles],
    errors,
  );

  const taskByPath = await validateTasks(normalizedRoot, errors);
  await validateCurrentSprint(normalizedRoot, taskByPath, errors);

  return errors;
}

async function runCli() {
  const errors = await validateDocumentation(process.cwd());

  if (errors.length > 0) {
    console.error("AI documentation check failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info("AI documentation check passed.");
}

const isCli =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  await runCli();
}
