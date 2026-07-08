#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tools/ci-local.sh — run the full GitHub Actions suite locally.
#
# Mirrors every command each of the 7 CI workflows actually executes:
#   0. pnpm install --frozen-lockfile   (common to all workflows)
#   1. api.yml     → turbo lint test build
#   2. web.yml     → turbo lint test build
#   3. shared.yml  → turbo lint build
#   4. stellar.yml → turbo lint build
#   5. mobile.yml  → turbo lint test
#   6. docs.yml    → markdownlint-cli2 + markdown-link-check
#   7. deploy-api  → docker build of apps/api/Dockerfile (skipped if no docker)
#
# Usage:
#   tools/ci-local.sh                # full suite
#   tools/ci-local.sh --no-docker    # skip the docker build (faster)
#   tools/ci-local.sh --quick        # api + web + shared only (~1 min)
#   tools/ci-local.sh --no-color     # plain output (for CI logs)
#
# Exit code = number of failed steps (0 = all green).
# ─────────────────────────────────────────────────────────────────────────────
set -o pipefail

# ─── Options ────────────────────────────────────────────────────────────────
RUN_DOCKER=1
QUICK=0
USE_COLOR=1
for arg in "$@"; do
  case "$arg" in
    --no-docker)  RUN_DOCKER=0 ;;
    --quick)      QUICK=1; RUN_DOCKER=0 ;;
    --no-color)   USE_COLOR=0 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *) echo "Unknown flag: $arg (try --help)"; exit 2 ;;
  esac
done

if [ "$USE_COLOR" = 1 ] && [ -t 1 ]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; DIM=""; RESET=""
fi

# ─── Helpers ────────────────────────────────────────────────────────────────
FAILED=0
TOTAL=0

# run_step <display-name> <command> [args...]
# CRITICAL: "$@" must be quoted so words like "turbo api" stay as one arg.
# Unquoted $@ would split them and pass "api" to the inner command.
run_step() {
  local name="$1"; shift
  TOTAL=$((TOTAL + 1))
  local start end
  start=$(date +%s)

  echo
  echo "────────────────────────────────────────────────────────────"
  echo "  [$TOTAL] $name"
  echo "────────────────────────────────────────────────────────────"
  echo "  ${DIM}\$${RESET} $*"
  "$@"
  local ec=$?
  end=$(date +%s)
  local dur=$((end - start))

  if [ $ec -eq 0 ]; then
    echo "${GREEN}✅ PASSED${RESET}  $name  ${DIM}(${dur}s)${RESET}"
  else
    FAILED=$((FAILED + 1))
    echo "${RED}❌ FAILED${RESET}  $name  ${DIM}(${dur}s, exit=$ec)${RESET}"
  fi
  return $ec
}

# ─── Pre-flight ────────────────────────────────────────────────────────────
echo
echo "${YELLOW}ci-local${RESET} — full GitHub Actions suite, locally"
echo "  repo:    $(basename "$(git rev-parse --show-toplevel 2>/dev/null || echo .)")"
echo "  branch:  $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "  commit:  $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "  pnpm:    $(pnpm --version 2>/dev/null || echo 'NOT FOUND')"
echo "  node:    $(node --version 2>/dev/null || echo 'NOT FOUND')"
echo "  docker:  $(command -v docker >/dev/null && docker --version || echo 'not installed')"

# ─── 0. Common: install (all 7 workflows) ──────────────────────────────────
run_step "0. pnpm install --frozen-lockfile" \
  pnpm install --frozen-lockfile

# ─── 1. api (lint test build) — always runs ───────────────────────────────
run_step "1. api workflow: turbo lint test build" \
  pnpm turbo run lint test build --filter=@universal-healthcare/api

# ─── 2. web (lint test build) — always runs ───────────────────────────────
run_step "2. web workflow: turbo lint test build" \
  pnpm turbo run lint test build --filter=@universal-healthcare/web

# ─── 3. shared (lint build) — always runs ─────────────────────────────────
run_step "3. shared workflow: turbo lint build" \
  pnpm turbo run lint build --filter=@universal-healthcare/shared

if [ $QUICK = 0 ]; then
  # ─── 4. stellar (lint build) ─────────────────────────────────────────────
  run_step "4. stellar workflow: turbo lint build" \
    pnpm turbo run lint build --filter=@universal-healthcare/stellar

  # ─── 5. mobile (lint test) ──────────────────────────────────────────────
  run_step "5. mobile workflow: turbo lint test" \
    pnpm turbo run lint test --filter=@universal-healthcare/mobile

  # ─── 6. docs (markdownlint + link check) ─────────────────────────────────
  run_step "6a. docs: markdownlint-cli2" \
    pnpm dlx markdownlint-cli2 \
      "**/*.md" "!**/node_modules/**" "!**/.git/**" \
      --config .markdownlint.jsonc

  # markdown-link-check exits 1 on any DEAD/TIMEOUT/ERROR, 0 otherwise.
  # Run it once and let its native exit code drive the step result.
  # (Filtering through grep + a silent re-run was double the network cost
  # for no benefit — the tool's own output is already concise.)
  run_step "6b. docs: markdown-link-check" \
    bash -c '
      shopt -s globstar nullglob
      files=(docs/**/*.md README.md)
      pnpm dlx markdown-link-check "${files[@]}" --config .markdown-link-check.json
    '

  # ─── 7. deploy-api: docker build ────────────────────────────────────────
  if [ $RUN_DOCKER = 1 ]; then
    if command -v docker >/dev/null 2>&1; then
      # 40 lines (was 20) — multi-stage BuildKit errors can push the real
      # cause out of the last 20 lines.
      run_step "7. deploy-api: docker build apps/api/Dockerfile" \
        bash -c 'DOCKER_BUILDKIT=1 docker build -f apps/api/Dockerfile -t uhdn-api:ci-local . >/tmp/ci-local-docker.log 2>&1; local ec=$?; tail -40 /tmp/ci-local-docker.log; exit $ec'
    else
      echo
      echo "${YELLOW}⏭  SKIPPED${RESET}  7. deploy-api: docker build ${DIM}(docker not installed; re-run with --no-docker to silence this notice)${RESET}"
    fi
  fi
else
  echo
  echo "${YELLOW}--quick: skipping stellar + mobile + docs + docker (api + web + shared only)${RESET}"
fi

# ─── Summary ────────────────────────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
  echo "${GREEN}  ✅ ALL $TOTAL STEPS PASSED${RESET}"
else
  echo "${RED}  ❌ $FAILED of $TOTAL STEPS FAILED${RESET}"
fi
echo "════════════════════════════════════════════════════════════"
echo
exit $FAILED
