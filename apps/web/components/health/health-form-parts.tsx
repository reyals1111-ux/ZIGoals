import type { FormEvent, ReactNode } from "react";
import { FeedbackSlot } from "./health-field";
import { INVISIBLE_NAME, visibleName } from "../../lib/visible-text";
import type { HealthData } from "../../lib/health";

/**
 * Session AW Part 2 (speed, attempt 2): the Health journal's form pieces, shared by the page (components/health/health-app.tsx)
 * and its Activity view, which loads as its own chunk (components/health/activity-view.tsx). Moved here unchanged.
 */
export type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export function FormBox({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  // Session AL fourth pass: the page checks each field first (data-health-check), in the app's words, not the browser's
  // bubble (noValidate), and the page's feedback line shows at the end of this form after its submit.
  return <form aria-label={title} className="health-form" onSubmit={onSubmit} noValidate data-health-check="">{children}<FeedbackSlot title={title} /></form>;
}
export const formString = (form: FormData, key: string) => String(form.get(key) ?? "");
/** Session AL (P-MO-44, MO-104): a name of only spaces is refused at its field like an invisible one (it reached the store
 *  and came back as "Could not save… available browser storage"). */
export const healthName = (value: string) => { if (!value.trim()) throw new Error(INVISIBLE_NAME); return visibleName(value); };
