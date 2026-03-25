import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DocEditor } from "../_components/doc-editor";

export default async function NovaDocumentacaoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="px-8 py-6 max-w-4xl">
      <DocEditor />
    </div>
  );
}
