import { validateRecord } from "@/lib/records";
import { getRecordStore } from "@/lib/server/database";
import { businessContext, errorResponse, jsonResponse, readMutation, requireId, requireVersion } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = requireId((await context.params).id);
    const input = await readMutation(request);
    const values = validateRecord(input);
    const record = getRecordStore().update(id, values, requireVersion(input), businessContext().today);
    return jsonResponse({ record });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const id = requireId((await context.params).id);
    const input = await readMutation(request);
    getRecordStore().delete(id, requireVersion(input), businessContext().today);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
