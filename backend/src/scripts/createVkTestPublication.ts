import { prisma } from "../db/prisma.js";
import { PLATFORM } from "../config/constants.js";
import { createPublication } from "../services/publications/publicationService.js";

const DEFAULT_DELAY_SECONDS = 30;
const DEFAULT_TEXT = "VideoFlow VK manual smoke check";

interface CliArgs {
  email: string;
  videoR2Key: string;
  delaySeconds: number;
  text: string;
}

function readArg(flag: string): string | undefined {
  const index = process.argv.findIndex((entry) => entry === flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseDelaySeconds(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_DELAY_SECONDS;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error("delaySeconds must be a non-negative integer");
  }

  return parsedValue;
}

function readCliArgs(): CliArgs {
  const email = readArg("--email")?.trim().toLowerCase();
  const videoR2Key = readArg("--video-r2-key")?.trim();
  const delaySeconds = parseDelaySeconds(readArg("--delay-seconds"));
  const text = readArg("--text")?.trim() ?? DEFAULT_TEXT;

  if (email === undefined || email.length === 0) {
    throw new Error("Missing required argument --email");
  }

  if (videoR2Key === undefined || videoR2Key.length === 0) {
    throw new Error("Missing required argument --video-r2-key");
  }

  if (text.length === 0) {
    throw new Error("--text must not be empty");
  }

  return {
    email,
    videoR2Key,
    delaySeconds,
    text,
  };
}

async function main(): Promise<void> {
  const args = readCliArgs();
  const user = await prisma.user.findUnique({
    where: {
      email: args.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (user === null) {
    throw new Error(`User not found for email ${args.email}`);
  }

  const scheduledAt = new Date(Date.now() + args.delaySeconds * 1000);
  const publication = await createPublication(
    {
      videoR2Key: args.videoR2Key,
      defaultText: args.text,
      scheduledAt: scheduledAt.toISOString(),
      platforms: [
        {
          platform: PLATFORM.VK,
          enabled: true,
        },
      ],
    },
    user.id,
  );

  console.log(
    JSON.stringify(
      {
        user,
        publication: {
          id: publication.id,
          status: publication.status,
          scheduledAt: publication.scheduledAt,
          videoR2Key: publication.videoR2Key,
          defaultText: publication.defaultText,
        },
      },
      null,
      2,
    ),
  );
}

void main()
  .catch(async (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "VK test publication creation failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
