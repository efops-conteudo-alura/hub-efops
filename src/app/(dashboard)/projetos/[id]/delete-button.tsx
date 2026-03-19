"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projetos/${id}`, { method: "DELETE" })
      if (res.ok) router.push("/projetos")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 size={14} className="mr-1" />
      {loading ? "Excluindo..." : "Excluir"}
    </Button>
  )
}
