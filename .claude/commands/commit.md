Stage all changes and create a commit on the current branch.

Steps:
1. Run `git status` and `git diff` to review what has changed
2. Run `git log -5 --oneline` to match the existing commit message style
3. Write a concise commit message focused on the "why", following the repo's style
4. Upgrade version in @mod.hjson, update desc in "subtitle" but super short and concise. Only bump the last digit, eg. 1.2.9 -> 1.2.10
5. No commit or stage. Stop there.
