# Git, worktree, and durable handoff

This experiment expects revision and churn. Reversible, focused commits are the durable recovery mechanism; detached commits, uncommitted worktrees, `refs/codex/turn-diffs/**`, temporary directories, previews, and chat attachments are not delivery locations.

## Before substantive edits

1. Record the checkout path, current branch or detached state, `git status --short`, and starting commit.
2. Preserve unrelated changes and identify any that overlap the task. Never sweep them into a task commit.
3. In the normal local checkout, start from local `main` and create a short-lived `codex/<task>` branch. Do not create another worktree merely for ordinary sequential isolation.
4. If Codex started the task in a managed or detached worktree, create the named task branch there before substantive edits, or at the earliest safe point if the environment initially prevents it.

User authorization to implement repository source, tests, documentation, or skills includes permission to make focused repository-local commits for that work. It does not authorize pushing, changing remotes, rewriting history, deleting unmerged branches or worktrees, or including unrelated changes.

## While working

- Commit coherent milestones so material progress does not survive only in a working tree across a pause or handoff.
- Keep commits narrow. Prefer follow-up or revert commits over destructive history rewriting.
- Use a separate worktree only for genuinely concurrent or scheduled work, a deliberately disposable experiment, explicit user-requested isolation, or a material risk reduction.
- Update the active [task brief](../tasks/README.md) when material work will outlive the current session. A Git commit preserves files; the brief preserves status, decisions, evidence, and the exact next action.

## Integration and Codex Handoff

The default delivery target is local `main` in the authoritative checkout. After verification, fast-forward the task branch into local `main` when safe, then confirm:

```sh
git merge-base --is-ancestor <task-commit> main
```

Keep the task branch until that check succeeds. A merged local task branch may then be removed as routine cleanup. Never force integration through unrelated dirty changes or conflicts.

For work begun in a Codex-managed worktree, Codex **Handoff to Local** may transfer the task's environment and Git state to the authoritative checkout. Handoff is a Git/environment operation; it does not replace the repository task brief when another task or agent needs semantic context.

If safe integration is blocked, keep the work committed on the named branch and report the branch, commit, worktree path, and exact blocker. Do not discard or archive a worktree until its intended changes are reachable from a named branch and preferably from local `main`.

Pushing always requires explicit user approval. If local `main` is ahead of its upstream, report that fact and ask whether to push rather than doing so automatically.

## Completion record

Before ending a task that changed files, report:

- checkout path, task branch, and starting commit;
- task commit hash or hashes;
- whether each task commit is reachable from local `main`;
- whether local `main` is ahead of its upstream;
- verification results; and
- any remaining uncommitted or unrelated changes.

Use the [verification contract](verification.md) before integration or handoff.
