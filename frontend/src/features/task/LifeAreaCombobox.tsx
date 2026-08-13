import { useQuery } from "@tanstack/react-query";
import { listTaskLifeTargets } from "../../ipc/commands";
import type { TaskLifeAreaView } from "../../ipc/generated/TaskLifeAreaView";
import type { TaskLifeTargetView } from "../../ipc/generated/TaskLifeTargetView";
import { TaskCombobox } from "./TaskCombobox";

export const lifeAreaSegments = (target: TaskLifeTargetView) =>
  target.breadcrumb.split(/\s*›\s*/u).filter(Boolean);

export const lifeAreaDepth = (target: TaskLifeTargetView) =>
  Math.max(0, lifeAreaSegments(target).length - 1);

export const lifeAreaParentPath = (target: TaskLifeTargetView) => {
  const segments = lifeAreaSegments(target);
  return segments.length > 1
    ? `Within ${segments.slice(0, -1).join(" › ")}`
    : "Primary life domain";
};

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
      optionMeta={lifeAreaParentPath}
      optionDepth={lifeAreaDepth}
      hierarchical
      optionValueText={(option) => option.breadcrumb}
      optionSearchText={(option) => `${option.title} ${option.breadcrumb}`}
      emptyMessage="No matching Life areas."
      errorMessage="Life areas could not be loaded."
      clearLabel="Clear Life area"
      onChange={onChange}
    />
  );
}
