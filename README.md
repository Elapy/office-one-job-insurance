# Deploy (GitHub Pages) — ready, blocked on gh auth
Attempted 2026-11-19: `gh auth status` → "You are not logged into any GitHub hosts."
and `gh repo create office-one-job-insurance --public` fails for the same reason.
No GitHub credential is available to this agent (check the GitHub connector /
signed-in account before retrying).

Once authenticated:
  gh repo create office-one-job-insurance --public --source=. --push
  gh api -X POST repos/<owner>/office-one-job-insurance/pages -f source.branch=main -f source.path=/
Then verify https://<owner>.github.io/office-one-job-insurance/
This folder (site files at root + .nojekyll) is the Pages root.
