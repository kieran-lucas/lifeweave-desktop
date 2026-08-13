import { useId, useState } from "react";

import * as layout from "../../app/layout/layout.css";
import * as combo from "./TaskCombobox.css";

const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const parentPath = (value: string) => {
  const boundary = value.lastIndexOf(" › ");
  return boundary < 0 ? "" : value.slice(0, boundary);
};

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
  optionPath,
  optionSearchText,
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
  optionPath?: ((option: T) => string) | undefined;
  optionSearchText: (option: T) => string;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [path, setPath] = useState("");
  const needle = fold(filter.trim());
  const options = available.filter((option) =>
    needle
      ? fold(optionSearchText(option)).includes(needle)
      : !optionPath || parentPath(optionPath(option)) === path,
  );
  const selected = available.find((option) => option.id === value);
  const selectedText = selected ? optionLabel(selected) : currentText;
  const hasChildren = (option: T) => Boolean(optionPath && available.some(
    (candidate) => parentPath(optionPath(candidate)) === optionPath(option),
  ));
  const back = () => {
    setPath(parentPath(path));
    setActive(0);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (optionPath && hasChildren(option)) {
      setPath(optionPath(option));
      setFilter("");
      setActive(0);
    } else {
      onChange(option.id);
      setFilter("");
      setOpen(false);
    }
  };

  return (
    <div className={`${layout.field} ${combo.root}`}>
      <label htmlFor={id}>{label}</label>
      {disabled && <p className={layout.fieldHelp} id={`${id}-scope`}>{disabledReason}</p>}
      {currentArchived && value && <span className={combo.archived}>Archived</span>}
      <input
        className={combo.input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        aria-describedby={disabled ? `${id}-scope` : undefined}
        aria-activedescendant={open && options[active] ? `${id}-${options[active]!.id}` : undefined}
        value={open ? filter : selectedText ?? ""}
        placeholder={open ? "Search…" : "None"}
        disabled={disabled || loading}
        onFocus={() => {
          setFilter("");
          setPath("");
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setFilter(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (options.length) setActive((index) => Math.min(index + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (options.length) setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            choose(active);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {error && <p className={layout.fieldHelp} role="alert">{label} could not be loaded.</p>}
      {!disabled && !loading && !error && open && (
        <div className={combo.popover} data-task-combobox-popover>
          {optionPath && !filter.trim() && (
            <div className={combo.treeHeader}>
              {path && (
                <button type="button" aria-label="Back one Life area level" onMouseDown={(event) => event.preventDefault()} onClick={back}>←</button>
              )}
              <strong>{path || label}</strong>
            </div>
          )}
          <ul className={combo.listbox} id={`${id}-listbox`} role="listbox">
            {options.length === 0 ? (
              <li className={combo.empty}>No matching {label}.</li>
            ) : options.map((option, index) => {
              const child = hasChildren(option);
              return (
                <li
                  className={combo.option}
                  id={`${id}-${option.id}`}
                  role="option"
                  aria-selected={value === option.id}
                  data-active={index === active}
                  data-has-children={child || undefined}
                  key={option.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                >
                  <span className={combo.optionTitle}>{optionLabel(option)}</span>
                  {(!optionPath || filter.trim()) && <span className={combo.optionMeta}>{optionMeta(option)}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {value && !disabled && (
        <button className={combo.clear} type="button" aria-label={`Clear ${label}`} onClick={() => onChange(null)} />
      )}
    </div>
  );
}
