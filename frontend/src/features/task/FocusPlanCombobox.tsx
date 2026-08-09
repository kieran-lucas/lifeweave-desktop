import { useQuery } from "@tanstack/react-query";
import { listFocusPlanTargets } from "../../ipc/commands";
import type { TaskFocusPlanView } from "../../ipc/generated/TaskFocusPlanView";
import { TaskCombobox } from "./TaskCombobox";

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
  // The query stays enabled even at occurrence scope: switching to entire-series scope must
  // enable the control immediately rather than after a fresh fetch.
  const query = useQuery({
    queryKey: ["focus-plan-targets"],
    queryFn: listFocusPlanTargets,
  });
  return (
    <TaskCombobox
      label="Focus Plan"
      value={value}
      currentArchived={current?.archived && value === current.id}
      currentText={current ? `${current.archived ? "Archived Focus Plan: " : ""}${current.title}` : undefined}
      disabled={disabled}
      disabledReason={disabledReason}
      loading={query.isLoading}
      error={query.isError}
      options={query.data ?? []}
      optionLabel={(option) => option.title}
      optionMeta={(option) => option.lifecycle}
      optionSearchText={(option) => option.title}
      emptyMessage="No matching Focus Plans."
      errorMessage="Focus Plans could not be loaded."
      clearLabel="Clear Focus Plan"
      onChange={onChange}
    />
  );
}
