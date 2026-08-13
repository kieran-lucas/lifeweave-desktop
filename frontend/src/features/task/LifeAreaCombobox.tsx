import { useQuery } from "@tanstack/react-query";
import { listTaskLifeTargets } from "../../ipc/commands";
import type { TaskLifeAreaView } from "../../ipc/generated/TaskLifeAreaView";
import type { TaskLifeTargetView } from "../../ipc/generated/TaskLifeTargetView";
import { TaskCombobox } from "./TaskCombobox";

export const lifeAreaParentPath = (target: TaskLifeTargetView) => {
  const segments = target.breadcrumb.split(/\s*›\s*/u).filter(Boolean);
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
      currentText={current?.title}
      loading={query.isLoading}
      error={query.isError}
      options={query.data ?? []}
      optionLabel={(option) => option.title}
      optionMeta={lifeAreaParentPath}
      optionPath={(option) => option.breadcrumb}
      optionSearchText={(option) => `${option.title} ${option.breadcrumb}`}
      onChange={onChange}
    />
  );
}
