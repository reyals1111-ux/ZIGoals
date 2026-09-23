#!/usr/bin/env python3
"""Validate a Run #10 requirement inventory, not implementation correctness.

Standard-library only. The initial seed should pass structural/coverage checks
while reporting every item NOT_STARTED. --require-completion is deliberately
strict: all entries, including conditional ones, must then be VERIFIED.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

STATUSES = {
    "NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED_UNVERIFIED", "VERIFIED",
    "BLOCKED_EXTERNAL", "BLOCKED_SAFETY", "DEFERRED_BOUNDED",
    "NOT_APPLICABLE_WITH_EVIDENCE",
}
DISPOSITION_STATUSES = {
    "BLOCKED_EXTERNAL", "BLOCKED_SAFETY", "DEFERRED_BOUNDED",
    "NOT_APPLICABLE_WITH_EVIDENCE",
}
ID_RE = re.compile(r"^[A-Z]+-\d{2,}$")
PROMPT_ID_RE = re.compile(r"^\*\*([A-Z]+-\d{2}) — ", re.MULTILINE)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAX_BYTES = 25 * 1024 * 1024


def read_bounded(path: Path) -> str:
    if not path.is_file():
        raise ValueError(f"Not a file: {path}")
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f"File exceeds {MAX_BYTES} byte safety bound: {path.name}")
    return path.read_text(encoding="utf-8")


def inspect_ledger(
    data: Any,
    prompt_text: str | None = None,
    *,
    require_completion: bool = False,
    evidence_root: Path | None = None,
    final_report: str | None = None,
) -> tuple[list[str], dict[str, Any]]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["Ledger must be a JSON object."], {}
    rows = data.get("requirements")
    if not isinstance(rows, list) or not rows:
        return ["requirements must be a nonempty list."], {}
    seen: dict[str, dict[str, Any]] = {}
    counts: Counter[str] = Counter()
    root = evidence_root.resolve() if evidence_root else None

    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"Entry {index}: expected object.")
            continue
        rid = row.get("id")
        if not isinstance(rid, str) or not ID_RE.fullmatch(rid):
            errors.append(f"Entry {index}: invalid requirement ID.")
            continue
        if rid in seen:
            errors.append(f"Duplicate ID: {rid}")
            continue
        seen[rid] = row
        if not isinstance(row.get("title"), str) or not row["title"].strip():
            errors.append(f"{rid}: missing title.")
        if not isinstance(row.get("specification"), str) or not row["specification"].strip():
            errors.append(f"{rid}: missing original specification.")
        status = row.get("status")
        if status not in STATUSES:
            errors.append(f"{rid}: invalid status.")
            continue
        counts[status] += 1
        if status != "VERIFIED":
            disposition = row.get("disposition")
            if not isinstance(disposition, dict) or not disposition.get("reason") or not disposition.get("next_step") or not disposition.get("cause_category"):
                errors.append(f"{rid}: incomplete item needs reason, cause_category and exact next_step.")
            if row.get("final_report_section") != "9. Skipped/blocked items":
                errors.append(f"{rid}: incomplete item needs final-report inclusion mapping.")
            if final_report is not None and not re.search(r"(?<![A-Z0-9-])" + re.escape(rid) + r"(?![A-Z0-9-])", final_report):
                errors.append(f"{rid}: incomplete item absent from final report.")
        if root is not None:
            for ev in row.get("evidence", []) if isinstance(row.get("evidence"), list) else []:
                if isinstance(ev, dict) and isinstance(ev.get("path"), str):
                    candidate = (root / ev["path"]).resolve()
                    if not candidate.is_relative_to(root) or not candidate.exists():
                        errors.append(f"{rid}: nonexistent or out-of-scope evidence path.")
        dependencies = row.get("dependencies")
        if not isinstance(dependencies, list) or not all(isinstance(d, str) for d in dependencies):
            errors.append(f"{rid}: dependencies must be a list of IDs.")
        elif len(dependencies) != len(set(dependencies)):
            errors.append(f"{rid}: duplicate dependency IDs.")
        evidence = row.get("evidence")
        if not isinstance(evidence, list):
            errors.append(f"{rid}: evidence must be a list.")
            evidence = []
        if status == "VERIFIED":
            if row.get("scope_classification_confirmed") is not True:
                errors.append(f"{rid}: VERIFIED without confirmed scope classification.")
            if not isinstance(row.get("delivery_class"), str) or not row["delivery_class"].strip():
                errors.append(f"{rid}: VERIFIED without a delivery class.")
            acceptance = row.get("acceptance_criteria")
            if not isinstance(acceptance, list) or not acceptance:
                errors.append(f"{rid}: VERIFIED without acceptance criteria.")
            if not isinstance(row.get("verified_commit"), str) or not SHA_RE.fullmatch(row["verified_commit"]):
                errors.append(f"{rid}: VERIFIED without a full source SHA.")
            if not evidence:
                errors.append(f"{rid}: VERIFIED without evidence.")
            for ev_index, ev in enumerate(evidence):
                if not isinstance(ev, dict):
                    errors.append(f"{rid}: evidence {ev_index} is not an object.")
                    continue
                if not ev.get("kind") or not ev.get("result"):
                    errors.append(f"{rid}: evidence {ev_index} needs kind and result.")
                if not any(isinstance(ev.get(k), str) and ev[k].strip() for k in ("path", "uri", "command")):
                    errors.append(f"{rid}: evidence {ev_index} needs a path, URI or command.")
                if ev.get("result") in {"FAIL", "FAILED", "NOT_RUN", "PENDING", "BLOCKED"}:
                    errors.append(f"{rid}: VERIFIED entry includes unsuccessful evidence.")
                if root is not None and isinstance(ev.get("path"), str):
                    candidate = (root / ev["path"]).resolve()
                    try:
                        candidate.relative_to(root)
                    except ValueError:
                        errors.append(f"{rid}: evidence path escapes the supplied evidence root.")
                    else:
                        if not candidate.exists():
                            errors.append(f"{rid}: evidence path does not exist under the supplied root.")
        elif status in DISPOSITION_STATUSES:
            disposition = row.get("disposition")
            if not isinstance(disposition, dict) or not disposition.get("reason") or not disposition.get("next_step"):
                errors.append(f"{rid}: blocked/deferred/not-applicable item needs reason and next_step.")
            if not evidence and not (isinstance(disposition, dict) and disposition.get("evidence")):
                errors.append(f"{rid}: disposition needs supporting evidence.")
        if row.get("released") is True and status != "VERIFIED":
            errors.append(f"{rid}: released=true without VERIFIED status.")
        if require_completion and status != "VERIFIED":
            errors.append(f"{rid}: strict completion check requires VERIFIED, currently {status}.")

    for rid, row in seen.items():
        dependencies = row.get("dependencies")
        if not isinstance(dependencies, list):
            continue
        for dep in dependencies:
            if not isinstance(dep, str):
                continue
            if dep == rid:
                errors.append(f"{rid}: cannot depend on itself.")
            elif dep not in seen:
                errors.append(f"{rid}: unknown dependency {dep}.")
            elif row.get("status") == "VERIFIED" and seen[dep].get("status") != "VERIFIED":
                errors.append(f"{rid}: VERIFIED while dependency {dep} is not VERIFIED.")

    # Find dependency cycles so they cannot make completion impossible silently.
    color: dict[str, int] = {}
    def visit(rid: str) -> None:
        if color.get(rid) == 1:
            errors.append(f"Dependency cycle includes {rid}.")
            return
        if color.get(rid) == 2:
            return
        color[rid] = 1
        deps = seen[rid].get("dependencies", [])
        if isinstance(deps, list):
            for dep in deps:
                if isinstance(dep, str) and dep in seen and dep != rid:
                    visit(dep)
        color[rid] = 2
    for rid in seen:
        visit(rid)

    expected: set[str] = set()
    if prompt_text is not None:
        prompt_ids = PROMPT_ID_RE.findall(prompt_text)
        if len(prompt_ids) != len(set(prompt_ids)):
            errors.append("Master prompt itself contains duplicate requirement IDs.")
        expected = set(prompt_ids)
        if not expected:
            errors.append("No expected IDs were found in the supplied master prompt.")
        for rid in sorted(expected - set(seen)):
            errors.append(f"Missing original requirement: {rid}")
        expected_sha = data.get("source_prompt_sha256")
        actual_sha = hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()
        if expected_sha and expected_sha != actual_sha:
            errors.append("Ledger source_prompt_sha256 does not match supplied master prompt.")
    summary = {
        "entries": len(rows),
        "unique_ids": len(seen),
        "original_prompt_ids": len(expected) if prompt_text is not None else None,
        "additional_ids": sorted(set(seen) - expected) if prompt_text is not None else [],
        "status_counts": dict(sorted(counts.items())),
        "workstream_counts": dict(sorted(Counter(r.get("workstream", "UNCLASSIFIED") for r in rows if isinstance(r, dict)).items())),
        "delivery_class_counts": dict(sorted(Counter(r.get("delivery_class", "UNCLASSIFIED") for r in rows if isinstance(r, dict)).items())),
        "strict_completion_requested": require_completion,
        "note": "Structural/coverage validity is not proof of implementation, testing, release or safety.",
    }
    return errors, summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path)
    parser.add_argument("--prompt", type=Path)
    parser.add_argument("--require-completion", action="store_true")
    parser.add_argument("--evidence-root", type=Path)
    parser.add_argument("--final-report", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(read_bounded(args.ledger))
        prompt_text = read_bounded(args.prompt) if args.prompt else None
        errors, summary = inspect_ledger(data, prompt_text, require_completion=args.require_completion, evidence_root=args.evidence_root, final_report=read_bounded(args.final_report) if args.final_report else None)
    except (OSError, UnicodeError, ValueError, RecursionError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(summary, indent=2))
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("PASS: inventory structure and requested coverage checks. Not an implementation-completion certificate.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
