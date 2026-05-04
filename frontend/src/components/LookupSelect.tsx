import type { Lookup } from "../types";

export function LookupSelect(props: {
  value: string;
  items: Lookup[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
      <option value="">{props.placeholder}</option>
      {props.items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
