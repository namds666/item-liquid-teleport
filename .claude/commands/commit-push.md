Stage all changes, create a commit, and push to the current branch.

Steps:
1. Run `git status` and `git diff` to review what has changed
2. Run `git log -5 --oneline` to match the existing commit message style
3. Stage all modified and new files (avoid secrets like .env)
4. Write a concise commit message focused on the "why", following the repo's style
5. Commit with the message
6. Push to the current remote branch (`git push`)
7. Report the commit hash and pushed branch to the user
