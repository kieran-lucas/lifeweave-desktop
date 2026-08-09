import { useQuery } from "@tanstack/react-query";
import { listTaskLifeTargets } from "../../ipc/commands";
import type { TaskLifeAreaView } from "../../ipc/generated/TaskLifeAreaView";
import { TaskCombobox } from "./TaskCombobox";

export function LifeAreaCombobox({
  value,
  current,
  onChange,
}: {
  value: string | null;
  current?: TaskLifeAreaView | null | undefined;
  onChange: (value: string | null) => void;
}) {
  const query = useQuery({
    queryKey: ["task-life-targets"],
    queryFn: listTaskLifeTargets,
  });
  return (
    <TaskCombobox
      label="Life area"
      value={value}
      currentArchived={current?.archived && value === current.id}
      currentText={current ? `${current.archived ? "Archived life area: " : ""}${current.archived ? current.title : current.breadcrumb}` : undefined}
      loading={query.isLoading}
      error={query.isError}
      options={query.data ?? []}
      optionLabel={(option) => option.title}
      optionMeta={(option) => option.breadcrumb}
      optionValueText={(option) => option.breadcrumb}
      optionSearchText={(option) => `${option.title} ${option.breadcrumb}`}
      emptyMessage="No matching Life areas."
      errorMessage="Life areas could not be loaded."
      clearLabel="Clear Life area"
      onChange={onChange}
    />
  );
}
