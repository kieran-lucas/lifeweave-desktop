import { useId, useMemo, useState, type CSSProperties } from "react";

import * as layout from "../../app/layout/layout.css";
import * as combo from "./TaskCombobox.css";

const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

type Option = { id: string };

export function TaskCombobox<T extends Option>({
  label,
  value,
  currentArchived,
  currentText,
  disabled,
  disabledReason,
  loading,
  error,
  options: available,
  optionLabel,
  optionMeta,
  optionDepth,
  hierarchical = false,
  optionValueText = optionLabel,
  optionSearchText,
  emptyMessage,
  errorMessage,
  clearLabel,
  onChange,
}: {
  label: string;
  value: string | null;
  currentArchived?: boolean | undefined;
  currentText?: string | undefined;
  disabled?: boolean | undefined;
  disabledReason?: string | undefined;
  loading: boolean;
  error: boolean;
  options: T[];
  optionLabel: (option: T) => string;
  optionMeta: (option: T) => string;
  optionDepth?: ((option: T) => number) | undefined;
  hierarchical?: boolean | undefined;
  optionValueText?: ((option: T) => string) | undefined;
  optionSearchText: (option: T) => string;
  emptyMessage: string;
  errorMessage: string;
  clearLabel: string;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = useMemo(() => {
    const needle = fold(filter);
    return available.filter(
      (option) => !needle || fold(optionSearchText(option)).includes(needle),
    );
  }, [available, filter, optionSearchText]);
  const selectedOption = available.find((option) => option.id === value);
  const selectedText = selectedOption ? optionValueText(selectedOption) : currentText;
  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.id);
    setFilter(optionValueText(option));
    setOpen(false);
  };

  return (
    <div className={`${layout.field} ${combo.root}`}>
      <label htmlFor={id}>{label}</label>
      {disabled && <p className={layout.fieldHelp} id={`${id}-scope`}>{disabledReason}</p>}
      {currentArchived && value && <p className={layout.fieldHelp}>{currentText}</p>}
      <input
        className={combo.input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        aria-describedby={disabled ? `${id}-scope` : undefined}
        aria-activedescendant={open && options[active] ? `${id}-${options[active]!.id}` : undefined}
        value={filter}
        placeholder={!currentArchived && value ? selectedText : "None"}
        disabled={disabled || loading}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setFilter(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            if (options.length > 0) setActive((index) => Math.min(index + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (options.length > 0) setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            select(active);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {error && <p className={layout.fieldHelp} role="alert">{errorMessage}</p>}
      {!disabled && !loading && !error && open && (
        <ul className={combo.listbox} id={`${id}-listbox`} role="listbox">
          {options.length === 0 ? (
            <li className={combo.empty}>{emptyMessage}</li>
          ) : options.map((option, index) => (
            <li
              className={combo.option}
              id={`${id}-${option.id}`}
              role="option"
              aria-selected={value === option.id}
              data-active={index === active}
              data-hierarchical={hierarchical || undefined}
              data-hierarchy-depth={hierarchical ? optionDepth?.(option) ?? 0 : undefined}
              key={option.id}
              style={hierarchical ? ({
                "--tree-indent": `${Math.max(0, optionDepth?.(option) ?? 0) * 18}px`,
              } as CSSProperties) : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(index)}
            >
              {optionLabel(option)}
              <span>— {optionMeta(option)}</span>
            </li>
          ))}
        </ul>
      )}
      {value && !disabled && (
        <button
          className={combo.clear}
          type="button"
          onClick={() => {
            onChange(null);
            setFilter("");
            setOpen(false);
          }}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
