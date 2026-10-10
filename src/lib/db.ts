import { PrismaClient } from "@prisma/client";

// 開発時のホットリロードで接続が増えないよう globalThis に保持する
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
