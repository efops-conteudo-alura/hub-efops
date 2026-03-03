"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { AutomacaoUploadDialog } from "./upload-dialog";

export function AutomacaoUploadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} className="mr-2" /> Importar Excel
      </Button>
      <AutomacaoUploadDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
