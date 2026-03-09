import { verifyToken } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export interface AuthContext {
  clerkId: string;
  email: string | null;
}

export async function resolveAuthHeader(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("Missing authorization header", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = await verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY,
    jwtKey: undefined,
    authorizedParties: [env.FRONTEND_APP_URL],
  });

  return {
    clerkId: payload.sub,
    email:
      typeof payload.email === "string"
        ? payload.email
        : typeof payload.email_address === "string"
          ? payload.email_address
          : null,
  } satisfies AuthContext;
}

export const requireAuth: MiddlewareHandler<{
  Variables: {
    auth: AuthContext;
  };
}> = async (c, next) => {
  const auth = await resolveAuthHeader(c.req.header("authorization"));
  c.set("auth", auth);
  await next();
};

export async function getCurrentUser(auth: AuthContext) {
  return prisma.user.upsert({
    where: {
      clerkId: auth.clerkId,
    },
    update: {
      email: auth.email ?? `${auth.clerkId}@clerk.local`,
    },
    create: {
      clerkId: auth.clerkId,
      email: auth.email ?? `${auth.clerkId}@clerk.local`,
    },
  });
}
