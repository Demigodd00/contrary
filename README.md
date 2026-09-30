# Contrary

Contrary is a GenLayer StudioNet application for challenging claims about public source code. A sponsor freezes a precise claim, scope, exclusions, one GitHub source file at a full commit, a deadline, and a fixed reward in simulated GEN. A challenger submits a concrete input, promised result, alleged contrary result, and argument with a ten percent stake. GenLayer validators independently assess whether the frozen source supports the counterexample. The contract derives the verdict and applies fixed credits; neither the model nor the sponsor chooses payout amounts or recipients.

The first release covers claims whose behavior can be inferred from **one complete source file**. It does not execute code, authenticate runtime logs, verify imports or other files, or establish a universal absence of bugs. Inconclusive and unreviewed attempts return the challenge stake. StudioNet GEN has no monetary value. This is an experimental application, not an audited or real-money service.

## Status

Contrary is hosted at [contrary-inky.vercel.app](https://contrary-inky.vercel.app/) and has its own [public repository](https://github.com/Demigodd00/contrary). The canonical StudioNet contract is [`0xce7F96AFFCC1edA8dCAa57D5fB14fD658C96Ca64`](https://explorer-studio.genlayer.com/address/0xce7F96AFFCC1edA8dCAa57D5fB14fD658C96Ca64). A two-wallet v0.2.0 flow covered claim creation, challenge, validator review, sponsor rebuttal, finalization and a credited withdrawal transfer. The [release checklist](docs/RELEASE.md) distinguishes this live proof from paths exercised only in direct tests. The v0.1.1 evidence remains in `deployments/history/` and is not presented as v0.2.0 proof. The frontend blocks wallet actions unless `/deployment.json` identifies the verified contract and its deployed source matches.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
genvm-lint check contracts/contrary.py --json
python -m pytest tests/direct -q
```

The contract pins a concrete GenVM runner. The browser uses the canonical StudioNet chain (61999) and requires an exact deployed-source SHA-256 match before a wallet write. It stores a pending hash before another submission can be made. Contract credit and outbound transfer are separate; a finalized credit is not proof that the eventual withdrawal transfer arrived.

## Contract flow

1. Sponsor creates a claim with 0.01–1 simulated GEN. Validators fetch the public GitHub repository, full commit, and complete UTF-8 source file (up to 12 KB); the snapshot is stored in the contract.
2. Another wallet submits a concrete counterexample with a stake of exactly ten percent of the reward. One attempt is active at a time. Rejected or inconclusive attempts do not consume a fixed claim-wide slot; further attempts remain possible until the deadline.
3. Anyone requests review. Leader and validators independently assess scope and proof from the **same frozen source** and compare the decision fields. A proven result requires an exact source quote.
4. Sponsor or challenger may use one rebuttal per attempt within ten minutes. Both initial and rebuttal assessments remain in the public record. Anyone finalizes after the window.
5. Proven: challenger receives reward plus stake. Rejected: sponsor receives the stake and the claim can accept another attempt. Inconclusive: challenger recovers the stake. Expiry returns the reward to the sponsor. Credit holders withdraw separately.

If an attempt cannot be reviewed within 24 hours, anyone can mark it unreviewed and return the stake. An active reviewed attempt must be finalized before the sponsor can close the claim. Every attempt remains available through paginated public reads. Stake requirements do not establish unique human identity; a Sybil attacker can still occupy sequential review windows before the deadline.

## Repository contents

- `contracts/contrary.py`: Intelligent Contract and validator comparison.
- `src/`: public Vite/React interface and wallet client.
- `tests/direct/`: deterministic state, accounting, evidence and independent-validator checks. Direct mode does not prove live network consensus.
- `examples/validator.py`: bounded public fixture used in the StudioNet acceptance flow.
- `docs/ARCHITECTURE.md`: trust and settlement boundaries.
- `docs/RELEASE.md`: deployment, live verification, and submission gates.
- `docs/REVIEW.md`: exact public reviewer path and reproducibility boundaries.
- `deployments/`: deployment identities and live acceptance records after verification.

No browser wallet private keys or API tokens belong in this repository.
