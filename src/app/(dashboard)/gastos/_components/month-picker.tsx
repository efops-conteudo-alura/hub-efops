"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Props {
  value: string; // "AAAA-MM" ou ""
  onChange: (v: string) => void;
  placeholder?: string;
}

export function MonthPicker({ value, onChange, placeholder = "Selecionar" }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() =>
    value ? parseInt(value.slice(0, 4)) : new Date().getFullYear()
  );

  const selectedYear = value ? parseInt(value.slice(0, 4)) : null;
  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : null;

  function handleSelect(monthIndex: number) {
    const m = String(monthIndex + 1).padStart(2, "0");
    onChange(`${year}-${m}`);
    setOpen(false);
  }

  const displayLabel = value
    ? `${MONTHS[parseInt(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-36 justify-start font-normal text-sm">
          <CalendarDays size={14} className="mr-2 shrink-0 text-muted-foreground" />
          <span className={value ? "" : "text-muted-foreground"}>{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm font-medium">{year}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => {
            const isSelected = year === selectedYear && i === selectedMonth;
            return (
              <Button
                key={m}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleSelect(i)}
              >
                {m}
              </Button>
            );
          })}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => { onChange(""); setOpen(false); }}
          >
            Limpar
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
