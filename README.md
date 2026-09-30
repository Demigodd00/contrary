# Contrary

Contrary is a GenLayer StudioNet application for challenging claims about public source code. A sponsor freezes a precise claim, scope, exclusions, one GitHub source file at a full commit, a deadline, and a fixed reward in simulated GEN. A challenger submits a concrete input, promised result, alleged contrary result, and argument with a ten percent stake. GenLayer validators independently assess whether the frozen source supports the counterexample. The contract derives the verdict and applies fixed credits; neither the model nor the sponsor chooses payout amounts or recipients.

The first release covers claims whose behavior can be inferred from **one complete source file**. It does not execute code, authenticate runtime logs, verify imports or other files, or establish a universal absence of bugs. Inconclusive and unreviewed attempts return the challenge stake. StudioNet GEN has no monetary value. This is an experimental application, not an audited or real-money service.

## Status

Contract and app source are implemented in this dedicated [public repository](https://github.com/Demigodd00/contrary). Direct tests and the frontend build pass. StudioNet deployment, live validator acceptance, and a hosted release are tracked separately in [the release checklist](docs/RELEASE.md). The frontend disables wallet actions until `/deployment.json` identifies a verified contract. Do not treat the local test fixtures as live GenLayer evidence.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
genvm-lint check contracts/contrary.py --json
python -m pytest tests/direct -q
```

The contract pins a concrete GenVM runner. The browser uses the canonical StudioNet chain (61999) and requires an exact deployed-source SHA-256 match before a wallet write. It stores a pending hash before another submission can be made. Contract credit and outbound transfer are separate; a finalized credit is not proof that the eventual withdrawal transfer arrived.

## Contract flow

1. Sponsor creates a claim with 0.01–1 simulated GEN. Validators fetch the public GitHub repository, full commit, and complete UTF-8 source file (up to 12 KB); the snapshot is stored in the contract.
2. Another wallet submits a concrete counterexample with a stake of exactly ten percent of the reward. A claim accepts up to three sequential attempts before its deadline.
3. Anyone requests review. Leader and validators independently assess scope and proof from the **same frozen source** and compare the decision fields. A proven result requires an exact source quote.
4. Sponsor or challenger may use one rebuttal per attempt within ten minutes. Both initial and rebuttal assessments remain in the public record. Anyone finalizes after the window.
5. Proven: challenger receives reward plus stake. Rejected: sponsor receives the stake and the claim can accept another attempt. Inconclusive: challenger recovers the stake. Expiry or three unsuccessful attempts return the reward to the sponsor. Credit holders withdraw separately.

If an attempt cannot be reviewed within 24 hours, anyone can mark it unreviewed and return the stake. An active reviewed attempt must be finalized before the sponsor can close the claim.

## Repository contents

- `contracts/contrary.py`: Intelligent Contract and validator comparison.
- `src/`: public Vite/React interface and wallet client.
- `tests/direct/`: deterministic state, accounting, evidence and independent-validator checks. Direct mode does not prove live network consensus.
- `examples/validator.py`: bounded public fixture for a future StudioNet review.
- `docs/ARCHITECTURE.md`: trust and settlement boundaries.
- `docs/RELEASE.md`: deployment, live verification, and submission gates.
- `deployments/`: deployment identities and live acceptance records after verification.

No browser wallet private keys or API tokens belong in this repository.
