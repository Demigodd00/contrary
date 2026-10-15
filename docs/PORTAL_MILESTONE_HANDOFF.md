# Contrary milestone v1.2 — Portal handoff

This is a **Milestone** on the accepted [Contrary by demigodd00](https://portal.genlayer.foundation/builders/explorer/contrary-by-demigodd00/) project, not a second Project submission. Select that parent entry. The accepted v0.2 website remains unchanged; the milestone uses its own StudioNet contract and website. Submit only after the browser-wallet gate in [`MILESTONE_1.md`](MILESTONE_1.md) is complete. The human owner submits to the Portal.

## Copy into the milestone form

- **Contribution date:** The actual date of this milestone submission or completed work; do not reuse the v0.2 contribution date.
- **Title:** Versioned Counterexample Ledger — frozen regression checks
- **Changes & Improvements** (under 1,000 characters):

> Contrary now turns finalized `PROVEN` counterexamples into a versioned repair obligation. The sponsor freezes two witnesses from the same pinned source and proposes direct-child Git revisions. GenLayer validators independently fetch and agree on complete commit-pinned source and GitHub parent metadata, then check each unchanged input with a restricted, deterministic Python interpreter. A partial fix cleared the fast case but still broke the slow case; its revision finalized `BLOCKED`. The next direct-child fix cleared both and finalized `KNOWN_CASES_CLEARED`. Both revisions, source hashes, exact return-line quotes and transactions are visible without a wallet. This new contract also separates claim preparation from GEN funding and records invalid payable value as withdrawable credit; a simulated-GEN withdrawal was verified live. Clearance applies only to the frozen inputs and supported Python subset, not arbitrary code or universal bug-freedom.

## Reviewer path

1. Open the [milestone website](https://contrary-milestone.vercel.app/?view=lineage&lineage=CL-M2-EMPTY-001). No wallet is needed. The ledger `CL-M2-EMPTY-001` shows two finalized `PROVEN` witnesses.
2. Inspect revision 1: `fast` is `CLEARED`, `slow` is `STILL_BREAKS`, and final status is `BLOCKED`. Its [finalization transaction](https://explorer-studio.genlayer.com/tx/0xd1505236dc30c71ed45a1953ca248e7cc71fa98bcee0339afcd0f0ecd853c87b) is finalized.
3. Inspect revision 2: both frozen inputs are `CLEARED` and final status is `KNOWN_CASES_CLEARED`. Its [finalization transaction](https://explorer-studio.genlayer.com/tx/0x45053fb6ec95c3b63c7672e6dd13d8ade5168284549e353fbbed14dd3fe84688) is finalized.
4. Compare the [accepted site's deployed Git base](https://github.com/Demigodd00/contrary/commit/ab68f62de1a5b8ba7a7aebf13f8098df843d99c4) with the [milestone branch](https://github.com/Demigodd00/contrary/compare/ab68f62de1a5b8ba7a7aebf13f8098df843d99c4...codex/contrary-regression-ledger). The accepted site's Vercel production deployment reports this exact base SHA. The Portal entry itself does not pin a rewarded SHA. The branch has **not** been merged to `main` because the accepted v0.2 Vercel project auto-deploys from `main`.

**Expected verification outcome:** The reviewer can reproduce the two different revision outcomes from immutable Git commits and finalized StudioNet state. The result is limited to the two frozen inputs. No real-value or security-audit claim is made.

## Evidence links

Use the parent project's existing GitHub repository entry. Add these milestone-specific links where the Portal permits optional evidence. If an auto-detected type is wrong, choose the closest truthful type or **Other**; do not label a comparison as a pull request.

1. [Exact GitHub comparison: accepted-site deployment → milestone branch](https://github.com/Demigodd00/contrary/compare/ab68f62de1a5b8ba7a7aebf13f8098df843d99c4...codex/contrary-regression-ledger)
2. [Milestone website / completed ledger](https://contrary-milestone.vercel.app/?view=lineage&lineage=CL-M2-EMPTY-001)
3. [Canonical v1.2 StudioNet contract](https://explorer-studio.genlayer.com/address/0x43Fac855E00DA2c749dCB48fEC514753B0a43fAa)
4. [Contract source pinned to deployed commit](https://github.com/Demigodd00/contrary/blob/3958800b1a8fc74d44527254d33be9a23db09525/contracts/contrary.py)
5. [Live proof manifest](https://github.com/Demigodd00/contrary/blob/codex/contrary-regression-ledger/deployments/contrary_milestone_v12_proof.json)
6. [Blocked partial revision transaction](https://explorer-studio.genlayer.com/tx/0xd1505236dc30c71ed45a1953ca248e7cc71fa98bcee0339afcd0f0ecd853c87b)
7. [Known-cases-cleared revision transaction](https://explorer-studio.genlayer.com/tx/0x45053fb6ec95c3b63c7672e6dd13d8ade5168284549e353fbbed14dd3fe84688)

The proof manifest also records the one `MAJORITY_DISAGREE` pilot review and its distinct successful retry. Do not describe the failed consensus transaction as a successful proof. `pnpm verify:milestone` rechecks the pinned source, receipts, and on-chain state read-only.
