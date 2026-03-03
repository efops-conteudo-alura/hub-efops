"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { SubscriptionUploadDialog } from "./upload-dialog";

export function SubscriptionUploadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} className="mr-2" /> Importar Excel
      </Button>
      <SubscriptionUploadDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
