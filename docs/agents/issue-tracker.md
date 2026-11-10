# Issue tracker: GitHub

Issues and specs live at https://github.com/VennieSo/Study-AIB-C01/issues.
Use the `gh` CLI, targeting `VennieSo/Study-AIB-C01`.

## Operations

- Create: `gh issue create --repo VennieSo/Study-AIB-C01 --title "..." --body-file <path>`
- Read: `gh issue view <number> --repo VennieSo/Study-AIB-C01 --json number,title,body,labels,comments`
- List: `gh issue list --repo VennieSo/Study-AIB-C01 --state open --json number,title,body,labels`
- Comment: `gh issue comment <number> --repo VennieSo/Study-AIB-C01 --body-file <path>`
- Label: `gh issue edit <number> --repo VennieSo/Study-AIB-C01 --add-label "<label>"`
- Remove label: use `--remove-label "<label>"` with the same edit command.
- Close: post the explanation as a comment, then run `gh issue close <number> --repo VennieSo/Study-AIB-C01`.

Use temporary UTF-8 files for multiline bodies.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the referenced issue.

## Relationships

Use GitHub sub-issues for parent-child relationships and native issue
dependencies for blockers when supported. Otherwise, add `Part of #<parent>`
and `Blocked by: #<number>, #<number>` near the top of the child body,
and link children from the parent.

A ticket is unblocked when all its blockers are closed.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, containing Notes,
  Decisions-so-far, and Fog.
- Children: linked issues labelled `wayfinder:<type>`, where type is
  research, prototype, grilling, or task.
- Frontier: open, unblocked, unassigned children; first in map order wins.
- Claim: assign the ticket to the driving developer before work.
- Resolve: comment with the answer, close the ticket, then append a
  gist and link to the map's Decisions-so-far.
