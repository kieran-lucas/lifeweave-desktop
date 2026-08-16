import type { Ref } from "react";

import type { LifeNodeView } from "../../ipc/generated/LifeNodeView";
import { Icon, iconLife, iconNote } from "../../design-system/visual/icons";
import { lifeIconGlyph } from "./lifeIconCatalog";
import {
  directionConfidenceOption,
  directionConfidenceOptions,
  directionConfidenceRank,
} from "./lifeDirectionConfidence";
import * as styles from "./LeafHeader.css";

/**
 * The Leaf object header.
 *
 * A centred identity block — semantic mark, name, optional secondary name — framed by the page's two
 * top corners: state on the left, the leaf's controls on the right. It is deliberately the only
 * system-drawn title on the page; the document below stays an ordinary Markdown document.
 *
 * State is read, never authored here. `direction_confidence` (ADR 0050) is the same level the Life
 * tree card shows, projected onto the browse projection, and every level is drawn — including the
 * `exploring` default — so the badge and the card always say the same thing about the same leaf.
 *
 * The right corner is an empty slot rather than markup of its own. The Reader owns the leaf's
 * commands, because only it knows whether a document exists and what may be done to it, so it
 * renders them into this slot instead of the header reaching into the document.
 */
export function LeafHeader({
  node,
  headingId,
  headingRef,
  commandSlotRef,
}: {
  node: LifeNodeView;
  headingId: string;
  headingRef?: Ref<HTMLHeadingElement>;
  commandSlotRef?: Ref<HTMLDivElement>;
}) {
  const glyph = lifeIconGlyph(node.icon_key);
  const subtitle = node.short_description.trim();
  const state = directionConfidenceOption(node.direction_confidence);
  const rank = directionConfidenceRank(state.value);

  return (
    <header className={styles.header} data-life-leaf-header="">
      <div className={styles.corners}>
        <p className={styles.state} data-level={state.value} title={state.description}>
          <span className={styles.stateMark} aria-hidden="true">
            {directionConfidenceOptions.map((option, index) => (
              <i className={styles.statePip} key={option.value} data-active={index <= rank ? "true" : "false"} />
            ))}
          </span>
          <span className={styles.srOnly}>Direction confidence: </span>
          <span className={styles.stateLabel}>
            <span className={styles.stateLabelText}>{state.label}</span>
          </span>
        </p>
        <div className={styles.commandSlot} ref={commandSlotRef} data-life-leaf-commands="" />
      </div>

      <div className={styles.identity}>
        <div className={styles.crest} aria-hidden="true">
          <span className={styles.crestRule} />
          <span className={styles.crestMark}>
            {glyph ?? <Icon d={node.is_leaf ? iconNote : iconLife} size={21} />}
          </span>
          <span className={styles.crestRule} />
        </div>

        <h1 id={headingId} className={styles.title} ref={headingRef} tabIndex={-1}>
          {node.title}
        </h1>

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}
