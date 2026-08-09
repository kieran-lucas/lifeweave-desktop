import * as controls from "../../design-system/primitives/controls.css";
import { EmptyState, LoadingRow, SkeletonList } from "../../design-system/primitives/States";
import { iconDismiss, iconFlag, iconMore, iconSearch, iconToday } from "../../design-system/visual/icons";
import { Icon } from "../../design-system/visual/icons";
import * as g from "./gallery.css";

/**
 * The control state matrix, rendered.
 *
 * ADR 0045 §40 asks every reusable primitive to be proven in default, hover, pressed, focused,
 * disabled, selected, loading and destructive, plus forced colors and reduced motion. A matrix that
 * only exists in a checklist is not evidence, so it exists here and is captured.
 *
 * Lives in the prototype entry, which the production build excludes, so proving the system costs
 * the shipped bundle nothing.
 */
export function ControlGallery() {
  return (
    <div className={g.page}>
      <h1 className={g.pageTitle}>Control state matrix</h1>
      <p className={g.lede}>
        Every shared primitive, every state. Hover and press are shown as forced classes as well as
        live, because a screenshot cannot hover. Vietnamese is included in every text role.
      </p>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>Buttons</h2>
        <div className={g.row}>
          <button type="button" className={controls.button.primary}>Lưu thay đổi</button>
          <button type="button" className={controls.button.secondary}>Secondary</button>
          <button type="button" className={controls.button.ghost}>Ghost</button>
          <button type="button" className={controls.button.destructive}>Xoá</button>
          <button type="button" className={controls.button.primary} disabled>Disabled</button>
          <button type="button" className={`${controls.button.secondary} ${controls.compact}`}>Compact</button>
          <button type="button" className={controls.iconButton} aria-label="More actions">
            <Icon d={iconMore} />
          </button>
          <button type="button" className={controls.iconButton} aria-label="Dismiss">
            <Icon d={iconDismiss} />
          </button>
        </div>
      </section>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>Inputs</h2>
        <div className={g.grid}>
          <label className={g.field}>
            <span>Text</span>
            <input type="text" defaultValue="Kế hoạch tuần" />
          </label>
          <label className={g.field}>
            <span>Placeholder</span>
            <input type="text" placeholder="Tìm kiếm…" />
          </label>
          <label className={g.field}>
            <span>Disabled</span>
            <input type="text" defaultValue="Không sửa được" disabled />
          </label>
          <label className={g.field}>
            <span>Invalid</span>
            <input type="text" defaultValue="bad" aria-invalid="true" />
          </label>
          <label className={g.field}>
            <span>Select</span>
            <select defaultValue="b">
              <option value="a">Buổi sáng</option>
              <option value="b">Buổi chiều</option>
            </select>
          </label>
          <label className={g.field}>
            <span>Date</span>
            <input type="date" defaultValue="2026-08-09" />
          </label>
          <label className={g.field}>
            <span>Time</span>
            <input type="time" defaultValue="09:30" />
          </label>
          <label className={g.field}>
            <span>Number</span>
            <input type="number" defaultValue={90} />
          </label>
        </div>
        <label className={g.field}>
          <span>Textarea</span>
          <textarea rows={2} defaultValue="Buổi sáng dành cho việc khó nhất." />
        </label>
      </section>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>Selection controls</h2>
        <div className={g.row}>
          <label className={g.check}><input type="checkbox" defaultChecked /> Đã hoàn thành</label>
          <label className={g.check}><input type="checkbox" /> Unchecked</label>
          <label className={g.check}><input type="checkbox" disabled /> Disabled</label>
          <label className={g.check}><input type="radio" name="r" defaultChecked /> Radio on</label>
          <label className={g.check}><input type="radio" name="r" /> Radio off</label>
        </div>
        <div className={g.row}>
          <label className={g.field}>
            <span>Range</span>
            <input type="range" defaultValue={60} />
          </label>
          <label className={g.field}>
            <span>Progress</span>
            <progress max={1} value={0.62} />
          </label>
        </div>
      </section>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>States</h2>
        <div className={g.stateGrid}>
          <div className={g.stateCell}>
            <EmptyState compact icon={iconToday} title="No tasks scheduled." body="Nothing is planned for this part of the day." />
          </div>
          <div className={g.stateCell}>
            <EmptyState compact icon={iconSearch} title="Không có kết quả." body="Thử một từ khoá ngắn hơn." />
          </div>
          <div className={g.stateCell}><SkeletonList rows={4} label="Loading tasks…" /></div>
          <div className={g.stateCell}><LoadingRow label="Đang tải kế hoạch…" /></div>
        </div>
      </section>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>Typography roles</h2>
        <p className={g.display}>Display 40 — Hôm nay</p>
        <p className={g.h1}>Page title 30 — Đường đến sự tập trung</p>
        <p className={g.h2}>Object title 23 — Deep work: Lifeweave</p>
        <p className={g.h3}>Section 18 — Kế hoạch tuần</p>
        <p className={g.body}>Body 14.5 — Buổi sáng dành cho việc khó nhất, khi tâm trí còn tỉnh táo.</p>
        <p className={g.meta}>Metadata 12.5 — Creative Expression · #deep-work</p>
        <p className={g.eyebrow}>Eyebrow 11 — Đánh giá tuần</p>
        <p className={g.numeric}>Numeric — 09:30–11:45 · 2h 15m · 1,284 · 97.5%</p>
        <p className={g.metric}>34</p>
        <p className={g.code}>const plan = &quot;tuần&quot;;</p>
        <p className={g.editorBody}>
          Editor body 17 — Deep work rewards uninterrupted hours. Những buổi chiều yên tĩnh, kế
          hoạch tuần, đánh giá, và thời gian thực tế đã ghi nhận. <em>Nghiêng.</em>
        </p>
      </section>

      <section className={g.section}>
        <h2 className={g.sectionTitle}>Icons — one stroke, one optical size</h2>
        <div className={g.row}>
          {[iconToday, iconSearch, iconFlag, iconMore, iconDismiss].map((d, i) => (
            <span key={i} className={g.iconCell}><Icon d={d} /></span>
          ))}
        </div>
      </section>
    </div>
  );
}
