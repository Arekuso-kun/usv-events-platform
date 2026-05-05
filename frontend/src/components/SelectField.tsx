import { Select } from "./ui/select";

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
    <Select
      value={props.value}
      placeholder={props.placeholder}
      options={props.options}
      onValueChange={props.onChange}
    />
  );
}
