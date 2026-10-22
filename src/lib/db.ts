import { PrismaClient } from "@prisma/client";
import { assertEnv, REQUIRED_ENV } from "./env.ts";

// 開発時のホットリロードで接続が増えないよう globalThis に保持する
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  assertEnv(REQUIRED_ENV.db);
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
