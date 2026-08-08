import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTaskLifeTargets } from "../../ipc/commands";
import type { TaskLifeAreaView } from "../../ipc/generated/TaskLifeAreaView";
import * as layout from "../../app/layout/layout.css";
import * as combo from "./TaskCombobox.css";

const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

export function LifeAreaCombobox({
  value,
  current,
  onChange,
}: {
  value: string | null;
  current?: TaskLifeAreaView | null | undefined;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const query = useQuery({
    queryKey: ["task-life-targets"],
    queryFn: listTaskLifeTargets,
  });
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = useMemo(() => {
    const needle = fold(filter);
    return (query.data ?? []).filter(
      (item) =>
        !needle || fold(`${item.title} ${item.breadcrumb}`).includes(needle),
    );
  }, [filter, query.data]);
  const select = (index: number) => {
    const option = options[index];
    if (option) {
      onChange(option.id);
      setFilter(option.breadcrumb);
      setOpen(false);
    }
  };
  return (
    <div className={layout.field}>
      <label htmlFor={id}>Life area</label>
      {current?.archived && value === current.id && (
        <p className={layout.fieldHelp}>Archived life area: {current.title}</p>
      )}
      <input
        className={combo.input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          open && options[active] ? `${id}-${options[active]!.id}` : undefined
        }
        value={filter}
        placeholder={
          current && !current.archived && value === current.id
            ? current.breadcrumb
            : "None"
        }
        disabled={query.isLoading}
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
      {query.isError && (
        <p className={layout.fieldHelp} role="alert">
          Life areas could not be loaded.
        </p>
      )}
      {!query.isLoading && !query.isError && open && (
        <ul className={combo.listbox} id={`${id}-listbox`} role="listbox">
          {options.length === 0 ? (
            <li className={combo.empty}>No matching Life areas.</li>
          ) : (
            options.map((option, index) => (
              <li
                className={combo.option}
                id={`${id}-${option.id}`}
                role="option"
                aria-selected={value === option.id}
                key={option.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(index)}
              >
                {option.title}
                <span>— {option.breadcrumb}</span>
              </li>
            ))
          )}
        </ul>
      )}
      {value && (
        <button
          className={combo.clear}
          type="button"
          onClick={() => {
            onChange(null);
            setFilter("");
            setOpen(false);
          }}
        >
          Clear Life area
        </button>
      )}
    </div>
  );
}
