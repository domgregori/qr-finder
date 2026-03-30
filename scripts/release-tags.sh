#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || "$#" -eq 0 ]]; then
  cat <<'EOF'
Usage:
  scripts/release-tags.sh <tag> [tag...]

Example:
  scripts/release-tags.sh v0.1.4 latest

Behavior:
  - For non-"latest" tags:
    - create annotated git tag if missing
    - push git tag to remote
  - For every tag (including latest):
    - docker tag/push admin image
    - docker tag/push public image

Environment variables:
  REGISTRY_HOST      Default: gitea.home.doms.place
  REGISTRY_NAMESPACE Default: domgregori
  GIT_REMOTE         Default: origin
  PUSH_BRANCH        Default: 1 (push current branch before tags/images)
EOF
  exit 0
fi

REGISTRY_HOST="${REGISTRY_HOST:-gitea.home.doms.place}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-domgregori}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
PUSH_BRANCH="${PUSH_BRANCH:-1}"

if [[ "$PUSH_BRANCH" == "1" ]]; then
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  echo "Pushing branch ${current_branch} to ${GIT_REMOTE}..."
  git push "${GIT_REMOTE}" "${current_branch}"
fi

for tag in "$@"; do
  if [[ "$tag" != "latest" ]]; then
    if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
      echo "Git tag ${tag} already exists locally, skipping create."
    else
      echo "Creating git tag ${tag}..."
      git tag -a "${tag}" -m "Release ${tag}"
    fi

    echo "Pushing git tag ${tag}..."
    git push "${GIT_REMOTE}" "refs/tags/${tag}"
  else
    echo "Skipping git tag creation for 'latest'."
  fi

  for app in admin public; do
    local_image="qr-finder-${app}:${tag}"
    remote_image="${REGISTRY_HOST}/${REGISTRY_NAMESPACE}/qr-finder-${app}:${tag}"

    if ! docker image inspect "${local_image}" >/dev/null 2>&1; then
      echo "Missing local image: ${local_image}"
      echo "Build it first, then re-run."
      exit 1
    fi

    echo "Tagging ${local_image} -> ${remote_image}"
    docker tag "${local_image}" "${remote_image}"

    echo "Pushing ${remote_image}"
    docker push "${remote_image}"
  done
done

echo "Done."
