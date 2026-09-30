# Release and review gate

## Completed locally

- Dedicated local and public GitHub repository with contract, frontend, tests, docs and evidence paths.
- Pinned GenVM runner and `genvm-lint check` success.
- Direct state and accounting tests, including forged-verdict rejection.
- Frontend TypeScript/Vite production build.

## Required before a public submission

1. Push this repository, including the public source fixture, with no secrets.
2. Deploy the exact contract source to GenLayer StudioNet. Record full deployment transaction hash, execution result, address, chain ID, source hash, version and ABI.
3. Verify `get_config`, deployed source and read calls from an independent reader. Write the verified identity to `public/deployment.json` and a detailed record under `deployments/`.
4. Run a live two-wallet flow: create a bounded claim against `examples/validator.py` at the published commit, submit the empty-name counterexample, obtain a validator verdict, wait the rebuttal window, finalize, withdraw, and verify the outbound transfer receipt. Also test rejected, inconclusive and unreviewed/expiry paths as feasible, distinguishing live results from local tests.
5. Publish the frontend and verify anonymous access, mobile layout, wallet connection, every read/write path and exact production contract identity. Record the hosting URL and release commit.
6. Review steward-facing claims and evidence. Do not call the app complete or submission-ready before the live and public gates pass.
