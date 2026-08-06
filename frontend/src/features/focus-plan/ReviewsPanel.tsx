import { useEffect, useRef, useState } from "react";

import { createFocusPlanReview, listFocusPlanReviews } from "../../ipc/commands";
import type { FocusPlanReviewHistoryView } from "../../ipc/generated/FocusPlanReviewHistoryView";
import * as styles from "./FocusPlansScreen.css";

function messageFrom(cause: unknown): string {
  if (cause && typeof cause === "object" && "message" in cause) {
    const message = (cause as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "The review could not be saved.";
}

/**
 * Create-and-read manual review history. Creating a review never mutates the Plan, so this
 * panel deliberately does not go through the Plan mutation/revision path.
 */
export function ReviewsPanel({
  planId,
  anchorLocalDate,
  disabled,
}: {
  planId: string;
  anchorLocalDate: string;
  disabled?: boolean;
}) {
  const [history, setHistory] = useState<FocusPlanReviewHistoryView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewedDate, setReviewedDate] = useState(anchorLocalDate);
  const [reflection, setReflection] = useState("");
  const [nextFocus, setNextFocus] = useState("");
  const reflectionRef = useRef<HTMLTextAreaElement>(null);
  const refocusAfterSave = useRef(false);

  // The form fieldset is disabled while a save is pending, so focus can only return to the
  // reflection field once that render has committed.
  useEffect(() => {
    if (pending || !refocusAfterSave.current) return;
    refocusAfterSave.current = false;
    reflectionRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    listFocusPlanReviews({ plan_id: planId, limit: null })
      .then((value) => {
        if (cancelled) return;
        setHistory(value);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  useEffect(() => {
    setReviewedDate(anchorLocalDate);
  }, [anchorLocalDate, planId]);

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await createFocusPlanReview({
        plan_id: planId,
        operation_id: globalThis.crypto.randomUUID(),
        reviewed_local_date: reviewedDate,
        reflection,
        next_focus: nextFocus.trim() ? nextFocus : null,
      });
      setHistory(await listFocusPlanReviews({ plan_id: planId, limit: null }));
      // Only clear the draft once the review is committed.
      setReflection("");
      setNextFocus("");
      refocusAfterSave.current = true;
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="reviews-heading">
      <h3 id="reviews-heading">Reviews</h3>
      {history && (
        <p className={styles.muted}>
          {history.review_count} {history.review_count === 1 ? "review" : "reviews"}
          {history.latest_reviewed_local_date ? (
            <>
              {" · latest "}
              <time dateTime={history.latest_reviewed_local_date}>
                {history.latest_reviewed_local_date}
              </time>
            </>
          ) : null}
          .
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset className={styles.fieldset} disabled={pending || disabled}>
          <legend>Add a review</legend>
          <label>
            Review date
            <input
              className={styles.input}
              type="date"
              value={reviewedDate}
              onChange={(event) => setReviewedDate(event.target.value)}
            />
          </label>
          <label>
            Reflection
            <textarea
              ref={reflectionRef}
              className={styles.textarea}
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
            />
          </label>
          <label>
            Next focus (optional)
            <textarea
              className={styles.textarea}
              value={nextFocus}
              onChange={(event) => setNextFocus(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!reflection.trim() || pending || disabled}
            >
              {pending ? "Saving review…" : "Save review"}
            </button>
          </div>
        </fieldset>
      </form>
      {status === "loading" && (
        <p role="status" aria-live="polite">
          Loading reviews…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className={styles.error}>
          Reviews could not be loaded.
        </p>
      )}
      {status === "ready" && history && history.reviews.length === 0 && (
        <p className={styles.muted}>No reviews recorded yet.</p>
      )}
      {status === "ready" && history && history.reviews.length > 0 && (
        <ol className={styles.planList} aria-label="Review history">
          {history.reviews.map((review) => (
            <li key={review.id}>
              <article aria-labelledby={`review-${review.id}`}>
                <h4 id={`review-${review.id}`} className={styles.muted}>
                  <time dateTime={review.reviewed_local_date}>
                    {review.reviewed_local_date}
                  </time>
                </h4>
                <p>{review.reflection}</p>
                {review.next_focus && <p>Next focus: {review.next_focus}</p>}
              </article>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.srOnly} aria-live="polite">
        {pending ? "Saving review." : ""}
      </p>
    </section>
  );
}
