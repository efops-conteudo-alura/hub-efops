import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProcessEditor } from "../_components/process-editor";

export default async function NovoProcessoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <ProcessEditor />;
}
