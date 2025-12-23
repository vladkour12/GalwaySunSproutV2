export const config = {
  runtime: 'edge',
};

export default async function handler(_req: Request) {
  const sha =
    // Available on Vercel builds
    (process.env.VERCEL_GIT_COMMIT_SHA as string | undefined) ??
    (process.env.VERCEL_GITHUB_COMMIT_SHA as string | undefined) ??
    null;

  const ref =
    (process.env.VERCEL_GIT_COMMIT_REF as string | undefined) ??
    (process.env.VERCEL_GITHUB_COMMIT_REF as string | undefined) ??
    null;

  return new Response(
    JSON.stringify({
      ok: true,
      sha,
      ref,
      deployedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Ensure this never gets cached while debugging deployments
        'Cache-Control': 'no-store',
      },
    }
  );
}

