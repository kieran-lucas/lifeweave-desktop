import { browser } from "@wdio/globals";

/**
 * Task 50 populated-state fixture.
 *
 * §37 of the layout contract is explicit: a layout that only works while empty is not complete.
 * The capture and geometry specs therefore need every surface to hold real content, including the
 * long-string stress cases from §38 that are the usual cause of page-level horizontal overflow.
 *
 * Seeding runs through raw IPC on purpose. Geometry is only ever asserted against screens reached
 * through the UI; building the data through the product's own dialogs would add minutes of typing
 * to every viewport iteration and would prove nothing about layout.
 *
 * Everything here is idempotent by title, so a re-run against a warm profile adds nothing.
 */

/** §38 — a title long enough to break an unbounded track, inside the product's own limits. */
export const LONG_TASK_TITLE =
  "Quarterly cross-functional retrospective synthesis and follow-up commitments review";
export const LONG_PLAN_TITLE =
  "Rebuild the household documentation system end to end before the winter move";
export const LONG_LIFE_TITLE =
  "Long-running professional development and certification track for the coming year";
export const LONG_TAG = "long-running-preparation-and-review";
export const VIETNAMESE_TASK_TITLE =
  "Ưu tiên sức khỏe và hoàn thành kế hoạch quý";
export const VIETNAMESE_LIFE_TITLE = "Nhịp sống bền vững";
export const VIETNAMESE_DOCUMENT = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "ĐÁNH GIÁ TIẾN ĐỘ QUÝ" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Duy trì nhịp sống cân bằng, chăm sóc " },
        { type: "text", text: "sức khỏe", marks: [{ type: "bold" }] },
        { type: "text", text: " và dành khoảng " },
        { type: "text", text: "tĩnh lặng", marks: [{ type: "italic" }] },
        { type: "text", text: " để suy ngẫm mỗi ngày." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Việc cần ghi nhớ" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Ưu tiên điều quan trọng trước." }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Giữ lời hứa với chính mình." }] }],
        },
      ],
    },
  ],
};

export type SeedResult = {
  ok: boolean;
  stage: string;
  error: string;
  taskCount: number;
  planId: string;
  lifeRootChildId: string;
  lifeDocumentedChildId: string;
  lifeNarrativeChildId: string;
  lifeEmptyChildId: string;
};

