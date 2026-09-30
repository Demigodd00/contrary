# Contrary architecture

## Decision boundary

Sponsor: fixes the claim, scope, exclusions, source location, reward and deadline. Challenger: supplies one concrete input and argument, staking ten percent. GitHub: serves repository identity, immutable commit identity and source bytes. GenLayer validators: independently assess whether that exact source and the frozen terms establish a contradiction. Contract code: enforces eligibility, time windows, reward split, credits and withdrawal. Attempts are separate paginated storage entries; the claim holds only a count and current active index.

The creation transaction retrieves the source from a full Git commit and stores both its bytes and SHA-256. Adjudication uses the stored source so later GitHub outages, branch rewrites or repository removal cannot alter the evidence under review. A file above 12 KB, non-UTF-8 source, private repository or unstable source fetch fails creation. The sponsor must select a self-contained file; unobserved imports and runtime environment make a claim inconclusive.

The assessment returns `scope` (IN/OUT/UNCLEAR), `proof` (PROVEN/DISPROVEN/UNCLEAR), an exact quote, and reasoning. A deterministic function derives PROVEN, REJECTED or INCONCLUSIVE. Validators independently rerun the task and compare scope, proof and outcome. An answer with a quote absent from the frozen source is rejected before consensus. The quote check alone is insufficient; the independent assessment provides the substantive check. The protocol can still produce a wrong consensual judgment, particularly for subtle code semantics; claims must stay narrow and testable.

The 600-second application rebuttal window is separate from GenLayer transaction finality. The rebuttal passes an argument about the same evidence; it cannot replace the source, claim or submitted input. Both assessments are retained. Source comments and all user text are treated as untrusted data in the prompt. No privileged admin can override the verdict.

## Settlement

All amounts use integer atto-GEN. Reward and stake remain locked until the contract credits accounts. Credits are consumed once by `withdraw`, which emits an EVM transfer on finalization. The web app reports transaction finality and reads contract accounting; it does not label a submitted or accepted hash as a successful execution. External transfer delivery still requires a separate receipt check in live acceptance.

An invalid attempt cannot permanently close a claim because the sponsor reward remains locked and another attempt may be submitted until the deadline. This removes the earlier three-slot Sybil exhaustion path. Only one attempt is active at a time. Expired and unreviewed branches return the appropriate balances. Public callers, not a scheduler, invoke review, finalization and recovery.

## Known constraints

- Static source reasoning only; no execution, CI attestation or external logs.
- One file, up to 12 KB, public GitHub repository, full commit SHA.
- Only one active attempt per claim. There is no fixed lifetime attempt cap, but sequential attempts can still occupy review windows; stakes and deadlines limit, rather than eliminate, Sybil denial of opportunity.
- GitHub or model availability can delay a transaction. Consensus disagreement can block an attempted review until retried or recovered.
- StudioNet value is simulated. Contract has not been audited. Do not use as real-money escrow.
