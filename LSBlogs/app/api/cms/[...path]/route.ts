import type { NextRequest } from "next/server";
import { handleCmsRequest } from "../../../../lib/cms/handler";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path: string[] }> };

async function dispatch(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleCmsRequest(request, path || []);
}

export const GET = dispatch;
export const POST = dispatch;
