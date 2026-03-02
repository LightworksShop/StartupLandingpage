#!/usr/bin/env bash

set -euo pipefail

read -r -p "Commit message: " commit_message

if [[ -z "${commit_message// }" ]]; then
  echo "Aborted: commit message is required."
  exit 1
fi

git add -A
git commit -m "$commit_message"
git push
