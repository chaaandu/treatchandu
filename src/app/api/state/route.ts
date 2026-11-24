import { connection } from "next/server";
import { deskState } from "@/lib/state";

export async function GET() {
  await connection();
  return Response.json(await deskState(), { headers: { "cache-control": "no-store" } });
}
