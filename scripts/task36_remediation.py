from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{relative}: expected one replacement target, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")


def insert_before_final_brace(relative: str, addition: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    brace_index = text.rfind("}")
    line_start = text.rfind("\n", 0, brace_index)
    if brace_index < 0 or line_start < 0 or text[brace_index + 1 :].strip():
        raise SystemExit(f"{relative}: expected a final line-delimited module brace")
    updated = text[:line_start] + "\n" + addition.rstrip() + "\n" + text[line_start + 1 :]
    path.write_text(updated, encoding="utf-8", newline="\n")


replace_once(
    "frontend/src/features/focus-plan/FocusPlansScreen.tsx",
    '''  async function runMutation(mutation: FocusPlanMutationAction) {
    if (!selected) return;
    setStatus("saving");
    setError(null);
    try {
      await mutateFocusPlan({
        plan_id: selected.id,
        expected_revision: selected.revision,
        operation_id: globalThis.crypto.randomUUID(),
        mutation,
      });
      await refreshSelected();
    } catch (cause) {
      setError(messageFromError(cause));
      try {
        setSelected(await getFocusPlan({ plan_id: selected.id }));
      } catch {
        // Preserve the original mutation error and the local form.
      }
      setStatus("ready");
    }
  }
''',
    '''  async function runMutation(mutation: FocusPlanMutationAction): Promise<boolean> {
    if (!selected) return false;
    setStatus("saving");
    setError(null);
    try {
      await mutateFocusPlan({
        plan_id: selected.id,
        expected_revision: selected.revision,
        operation_id: globalThis.crypto.randomUUID(),
        mutation,
      });
      await refreshSelected();
      return true;
    } catch (cause) {
      setError(messageFromError(cause));
      try {
        setSelected(await getFocusPlan({ plan_id: selected.id }));
      } catch {
        // Preserve the original mutation error and the local form.
      }
      setStatus("ready");
      return false;
    }
  }

  async function addVariant() {
    const label = newVariantLabel.trim();
    if (!label) return;
    if (await runMutation({ action: "add_variant", label })) {
      setNewVariantLabel("");
    }
  }

  async function addPhase() {
    const title = newPhaseTitle.trim();
    if (!selectedVariant || !title) return;
    if (
      await runMutation({
        action: "add_phase",
        variant_id: selectedVariant.id,
        title,
      })
    ) {
      setNewPhaseTitle("");
    }
  }
''',
)

replace_once(
    "frontend/src/features/focus-plan/FocusPlansScreen.tsx",
    '''                <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); if (newVariantLabel.trim()) { void runMutation({ action: "add_variant", label: newVariantLabel.trim() }); setNewVariantLabel(""); } }}><input className={styles.input} value={newVariantLabel} onChange={(event) => setNewVariantLabel(event.target.value)} placeholder="Alternative approach" /><button className={styles.secondaryButton} disabled={!newVariantLabel.trim() || status === "saving"}>Add approach</button></form>
''',
    '''                <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); void addVariant(); }}><input className={styles.input} value={newVariantLabel} onChange={(event) => setNewVariantLabel(event.target.value)} placeholder="Alternative approach" /><button className={styles.secondaryButton} disabled={!newVariantLabel.trim() || status === "saving"}>Add approach</button></form>
''',
)

replace_once(
    "frontend/src/features/focus-plan/FocusPlansScreen.tsx",
    '''                  <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); if (newPhaseTitle.trim()) { void runMutation({ action: "add_phase", variant_id: selectedVariant.id, title: newPhaseTitle.trim() }); setNewPhaseTitle(""); } }}><input className={styles.input} value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase" /><button className={styles.secondaryButton} disabled={!newPhaseTitle.trim() || status === "saving"}>Add phase</button></form>
''',
    '''                  <form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); void addPhase(); }}><input className={styles.input} value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase" /><button className={styles.secondaryButton} disabled={!newPhaseTitle.trim() || status === "saving"}>Add phase</button></form>
''',
)

replace_once(
    "frontend/src/features/focus-plan/FocusPlansScreen.test.tsx",
    '''    expect(screen.getByLabelText("Success criteria, one per line")).toHaveValue("Recovered criterion");

    fireEvent.change(screen.getByLabelText("New plan title"), { target: { value: "Interview Plan" } });
''',
    '''    expect(screen.getByLabelText("Success criteria, one per line")).toHaveValue("Recovered criterion");

    const alternative = screen.getByPlaceholderText("Alternative approach");
    fireEvent.change(alternative, { target: { value: "Keep this approach" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Approach rejected" });
    fireEvent.click(screen.getByRole("button", { name: "Add approach" }));
    await screen.findByText("Approach rejected");
    expect(alternative).toHaveValue("Keep this approach");

    const phase = screen.getByPlaceholderText("New phase");
    fireEvent.change(phase, { target: { value: "Keep this phase" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Phase rejected" });
    fireEvent.click(screen.getByRole("button", { name: "Add phase" }));
    await screen.findByText("Phase rejected");
    expect(phase).toHaveValue("Keep this phase");

    fireEvent.change(screen.getByLabelText("New plan title"), { target: { value: "Interview Plan" } });
''',
)

replace_once(
    "src-tauri/src/focus_plan/repository.rs",
    '''        "SELECT t.id,t.name FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id WHERE fpt.plan_id=?1 ORDER BY t.normalized_name,t.id",
''',
    '''        "SELECT t.id,t.name FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id WHERE fpt.plan_id=?1 AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL ORDER BY t.normalized_name,t.id",
''',
)

replace_once(
    "src-tauri/src/focus_plan/repository.rs",
    '''            let mut statement = tx.prepare(
                "SELECT id FROM focus_plan_phases WHERE variant_id=?1 AND archived_at IS NULL ORDER BY sort_key,id",
            )?;
            let mut ids = statement
                .query_map([variant_id], |row| row.get::<_, String>(0))?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            let old_index = ids
                .iter()
                .position(|id| id == phase_id)
                .ok_or(FocusPlanError::NotFound)?;
            let item = ids.remove(old_index);
            let target = (*new_index as usize).min(ids.len());
            ids.insert(target, item);
            for (index, id) in ids.iter().enumerate() {
                tx.execute(
                    "UPDATE focus_plan_phases SET sort_key=?2,updated_at=?3 WHERE id=?1",
                    params![id, index as u32, timestamp],
                )?;
            }
''',
    '''            let mut statement = tx.prepare(
                "SELECT id,archived_at FROM focus_plan_phases WHERE variant_id=?1 ORDER BY sort_key,id",
            )?;
            let ordered = statement
                .query_map([variant_id], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?.is_some(),
                    ))
                })?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            let mut active_ids = ordered
                .iter()
                .filter(|(_, archived)| !archived)
                .map(|(id, _)| id.clone())
                .collect::<Vec<_>>();
            let old_index = active_ids
                .iter()
                .position(|id| id == phase_id)
                .ok_or(FocusPlanError::NotFound)?;
            let item = active_ids.remove(old_index);
            let target = (*new_index as usize).min(active_ids.len());
            active_ids.insert(target, item);

            let mut active = active_ids.into_iter();
            let reordered = ordered
                .into_iter()
                .map(|(id, archived)| {
                    if archived {
                        Ok(id)
                    } else {
                        active.next().ok_or_else(|| {
                            FocusPlanError::Validation(
                                "Focus Plan phase ordering is inconsistent".into(),
                            )
                        })
                    }
                })
                .collect::<Result<Vec<_>>>()?;
            if active.next().is_some() {
                return Err(FocusPlanError::Validation(
                    "Focus Plan phase ordering is inconsistent".into(),
                ));
            }
            for (index, id) in reordered.iter().enumerate() {
                tx.execute(
                    "UPDATE focus_plan_phases SET sort_key=?2,updated_at=?3 WHERE id=?1",
                    params![id, index as u32, timestamp],
                )?;
            }
''',
)

TESTS = r'''
    #[test]
    fn phase_reorder_preserves_archived_slot_and_contiguous_restore_order() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let variant_id = plan.selected_variant_id.clone();

        let add_phase = |conn: &mut Connection,
                         revision: u64,
                         operation_id: &str,
                         title: &str|
         -> String {
            mutate(
                conn,
                MutateFocusPlanInput {
                    plan_id: plan.id.clone(),
                    expected_revision: revision,
                    operation_id: operation_id.into(),
                    mutation: FocusPlanMutationAction::AddPhase {
                        variant_id: variant_id.clone(),
                        title: title.into(),
                    },
                },
            )
            .unwrap()
            .created_id
            .unwrap()
        };

        let phase_a = add_phase(&mut conn, 0, "op-phase-a", "A");
        let phase_b = add_phase(&mut conn, 1, "op-phase-b", "B");
        let phase_c = add_phase(&mut conn, 2, "op-phase-c", "C");

        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 3,
                operation_id: "op-archive-b".into(),
                mutation: FocusPlanMutationAction::ArchivePhase {
                    variant_id: variant_id.clone(),
                    phase_id: phase_b.clone(),
                },
            },
        )
        .unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 4,
                operation_id: "op-move-c".into(),
                mutation: FocusPlanMutationAction::MovePhase {
                    variant_id: variant_id.clone(),
                    phase_id: phase_c.clone(),
                    new_index: 0,
                },
            },
        )
        .unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 5,
                operation_id: "op-restore-b".into(),
                mutation: FocusPlanMutationAction::RestorePhase {
                    variant_id,
                    phase_id: phase_b.clone(),
                },
            },
        )
        .unwrap();

        let detail = get(&conn, &plan.id).unwrap();
        let phases = &detail.variants[0].phases;
        assert_eq!(
            phases.iter().map(|phase| phase.id.as_str()).collect::<Vec<_>>(),
            vec![phase_c.as_str(), phase_b.as_str(), phase_a.as_str()]
        );
        assert_eq!(
            phases.iter().map(|phase| phase.sort_key).collect::<Vec<_>>(),
            vec![0, 1, 2]
        );
        assert!(phases.iter().all(|phase| !phase.archived));
    }

    #[test]
    fn archived_tag_joins_are_hidden_and_do_not_block_plan_updates() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let tag = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Foundations".into(),
            },
        )
        .unwrap();

        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-assign-tag".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: plan.title.clone(),
                    lifecycle: plan.lifecycle,
                    life_node_id: plan.life_node_id.clone(),
                    start_date: plan.start_date.clone(),
                    target_date: plan.target_date.clone(),
                    outcome: plan.outcome.clone(),
                    success_criteria: plan.success_criteria.clone(),
                    tag_ids: vec![tag.id.clone()],
                },
            },
        )
        .unwrap();
        assert_eq!(get(&conn, &plan.id).unwrap().tags.len(), 1);

        crate::tag::repository::archive(
            &conn,
            crate::tag::dto::MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: tag.revision,
            },
        )
        .unwrap();

        let hidden = get(&conn, &plan.id).unwrap();
        assert!(hidden.tags.is_empty());
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: hidden.revision,
                operation_id: "op-update-after-tag-archive".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: "AI Foundations Updated".into(),
                    lifecycle: hidden.lifecycle,
                    life_node_id: hidden.life_node_id,
                    start_date: hidden.start_date,
                    target_date: hidden.target_date,
                    outcome: hidden.outcome,
                    success_criteria: hidden.success_criteria,
                    tag_ids: Vec::new(),
                },
            },
        )
        .unwrap();

        let preserved_join_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, tag.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(preserved_join_count, 1);
        assert_eq!(get(&conn, &plan.id).unwrap().title, "AI Foundations Updated");
    }
'''

insert_before_final_brace("src-tauri/src/focus_plan/repository.rs", TESTS)
