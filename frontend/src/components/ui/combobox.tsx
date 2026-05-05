import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
  value: string;
  label: string;
}

function Combobox(props: {
  value: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  options: ComboboxOption[];
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => props.options.find((option) => option.value === props.value),
    [props.options, props.value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 w-full justify-between px-3 font-normal",
            selected ? "text-[#192041]" : "text-[#667085]",
          )}
        >
          <span className="truncate">{selected?.label || props.placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-[#254591]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)]">
        <Command>
          <CommandInput placeholder={props.searchPlaceholder || "Cauta..."} />
          <CommandList>
            <CommandEmpty>{props.emptyText || "Nu exista rezultate."}</CommandEmpty>
            {props.options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  props.onValueChange(option.value === props.value ? "" : option.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4 text-[#254591]",
                    props.value === option.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{option.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
