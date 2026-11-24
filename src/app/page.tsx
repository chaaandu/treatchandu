import { connection } from "next/server";
import Desk from "@/components/Desk";
import { deskState } from "@/lib/state";

export default async function Page() {
  await connection();
  return <Desk initial={await deskState()} />;
}