export async function seedLayoutFixture(
  localDate: string,
  options: { vietnamese?: boolean } = {},
): Promise<SeedResult> {
  const result = await browser.execute(
    async (
      today: string,
      longTask: string,
      longPlan: string,
      longLife: string,
      longTag: string,
      includeVietnamese: boolean,
      vietnameseTask: string,
      vietnameseLife: string,
      vietnameseDocument: object,
    ) => {
      type Invoke = <T>(command: string, payload?: unknown) => Promise<T>;
      const invoke = (
        window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } }
      ).__TAURI_INTERNALS__.invoke;
      const systemNow = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const observedToday = `${systemNow.getFullYear()}-${pad(systemNow.getMonth() + 1)}-${pad(systemNow.getDate())}`;
      let stage = "start";
      try {
        stage = "categories";
        const categories = await invoke<Array<{ id: string; name: string; goal_revision: number }>>(
          "list_task_categories",
        );
        const category = (index: number) => categories[index % categories.length]!.id;

        stage = "tags";
        type Tag = { id: string; name: string; revision: number; archived: boolean };
        const existingTags = await invoke<Tag[]>("list_tags", { includeArchived: true });
        const ensureTag = async (name: string) => {
          const found = existingTags.find(tag => tag.name === name);
          if (found) return found;
          const created = await invoke<Tag>("create_tag", { input: { name } });
          existingTags.push(created);
          return created;
        };
        const tagIds = [
          (await ensureTag("layout-alpha")).id,
          (await ensureTag("layout-beta")).id,
          (await ensureTag(longTag)).id,
        ];
        // One archived tag so the Settings tag table renders both lifecycle states. Archiving is
        // revision-guarded, so the freshly read revision has to travel with the request.
        const archivable = await ensureTag("layout-archived");
        if (!archivable.archived)
          await invoke("archive_tag", {
            input: { tag_id: archivable.id, expected_revision: archivable.revision },
          }).catch(() => undefined);

        stage = "life";
        type Browse = {
          tree_revision: number;
          children: Array<{ id: string; title: string }>;
          child_page_count: number;
        };
        const browse = (nodeId: string, page = 0) =>
          invoke<Browse>("get_life_browse_projection", {
            input: { node_id: nodeId, child_page: page },
          });
        const allChildren = async (nodeId: string) => {
          const first = await browse(nodeId);
          const children = [...first.children];
          for (let page = 1; page < first.child_page_count; page += 1)
            children.push(...(await browse(nodeId, page)).children);
          return { children, treeRevision: first.tree_revision };
        };
        let seq = 0;
        const ensureNode = async (parentId: string, title: string) => {
          const scope = await allChildren(parentId);
          const found = scope.children.find(child => child.title === title);
          if (found) return found.id;
          const created = await invoke<{ node: { id: string } }>("create_life_node", {
            input: {
              context: {
                operation_id: `task50-layout-${seq++}-${title.replace(/\W+/g, "-").slice(0, 40)}`,
                expected_tree_revision: scope.treeRevision,
              },
              parent_id: parentId,
              title,
              short_description: title === vietnameseLife
                ? "Một không gian ghi chép dành cho sức khỏe, ưu tiên và những nhịp điệu bền vững."
                : `${title} — seeded so Browse renders a focal node with a real description block rather than an empty state.`,
              icon_key: "life-branch",
              theme_variant: "neutral",
            },
          });
          return created.node.id;
        };
        const area = await ensureNode("life-root", "Layout Area");
        // Enough children that the Browse child grid fills all four tracks.
        const childIds: string[] = [];
        const childNames = [
          "Layout Child One",
          "Layout Child Two",
          "Layout Child Three",
          "Layout Child Four",
          "Layout Child Five",
          longLife,
        ];
        if (includeVietnamese) childNames.push(vietnameseLife);
        for (const name of childNames)
          childIds.push(await ensureNode(area, name));
        const documented = includeVietnamese ? childIds.at(-1)! : childIds[0]!;
        const narrative = childIds[1]!;
        const readerProjection = await invoke<{
          document: { id: string; revision: number; plain_text: string } | null;
        }>(
          "get_reader_document",
          { input: { life_node_id: documented } },
        );
        const readerDocument = readerProjection.document ??
          await invoke<{ id: string; revision: number; plain_text: string }>("create_reader_document", {
            input: { life_node_id: documented, operation_id: "task50-layout-reader" },
          });
        if (includeVietnamese && !readerDocument.plain_text.includes("ĐÁNH GIÁ TIẾN ĐỘ QUÝ"))
          await invoke("save_reader_document", {
            input: {
              document_id: readerDocument.id,
              expected_revision: readerDocument.revision,
              schema_version: 1,
              canonical_json: JSON.stringify(vietnameseDocument),
              operation_id: "task51-vietnamese-reader",
            },
          });
        const narrativeProjection = await invoke<{ document: { id: string } | null }>(
          "get_narrative_document",
          { input: { life_node_id: narrative } },
        );
        if (!narrativeProjection.document)
          await invoke("create_narrative_document", {
            input: { life_node_id: narrative, operation_id: "task51-layout-narrative", template_id: "knowledge_dossier" },
          });
        await invoke("pin_life_node", { input: { node_id: area } }).catch(() => undefined);

        stage = "plan";
        // The portfolio is required and single-valued, so a seeded Plan has to be looked for in
        // both the portfolio it starts in and the one it is promoted to.
        const plans: Array<{ id: string; title: string }> = [];
        for (const portfolio of ["draft", "active"])
          plans.push(
            ...(await invoke<Array<{ id: string; title: string }>>("list_focus_plans", {
              input: { portfolio, limit: null, offset: null },
            })),
          );
        let planId = plans.find(plan => plan.title === longPlan)?.id ?? "";
        if (!planId) {
          // `FocusPlanDetailView` is flat: no `plan` wrapper, and `mutate_focus_plan` answers with
          // `{ plan_id, revision, … }` rather than a detail view.
          const created = await invoke<{ id: string; revision: number }>(
            "create_focus_plan",
            {
              input: {
                title: longPlan,
                life_node_id: area,
                start_date: today,
                target_date: today,
                outcome:
                  "Every recurring household document has one canonical home and one review cadence.",
                success_criteria: [
                  "Every document has a canonical location",
                  "Every review has an owner and a cadence",
                  "Nothing lives only in an inbox",
                ],
                initial_variant_label: "Primary approach",
                operation_id: "task50-layout-plan",
              },
            },
          );
          planId = created.id;
        }
        const detail = await invoke<{
          id: string;
          revision: number;
          lifecycle: string;
          variants: Array<{ id: string; label: string; phases: Array<{ id: string }> }>;
        }>("get_focus_plan", { input: { plan_id: planId } });
        let revision = detail.revision;
        const mutate = async (mutation: unknown, operation: string) => {
          const outcome = await invoke<{ plan_id: string; revision: number }>(
            "mutate_focus_plan",
            {
              input: {
                plan_id: planId,
                expected_revision: revision,
                operation_id: `task50-layout-${operation}`,
                mutation,
              },
            },
          );
          revision = outcome.revision;
        };
        if (detail.lifecycle === "draft")
          await mutate(
            {
              action: "update_plan",
              title: longPlan,
              lifecycle: "active",
              life_node_id: area,
              start_date: today,
              target_date: today,
              outcome:
                "Every recurring household document has one canonical home and one review cadence.",
              success_criteria: [
                "Every document has a canonical location",
                "Every review has an owner and a cadence",
                "Nothing lives only in an inbox",
              ],
              tag_ids: tagIds.slice(0, 2),
            },
            "activate",
          );
        const variantId = detail.variants[0]?.id;
        if (variantId && (detail.variants[0]?.phases.length ?? 0) === 0)
          for (const title of ["Inventory", "Consolidate", "Review cadence"])
            await mutate(
              { action: "add_phase", variant_id: variantId, title },
              `phase-${title.toLowerCase()}`,
            );
        if (detail.variants.length < 2)
          await mutate({ action: "add_variant", label: "Alternative approach" }, "variant-two");
        await invoke("create_focus_plan_review", {
          input: {
            plan_id: planId,
            operation_id: "task50-layout-review",
            reviewed_local_date: today,
            reflection:
              "First pass established the inventory. The consolidation step is larger than expected and needs its own week.",
            next_focus: "Consolidate the paper archive before touching digital scans.",
          },
        }).catch(() => undefined);

        stage = "tasks";
        const existing = await invoke<Array<{ id: string; title: string }>>("list_tasks_for_date", {
          localDate: today,
          observedLocalDate: today,
        });
        const seeds: Array<{
          title: string;
          start: number;
          end: number;
          deadline: string | null;
          life: string | null;
          plan: string | null;
          tags: string[];
        }> = [
          { title: "Morning review", start: 6 * 60, end: 6 * 60 + 45, deadline: null, life: area, plan: planId, tags: tagIds },
          { title: longTask, start: 9 * 60, end: 10 * 60 + 30, deadline: today, life: area, plan: planId, tags: tagIds.slice(0, 2) },
          { title: "Deep work block", start: 11 * 60, end: 12 * 60, deadline: null, life: null, plan: null, tags: [] },
          { title: "Afternoon sync", start: 14 * 60, end: 14 * 60 + 30, deadline: today, life: area, plan: null, tags: tagIds.slice(2) },
          { title: "Errand run", start: 16 * 60, end: 17 * 60, deadline: null, life: null, plan: null, tags: [] },
          { title: "Evening reading", start: 20 * 60, end: 21 * 60, deadline: null, life: area, plan: null, tags: [] },
        ];
        if (includeVietnamese)
          seeds.splice(1, 0, {
            title: vietnameseTask,
            start: 7 * 60,
            end: 7 * 60 + 45,
            deadline: today,
            life: documented,
            plan: planId,
            tags: tagIds.slice(0, 2),
          });
        const created: string[] = [];
        let index = 0;
        for (const seed of seeds) {
          const already = existing.find(task => task.title === seed.title);
          if (already) {
            created.push(already.id);
            index += 1;
            continue;
          }
          const task = await invoke<{ id: string }>("create_task", {
            input: {
              title: seed.title,
              description:
                seed.title === vietnameseTask
                  ? "Rà soát tiến độ, điều chỉnh ưu tiên và ghi lại những thay đổi cần thiết."
                  : "Seeded for the Task 50 layout matrix so the timeline renders content rather than an empty state.",
              local_date: today,
              start_minute: seed.start,
              end_minute: seed.end,
              category_id: category(index),
              priority: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
              life_node_id: seed.life,
              focus_plan_id: seed.plan,
              deadline_local_date: seed.deadline,
              tag_ids: seed.tags,
            },
          });
          created.push(task.id);
          index += 1;
        }

        stage = "recurring";
        const occurrences = await invoke<Array<{ title: string }>>("list_recurring_occurrences", {
          localDate: today,
        });
        if (!occurrences.some(row => row.title === "Daily standup"))
          await invoke("create_recurring_task", {
            input: {
              title: "Daily standup",
              description: "Recurring seed so the timeline carries both Task kinds.",
              local_date: today,
              start_minute: 8 * 60,
              end_minute: 8 * 60 + 15,
              category_id: category(0),
              priority: "medium",
              frequency: "daily",
              interval: 1,
              weekdays: [],
              until: null,
              count: 30,
              life_node_id: area,
              focus_plan_id: planId,
              tag_ids: [],
            },
          });

        stage = "actual-time";
        const active = await invoke<{ session_id: string } | null>("get_active_task_actual_time");
        if (!active && created[2]) {
          const started = await invoke<{ active_session_id: string | null }>(
            "start_task_actual_time",
            { input: { task_id: created[2], operation_id: "task50-layout-timer" } },
          );
          if (started.active_session_id)
            await invoke("stop_task_actual_time", {
              input: { session_id: started.active_session_id },
            }).catch(() => undefined);
        }

        stage = "goals";
        for (const goal of categories.slice(0, 3))
          await invoke("update_category_goals", {
            input: {
              category_id: goal.id,
              weekly_minimum_minutes: 120,
              weekly_target_minutes: 300,
              expected_revision: goal.goal_revision,
              operation_id: `task50-layout-goal-${goal.id}`,
              // Goal revisions are effective against the native clock. The visual fixture date may
              // be pinned to keep screenshots stable, but this concurrency anchor must remain the
              // real local date or the backend correctly rejects it as stale.
              observed_local_date: observedToday,
            },
          }).catch(() => undefined);

        stage = "saved-view";
        const views = await invoke<Array<{ name: string }>>("list_task_saved_views");
        if (!views.some(view => view.name === "Layout sample view"))
          await invoke("create_task_saved_view", {
            input: {
              name: "Layout sample view",
              base_scope: "upcoming",
              predicate: { type: "all", clauses: [] },
              sort_mode: "base_default",
              group_mode: "base_default",
            },
          }).catch(() => undefined);

        return {
          ok: true,
          stage: "done",
          error: "",
          taskCount: created.length,
          planId,
          lifeRootChildId: area,
          lifeDocumentedChildId: documented,
          lifeNarrativeChildId: narrative,
          lifeEmptyChildId: childIds[2]!,
        };
      } catch (error) {
        return {
          ok: false,
          stage,
          error: error instanceof Error ? error.message : String(error),
          taskCount: 0,
          planId: "",
          lifeRootChildId: "",
          lifeDocumentedChildId: "",
          lifeNarrativeChildId: "",
          lifeEmptyChildId: "",
        };
      }
    },
    localDate,
    LONG_TASK_TITLE,
    LONG_PLAN_TITLE,
    LONG_LIFE_TITLE,
    LONG_TAG,
    options.vietnamese === true,
    VIETNAMESE_TASK_TITLE,
    VIETNAMESE_LIFE_TITLE,
    VIETNAMESE_DOCUMENT,
  );
  return result;
}

/** The app's own local date, so seeded Tasks land on the day Today actually renders. */
export async function appLocalDate(): Promise<string> {
  const fixed = process.env.LIFEWEAVE_AUDIT_LOCAL_DATE;
  if (fixed) return fixed;
  return browser.execute(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
}
