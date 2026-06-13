import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

const EMPTY_VALUE = "__empty__";

function Select(props: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  className?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <SelectPrimitive.Root
      value={props.value}
      onValueChange={(value) =>
        props.onValueChange(value === EMPTY_VALUE ? "" : value)
      }
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-md border border-[#d7dfeb] bg-white px-3 text-sm text-[#192041] shadow-xs outline-none transition-colors focus:border-[#254591] focus:ring-2 focus:ring-[#254591]/20 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[#667085]",
          props.className,
        )}
      >
        <SelectPrimitive.Value placeholder={props.placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 text-[#254591]" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-[#d7dfeb] bg-white text-[#192041] shadow-xl"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            <SelectPrimitive.Item
              value={EMPTY_VALUE}
              className={cn(
                "relative flex h-9 cursor-default select-none items-center rounded px-8 text-sm text-[#667085] outline-none",
                "focus:bg-[rgba(134,193,234,0.22)]",
              )}
            >
              <SelectPrimitive.ItemText>{props.placeholder}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
            {props.options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex h-9 cursor-default select-none items-center rounded px-8 text-sm outline-none",
                  "focus:bg-[rgba(134,193,234,0.22)] data-[state=checked]:text-[#254591]",
                )}
              >
                <span className="absolute left-2 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
