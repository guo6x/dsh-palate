# dsh-palate first-run demo

This is the shortest way to separate an installation problem from a model-provider problem. It has two deliberately different checks:

1. a keyless local host-chain check, and
2. a real DSH Web chat review using whichever provider you configured in Harness.

The first check never reads an API key and never makes a network or model call.

## 1. Run the keyless check

From a checkout of this repository, with Node 22 or newer:

```sh
pnpm install
pnpm demo
```

The command builds the committed host bundle, creates an isolated temporary `DSH_HOME`, and exercises the shipped plugin through the DSH host surface. A healthy run ends with lines like these:

```text
PASS plugin identifies itself as dsh-palate
PASS declares the host services it uses
PASS registers all thirteen tools
PASS registers the loopback /palate route
PASS seeds a useful first palate
PASS exposes two opt-in reference packs
PASS creates a tracked review with grounded evidence
PASS renders the review as a host tool message
PASS serves the same state to the Web panel

Keyless demo complete: host wiring, local SQLite, retrieval, and Web data are working.
```

This proves the installable bundle, tool registration, local database, retrieval, and panel data route. It does not prove that a remote provider credential is valid.

## 2. Verify the Web panel

Install the release into the Web profile and restart the running Web process:

```sh
dsh plugin --profile web add github:guo6x/dsh-palate
dsh web
```

Open a new chat and click the eye button at the bottom of the sidebar. On a fresh profile the panel should show:

| Signal | Expected first-run meaning |
| --- | --- |
| `本地品味库已就绪` | The panel can read the loopback palate routes. |
| `4` examples | Four transparent starter examples were seeded. |
| `12` principles | The starter rules are available for the first review. |
| Two reference packs | Apple and X packs are available but opt-in. |
| `首个成功体验` card | The panel has a copyable first review prompt. |

The starter records are created only in an empty local palate. Installing or upgrading the plugin does not overwrite an existing profile.

## 3. Run the real 60-second chat demo

The chat step uses the model selected in Harness, so configure a valid provider credential first. Then paste this prompt into a new chat:

> Call `palate_stats`, then use `palate_review` to critique “a dashboard with twelve equal KPI cards, one primary revenue metric, and a small trend chart”. Tell me which stored principles and examples you used, and return the `review_id`.

A successful response contains:

- a `review_id`;
- at least one concrete stored principle; and
- relevant good/bad starter evidence rather than an unrelated recent example.

The same review should appear in the eye panel after its next refresh. If the chat says authentication failed while the panel still shows the local counts, the plugin is installed and the remaining issue is the Harness provider credential.

## 4. See the learning loop

Only add feedback after you have actually judged the critique. For a safe local-first follow-up, ask the agent to:

1. add a bad dashboard example with `palate_add`;
2. review the same dashboard with `palate_review`; and
3. call `palate_feedback` only after you decide whether the recommendation helped.

The example count changes when `palate_add` runs. Principle effectiveness changes only after explicit feedback. For screenshot or URL training, inspect the source with a browser or vision capability first, then use `palate_intake`; its candidates remain pending until you explicitly accept or reject them with `palate_decide`.

## Failure matrix

| What you see | Interpretation | Next action |
| --- | --- | --- |
| No eye button | The Web host has not loaded the client bundle. | Confirm `dsh plugin --profile web list dsh-palate`, restart `dsh web`, then refresh. |
| Eye button + local counts, but chat auth error | Plugin and local storage are healthy; the selected model lacks a valid credential. | Fix the provider configuration in Harness and retry the chat prompt. |
| Panel says it cannot read local data | The loopback route is unavailable or the host is still restarting. | Restart `dsh web`, wait for it to be ready, and refresh once. |
| `pnpm demo` fails before the PASS lines | Checkout/build or Node environment issue. | Confirm Node ≥ 22, run `pnpm install`, and rerun the command. |

The demo intentionally does not ask for, print, or validate a secret. Keep provider credentials in the Harness profile rather than in this repository.
