import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listFocusPlanTargets } from "../../ipc/commands";
import type { TaskFocusPlanView } from "../../ipc/generated/TaskFocusPlanView";

const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

export function FocusPlanCombobox({
  value,
  current,
  disabled,
  disabledReason,
  onChange,
}: {
  value: string | null;
  current?: TaskFocusPlanView | null | undefined;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  // The query stays enabled even at occurrence scope: switching to entire-series scope must
  // enable the control immediately rather than after a fresh fetch.
  const query = useQuery({
    queryKey: ["focus-plan-targets"],
    queryFn: listFocusPlanTargets,
  });
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = useMemo(() => {
    const needle = fold(filter);
    return (query.data ?? []).filter(
      (item) => !needle || fold(item.title).includes(needle),
    );
  }, [filter, query.data]);
  const select = (index: number) => {
    const option = options[index];
    if (option) {
      onChange(option.id);
      setFilter(option.title);
      setOpen(false);
    }
  };
  return (
    <div>
      <label htmlFor={id}>Focus Plan</label>
      {disabled && <p id={`${id}-scope`}>{disabledReason}</p>}
      {current?.archived && value === current.id && (
        <p>Archived Focus Plan: {current.title}</p>
      )}
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-describedby={disabled ? `${id}-scope` : undefined}
        aria-activedescendant={
          open && options[active] ? `${id}-${options[active]!.id}` : undefined
        }
        value={filter}
        placeholder={
          current && !current.archived && value === current.id
            ? current.title
            : "None"
        }
        disabled={disabled || query.isLoading}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setFilter(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            if (options.length > 0)
              setActive((i) => Math.min(i + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (options.length > 0) setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            select(active);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      {query.isError && <p role="alert">Focus Plans could not be loaded.</p>}
      {!disabled && !query.isLoading && !query.isError && open && (
        <ul id={`${id}-listbox`} role="listbox">
          {options.length === 0 ? (
            <li>No matching Focus Plans.</li>
          ) : (
            options.map((option, index) => (
              <li
                id={`${id}-${option.id}`}
                role="option"
                aria-selected={value === option.id}
                key={option.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(index)}
              >
                {option.title}
                <span> — {option.lifecycle}</span>
              </li>
            ))
          )}
        </ul>
      )}
      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setFilter("");
            setOpen(false);
          }}
        >
          Clear Focus Plan
        </button>
      )}
    </div>
  );
}
