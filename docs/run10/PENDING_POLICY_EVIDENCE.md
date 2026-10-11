# Queued upload policy checkpoint

The sync journal now tags newly validated writes with retention policy2. Pending operations lacking this tag or declaring a newer policy are refused before any transport write; their encrypted payload and journal remain intact. This closes automatic mixed-build replay around the financial-retention boundary. It does not provide a recovery UI for older pending work.

Regression run first failed both older/future-policy cases because they replayed. Focused corrected run:16tests passed across cloud-sync and final-safety-review. Current-policy lost-acknowledgement replay still passes. Logs: /private/tmp/run10-pending-policy-red.log and /private/tmp/run10-pending-policy-green.log. Full application/build/browser evidence from previous source is not re-certified by this focused run.

Required continuation: older queued work needs explicit export/review/reconciliation without clearing unacknowledged operations. Newer readers remain fail-closed. No live service or owner data used.
