# Contrary milestone — Versioned Counterexample Ledger

Status: v1.2 is implemented locally and **not yet submitted**. The accepted v0.2 site and contract remain unchanged. The v1.0 and v1.1 StudioNet pilots were abandoned; see the factual records in [`deployments/history`](../deployments/history). In particular, v1.1's LLM-based revision check reached validator disagreement and then incorrectly marked a repaired empty-string case as still broken. Do not cite that pilot as a successful milestone. Its separate preview is access-protected until a corrected release passes live checks.

## What is new

The original app asks GenLayer validators to assess a counterexample against a frozen public GitHub source snapshot. v1.2 first prepares a claim without GEN, then funds that frozen claim in a separate payable call. Invalid funding or challenge value is recorded as withdrawable credit. A finalized `PROVEN` counterexample can become a witness in a versioned ledger. The sponsor may attach up to four proven claims that have exactly the same sponsor, repository identity, file, base commit, statement, scope, exclusions, and source hash. The first proposed revision seals the witness set. Every revision must be a direct-child Git commit of the selected baseline or finalized parent, in the same public repository and file; validators independently retrieve and strictly agree on GitHub metadata and complete UTF-8 source bytes.

The live v1.1 pilot demonstrated that a free-form model can misread even `name != ""` for an empty name. v1.2 therefore does **not** let an LLM vote on revision outcomes. Each GenVM validator deterministically interprets a narrowly whitelisted, side-effect-free Python subset from the *frozen* source: one top-level function, up to four literal arguments, boolean returns, `if`, `==`, `!=`, boolean `and`/`or`/`not`, and literals. It checks the same input on the base and revised files. A `CLEARED` result requires the base to evaluate to the frozen contrary result and the revision to evaluate to the frozen expected result. `STILL_BREAKS` means both evaluate to the contrary result. Anything outside the subset—including imports, function calls, assignments, dynamic values, ambiguous syntax, or a mismatch with the original alleged result—is `UNCLEAR`. An exact return-line quote is derived from the frozen revised source, never model-authored. Every validator reaches the same result from agreed bytes or the transaction does not commit.

Each witness must be checked. If every witness is `CLEARED`, the revision becomes `KNOWN_CASES_CLEARED`; otherwise it is `BLOCKED`. Unchecked witnesses become `UNCLEAR` after 24 hours. Prior revisions and assessments remain readable, and a sibling branch inherits no clearance. Ledger operations transfer no GEN. The original AI-adjudicated claim, bounty settlement, and separate withdrawal remain part of this new contract instance, but model output never sets payout amounts or recipients.

## Assurance boundary

`KNOWN_CASES_CLEARED` means only that all previously proven frozen inputs in this ledger evaluate to the expected boolean under the restricted interpreter for that *specific* revision. It does not establish a universal fix, general Python execution, correct imports, absence of other defects, or a security audit. Unsupported code fails closed as `UNCLEAR`. Original claim adjudication still uses an LLM and remains subject to semantic errors despite source quotes and consensus. The v1.2 contract starts with fresh storage; it cannot import v0.2 or v1.1 claims.

## Local and live gates

- Local direct-mode tests cover partial and full fixes, sibling branches, prompt-injection comments, unsupported syntax, wrong Git parent, replay, timeout, and value accounting. These mocked tests are not live GenVM proof.
- Verify the current v1.2 deployment source hash, pinned runner, ABI, chain 61999, on-chain config, and `preview_pure_case` against the three public fixture commits before funding claims.
- On StudioNet, prove two frozen inputs with two disposable wallets; finalize both after the 10-minute rebuttal window. Show the partial child as `CLEARED`/`STILL_BREAKS` and `BLOCKED`, then the complete child as `CLEARED`/`CLEARED` and `KNOWN_CASES_CLEARED`. Record actual transaction consensus results and on-chain readbacks, not leader receipts alone.
- Test invalid payable input and its successful credited withdrawal, a real browser-wallet signature on the separate milestone site, and anonymous public read access. Keep the accepted v0.2 site intact.
- Confirm the exact last rewarded Project/Milestone commit from the Portal and supply a GitHub comparison from it to the release SHA. Local history alone is not proof of that baseline. Add final reviewer instructions and evidence links only after all live checks pass.

No Portal milestone submission should be made before those gates are met.
