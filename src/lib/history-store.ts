import type { ChatMessage } from "./chat-request.ts";
import { getPrisma } from "./db.ts";
import type { HistoryStore } from "./history.ts";

// sessionId で必ず絞り込む。他セッションの履歴は構造的に取得できない
export const prismaHistoryStore: HistoryStore = {
  async saveExchange(sessionId, user, assistant) {
    const prisma = getPrisma();
    await prisma.session.upsert({
      where: { token: sessionId },
      create: { token: sessionId },
      update: {},
    });
    // 表示順が安定するよう user → assistant を1msずらす
    const now = Date.now();
    await prisma.message.createMany({
      data: [
        { sessionId, role: "user", content: user, createdAt: new Date(now) },
        { sessionId, role: "assistant", content: assistant, createdAt: new Date(now + 1) },
      ],
    });
  },

  async list(sessionId) {
    const rows = await getPrisma().message.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { role: true, content: true },
    });
    return rows.flatMap((row): ChatMessage[] =>
      row.role === "user" || row.role === "assistant"
        ? [{ role: row.role, content: row.content }]
        : [],
    );
  },
};
