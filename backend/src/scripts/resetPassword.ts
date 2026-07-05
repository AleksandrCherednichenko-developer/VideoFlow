import bcrypt from "bcrypt";

import { prisma } from "../db/prisma.js";

const PASSWORD_HASH_ROUNDS = 12;

function readArg(flag: string): string | undefined {
  const index = process.argv.findIndex((entry) => entry === flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1]?.trim();
}

function readCliArgs(): { email: string; password: string } {
  const email = readArg("--email")?.toLowerCase();
  const password = readArg("--password");

  if (email === undefined || email.length === 0) {
    throw new Error("Missing required argument --email");
  }

  if (password === undefined || password.length < 8) {
    throw new Error("Missing required argument --password or password is shorter than 8 characters");
  }

  return {
    email,
    password,
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

  const passwordHash = await bcrypt.hash(args.password, PASSWORD_HASH_ROUNDS);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: "ok",
        user,
        passwordUpdated: true,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch(async (error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Password reset failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
