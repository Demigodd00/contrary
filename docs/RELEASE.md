# Release and review gate

## Completed locally

- Dedicated local and public GitHub repository with contract, frontend, tests, docs and evidence paths.
- Pinned GenVM runner and `genvm-lint check` success.
- Direct state and accounting tests, including forged-verdict rejection.
- Frontend TypeScript/Vite production build.

## Live StudioNet acceptance

- Exact v0.1.1 contract deployed on chain 61999; finalized-success deployment, source-hash readback, ABI and `get_config` verified. See [`deployments/contrary_studionet.json`](../deployments/contrary_studionet.json).
- Public fixture pinned to commit `e88ec082d060a441f1b01599ad65f5f2ec2f8cb2`. Live claim `CT-LIVE-EMPTY-002` was created with 0.01 simulated GEN; another wallet staked 0.001 GEN and demonstrated that the empty-string branch returns `True`.
- GenLayer validators returned `PROVEN` with an exact source quote. A sponsor rebuttal caused a second independent assessment, also `PROVEN`. Both remain visible. After the window, finalization credited 0.011 GEN to the challenger. The withdrawal and its triggered transfer finalized; the transfer's `value_credited` was true. Full transaction hashes and state checks are in [`deployments/acceptance_studionet.json`](../deployments/acceptance_studionet.json).
- [Public app](https://contrary-inky.vercel.app/?claim=CT-LIVE-EMPTY-002) and `/deployment.json` returned HTTP 200 without sign-in. The claim, frozen source and both assessments loaded in an anonymous browser. Narrow-width layout was inspected. Frontend production build passed.

## Honest remaining boundaries

- Rejected, inconclusive, unreviewed and expiry/refund branches have direct tests, not live multi-wallet acceptance records. Do not describe those as live-verified.
- Browser wallet signing was not independently exercised on the production URL; the live writes used dedicated StudioNet test accounts through the documented operator script. A reviewer should connect their own StudioNet wallet for a full UI write check.
- This version assesses static claims about one complete source file. It does not execute code or verify cross-file/runtime behavior. Validator consensus and exact citations reduce but do not eliminate false assessments or prompt-injection risk. The protocol is experimental and unaudited.
- This is simulated StudioNet GEN only. No real-money or production-network claim is made.
