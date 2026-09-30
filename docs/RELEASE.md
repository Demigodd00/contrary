# Release and review gate

## Completed locally

- Dedicated local and public GitHub repository with contract, frontend, tests, docs and evidence paths.
- Pinned GenVM runner and `genvm-lint check` success.
- Direct state and accounting tests, including forged-verdict rejection and four rejected attempts that leave the claim open.
- Frontend unit tests and TypeScript/Vite production build.

## Live StudioNet acceptance

- Exact v0.2.0 contract deployed on chain 61999; finalized-success deployment, source-hash readback, ABI and `get_config` verified. See [`deployments/contrary_studionet.json`](../deployments/contrary_studionet.json).
- Public fixture pinned to commit `e88ec082d060a441f1b01599ad65f5f2ec2f8cb2`. Live claim `CT-V2-EMPTY-001` was created with 0.01 simulated GEN; another wallet staked 0.001 GEN.
- GenLayer validators returned `PROVEN` with the exact quote `if name == "":` followed by `return True`. A sponsor rebuttal caused a second independent assessment, also `PROVEN`. Both remain in the paginated on-chain record. Finalization credited 0.011 simulated GEN to the challenger. The withdrawal parent finalized successfully, and its separately triggered transfer finalized with `value_credited: true`; the recipient and amount matched the credit. See [`deployments/acceptance_studionet.json`](../deployments/acceptance_studionet.json).
- The prior v0.1.1 complete settlement and browser-read evidence remains in [`deployments/history/`](../deployments/history/), not as proof of the canonical v0.2.0 deployment.

## Honest remaining boundaries

- Rejected, inconclusive, unreviewed and expiry/refund branches have direct tests, not live multi-wallet acceptance records. Do not describe those as live-verified.
- Browser wallet signing was not independently exercised on the production URL; live writes used dedicated StudioNet test accounts through the documented operator script. A reviewer should connect their own StudioNet wallet for a full UI write check.
- This version assesses static claims about one complete source file. It does not execute code or verify cross-file/runtime behavior. Validator consensus and exact citations reduce but do not eliminate false assessments or prompt-injection risk. The protocol is experimental and unaudited.
- The three-attempt cap was removed to prevent finite-slot exhaustion. A Sybil actor can still submit sequential attempts and occupy review windows; the protocol does not establish unique human identity.
- This is simulated StudioNet GEN only. No real-money or production-network claim is made.
