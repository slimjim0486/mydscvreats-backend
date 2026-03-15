import { verifyToken } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export interface AuthContext {
  clerkId: string;
  email: string | null;
  fullName: string | null;
}

function isNetworkTimeoutError(error: unknown) {
  const stack = error instanceof Error ? error.stack ?? error.message : String(error);
  return stack.includes("ETIMEDOUT") || stack.includes("fetch failed");
}

export async function resolveAuthHeader(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("Missing authorization header", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let payload: Awaited<ReturnType<typeof verifyToken>>;

  try {
    payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      jwtKey: env.CLERK_JWT_KEY,
      authorizedParties: [env.FRONTEND_APP_URL],
    });
  } catch (error) {
    if (isNetworkTimeoutError(error)) {
      throw new ApiError(
        "Authentication verification timed out while reaching Clerk. Retry the request, or configure CLERK_JWT_KEY for networkless verification.",
        503
      );
    }

    throw error;
  }

  const meta = payload as Record<string, unknown>;
  const email =
    typeof meta.email === "string"
      ? meta.email
      : typeof meta.email_address === "string"
        ? meta.email_address
        : typeof meta.primary_email === "string"
          ? meta.primary_email
          : null;

  const fullName =
    typeof meta.full_name === "string" ? meta.full_name : null;

  return {
    clerkId: payload.sub,
    email,
    fullName,
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
      ...(auth.fullName && { fullName: auth.fullName }),
    },
    create: {
      clerkId: auth.clerkId,
      email: auth.email ?? `${auth.clerkId}@clerk.local`,
      fullName: auth.fullName,
    },
  });
}
