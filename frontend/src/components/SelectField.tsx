import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField(props: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        className="h-10 w-full appearance-none rounded-md border border-[#d7dfeb] bg-white px-3 pr-10 text-sm text-[#192041] outline-none transition-colors focus:border-[#254591] focus:ring-2 focus:ring-[#254591]/20"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#254591]"
        aria-hidden="true"
      />
    </div>
  );
}
