import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProcessEditor } from "../_components/process-editor";

export default async function NovoProcessoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ProcessEditor />;
}
