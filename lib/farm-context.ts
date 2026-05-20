import { db } from "@/lib/db";
import type { Session } from "next-auth";
import type { Farm } from "@prisma/client";

export interface FarmContext {
  farm: Farm;
  role: string;
}

/**
 * Returns the Farm for the currently authenticated user based on farmId
 * embedded in the JWT session token. Throws if not found.
 */
export async function getCurrentFarm(session: Session): Promise<FarmContext> {
  const farmId = (session as unknown as { farmId?: string }).farmId;

  if (!farmId) {
    throw new Error("No farmId in session");
  }

  const farmUser = await db.farmUser.findFirst({
    where: {
      farmId,
      userId: session.user?.id as string,
    },
    include: {
      farm: true,
    },
  });

  if (!farmUser) {
    throw new Error("Farm not found for current user");
  }

  return {
    farm: farmUser.farm,
    role: farmUser.role,
  };
}
