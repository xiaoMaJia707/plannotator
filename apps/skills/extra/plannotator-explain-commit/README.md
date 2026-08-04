# plannotator-explain-commit

A Plannotator custom review skill that annotates a commit's diff with
**what / why / assumptions** explanations, to accelerate human code review.

Unlike the default bug-hunter review, this skill produces **informational
annotations** grounded in the commit message and the surrounding code. Every
annotation includes:

- **What** — a factual description of the code change
- **Why** — the motivation (cited from the commit message or adjacent code;
  never fabricated)
- **Assumptions** — the implicit invariants the new code relies on

## Install

This skill lives in `apps/skills/extra/` and is **not** default-installed.
Add it to your global skill root:

```bash
# From a checkout of the plannotator repo:
npx skills add ./apps/skills/extra/plannotator-explain-commit --global

# Or from GitHub:
npx skills add backnotprop/plannotator/apps/skills/extra/plannotator-explain-commit --global
```

Then enable it as a review profile via the Plannotator review UI:
**Settings → AI Reviews → Add a review → plannotator-explain-commit**.

Or write directly to `~/.plannotator/review-skills.json`:

```json
{
  "version": 1,
  "enabled": ["plannotator-explain-commit"]
}
```

## Usage

1. Open a code review (`/plannotator-review` in Pi, or the equivalent slash
   command in your agent).
2. Switch the sidebar to the **Commits** view (panel view toggle).
3. Click the **Explain** icon on any commit row. The Plannotator UI:
   - Switches the diff to that commit vs its first parent.
   - Launches this skill as an agent job against that diff.
4. Each explanation appears as an inline annotation on the code, tagged
   with the skill label. Multiple commits can be explained in the same
   session — the annotations coexist.

## What gets sent back to the coding agent

**Nothing from this skill.** When you click **Send Feedback**, only
user-authored annotations (the ones you wrote yourself) are shipped to the
agent. AI-generated explanations from this skill are kept local to the
review UI. They are visible to you, not to the agent.

This is deliberate — the whole point is to help the reviewer read, not to
put AI paraphrase into the agent's own turn context.

## Model output contract

This skill uses Plannotator's standard marker-delimited JSON output format
(see the SKILL.md body for the full contract). Findings use
`severity: "nit"` as an informational marker; the annotation's
`reviewProfileLabel` tag ("plannotator-explain-commit") distinguishes them
visually from bug-hunter findings.

## When NOT to use

- **Bug hunting** → use the default review or a bug-hunter custom review.
- **A large multi-commit range** → run once per commit; results are cleaner
  one at a time.
- **Mechanical commits** (formatter, codemod, mass rename) — this skill will
  produce a low-value annotation or nothing.
