# Lane 2 registry: Tasks 2 and roadmap (`roadmap`, branch `lane2/roadmap`)

Builder's own file (team brief). Branched from `feature/session-av-2` at `1513829c` (lane2/tasks already merged there, so
the task comments are in this branch's base). Copy is plain English; the answers are English and Dutch.

## Feature 1 — photos and voice notes on a task (LEDGER #8, the part left by lane2/tasks) — built

- In a task's editor, under its Comments: "Photos and voice notes". "Add a photo" (shrunk on the device to at most 200 kB,
  the meal/receipt photo steps) and "Record a voice note" (a browser recording, MediaRecorder, at most a minute: "Stop and
  keep (0:12 of 1:00)" or "Cancel recording"). Each shows on the task (a thumbnail that opens the photo; an audio player
  for a voice note) with Remove (asks first; focus goes back to the opener or to "Add a photo"). At most 10 on a task,
  300 per scope. Kept on this device only as soon as they are added (not with Save), never uploaded, synced or sent.
- An attachment whose task is no longer in the list is marked when an editor opens and deleted 30 days later (Undo or a
  restore brings the task back first). No motion: the recording says its seconds in words.
- The empty state teaches ("Add a photo of a receipt, a part or a whiteboard, or record a short voice note").

Files: lib/tasks/attachments.ts (new), components/tasks/task-attachments.tsx (new, its own lazy chunk),
components/tasks/task-attachments.css (new), components/tasks/task-editor.tsx (one lazy import, one mount after Comments).
Tests: lib/tasks/av2-attachments.test.ts. Spec: tests/av2-task-attachments.spec.ts (the voice test is Chromium-only: its
stand-in microphone is a page-made tone, no permission prompt).

Stored (TIER 3 stored formats, new database only; no record changed): NEW IndexedDB `zigoals-task-attachments-v1`, store
`items`, key `<scope>:<attachmentId>` (scope = lib/health-aa/photos.ts `photoScope()`), value
`{taskId, kind: 'photo', blob, type: image/webp|image/jpeg, bytes ≤ 200000, at, orphanSince?}` or
`{taskId, kind: 'voice', blob, type: audio/webm|audio/mp4|audio/ogg, bytes ≤ 1500000, seconds ≤ 60, at, orphanSince?}`.
The tasks record is untouched (an older build ignores the database). Export → erase → restore: the files go out in Export
everything like the receipt photos (export only; no restore of photo files exists for any photo store today).

Lead, please register (I did not edit the shared registries):
- Erase everything: add `'zigoals-task-attachments-v1'` to `AK_DATABASES` (lib/ak-device-keys.ts) and the database list in
  lib/erase-everything.ts; the pinned list in lib/aa-device-keys.test.ts gains it after `'zigoals-money-photos-v1'`.
- Export everything (lib/export/make-everything.ts, beside `moneyPhotos`):
  `const taskFiles = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../tasks/attachments'), import('../tasks/schema'), import('../device-record')]).then(([a, t, sch, dr]) => t.exportTaskAttachmentEntries(a.photoScope(), new Map(dr.readDeviceRecord(storage, sch.TASKS).data.tasks.map(x => [x.id, x.title] as const)), now)).catch(() => []);`
  and add `...taskFiles` to `photos`.
- Leaving the Showcase (lib/showcase-storage.ts, beside the money photos):
  `import('./tasks/attachments').then(m=>m.deleteTaskAttachments(SHOWCASE_PHOTO_SCOPE)),`
- Data catalogue (lib/data-health/catalog.ts), area Today, device only, not synced: "Tasks: photos and voice notes on your tasks (files in this browser)".

Help (EN): Q "Can I add a photo or a voice note to a task?" A "Yes. Open the task and use Photos and voice notes: add a
photo, or record a voice note of up to a minute. They stay in this browser only, never uploaded or synced; Export
everything includes them as files and Erase everything removes them."
What's new: "Tasks: add photos and short voice notes to a task, kept on this device."
Showcase hook: none (the Showcase keeps no photos; it can take one, in its own scope, removed when the Showcase is left).
CSS touched: components/tasks/task-attachments.css (new; theme variables only). Nothing new on Today.
