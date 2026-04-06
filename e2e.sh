#!/usr/bin/env bash
set -euo pipefail

# E2E test for cdk-report-codepipeline-status-to-github
#
# Usage:
#   ./e2e.sh --github-pat <token>
#
# Prerequisites:
#   - gh CLI authenticated
#   - AWS credentials in the current shell (e.g. via aws-vault exec <profile> -- ./e2e.sh ...)
#   - Node.js 18+, pnpm installed
#   - Classic GitHub PAT with scopes: repo, repo:status
#     (Fine-grained PATs do NOT work with CodePipeline's GitHub source action)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE_STACK_DIR="$SCRIPT_DIR/packages/example-stack"
REPO_PREFIX="e2e-codepipeline-status"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
STACK_NAME="e2e-test-${TIMESTAMP}-cdk-construct-report-codepipeline-status-to-github"
AWS_REGION="us-east-1"
CLEANUP_ITEMS=()

# --- Argument parsing ---
GITHUB_PAT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --github-pat) GITHUB_PAT="$2"; shift 2 ;;
        *) echo "Unknown argument: $1"; exit 1 ;;
    esac
done

if [[ -z "$GITHUB_PAT" ]]; then
    echo "Usage: ./e2e.sh --github-pat <token>"
    exit 1
fi

# --- Cleanup handler ---
cleanup() {
    echo ""
    echo "=== Cleanup ==="

    for item in "${CLEANUP_ITEMS[@]}"; do
        case "$item" in
            stack:*)
                local stack="${item#stack:}"
                echo "Destroying CDK stack: $stack"
                (cd "$EXAMPLE_STACK_DIR" && CDK_DEFAULT_REGION="$AWS_REGION" npx cdk destroy "$stack" --force \
                    -c "stackName=${stack}" \
                    -c githubToken=cleanup \
                    -c githubOwner=cleanup \
                    -c githubRepo=cleanup 2>/dev/null) || echo "  Stack destroy failed (may already be deleted)"
                ;;
            repo:*)
                local repo="${item#repo:}"
                echo "Deleting GitHub repo: $repo"
                if ! gh repo delete "$repo" --yes 2>/dev/null; then
                    echo ""
                    echo -e "  \033[33m⚠  Could not delete repo automatically (missing delete_repo scope).\033[0m"
                    echo -e "  \033[33m   Delete manually: https://github.com/${repo}/settings#danger-zone\033[0m"
                    echo -e "  \033[33m   Or run: gh auth refresh -h github.com -s delete_repo\033[0m"
                    echo ""
                fi
                ;;
            tmpdir:*)
                local dir="${item#tmpdir:}"
                rm -rf "$dir"
                ;;
            ssm:*)
                local param="${item#ssm:}"
                echo "Deleting SSM parameter: $param"
                aws ssm delete-parameter --name "$param" --region "$AWS_REGION" 2>/dev/null || true
                ;;
        esac
    done

    echo ""
    echo "Remember to revoke the PAT at: https://github.com/settings/tokens"
    echo "=== Cleanup complete ==="
}

trap cleanup EXIT

# --- Step 1: Create throwaway GitHub repo ---
echo "=== Step 1: Create throwaway GitHub repo ==="
GH_USER=$(gh api user --jq '.login')
REPO_NAME="${REPO_PREFIX}-$(date +%s)"
REPO_FULL="${GH_USER}/${REPO_NAME}"

gh repo create "$REPO_NAME" --public --description "Throwaway repo for e2e testing" --clone=false
CLEANUP_ITEMS+=("repo:${REPO_FULL}")
echo "Created repo: $REPO_FULL"

# --- Step 2: Push a test commit ---
echo ""
echo "=== Step 2: Push a test commit ==="
TMPDIR=$(mktemp -d)
CLEANUP_ITEMS+=("tmpdir:${TMPDIR}")

(
    cd "$TMPDIR"
    git init -b main
    git remote add origin "git@github.com:${REPO_FULL}.git"
    echo "e2e test - $(date)" > test.txt
    git add test.txt
    git commit -m "e2e test commit"
    git push origin main
)
COMMIT_SHA=$(git -C "$TMPDIR" rev-parse HEAD)
echo "Pushed commit: $COMMIT_SHA"

# --- Step 3: Build and deploy CDK stack ---
echo ""
echo "=== Step 3: Deploy CDK stack ==="

echo "Building construct..."
(cd "$SCRIPT_DIR/packages/github-notifier-construct" && npm run build --silent)

echo "Deploying stack to $AWS_REGION..."
(cd "$EXAMPLE_STACK_DIR" && CDK_DEFAULT_REGION="$AWS_REGION" npx cdk deploy "$STACK_NAME" \
    -c "stackName=${STACK_NAME}" \
    -c "githubToken=${GITHUB_PAT}" \
    -c "githubOwner=${GH_USER}" \
    -c "githubRepo=${REPO_NAME}" \
    --require-approval never \
    --outputs-file cdk-outputs.json)

CLEANUP_ITEMS+=("stack:${STACK_NAME}")
CLEANUP_ITEMS+=("ssm:/test/github-token-${STACK_NAME}")

PIPELINE_NAME=$(python3 -c "
import json
outputs = json.load(open('${EXAMPLE_STACK_DIR}/cdk-outputs.json'))
print(outputs['${STACK_NAME}']['PipelineName'])
")
echo "Pipeline name: $PIPELINE_NAME"
rm -f "$EXAMPLE_STACK_DIR/cdk-outputs.json"

# --- Step 4: Start the pipeline ---
echo ""
echo "=== Step 4: Start CodePipeline ==="
EXECUTION_ID=$(aws codepipeline start-pipeline-execution \
    --name "$PIPELINE_NAME" \
    --region "$AWS_REGION" \
    --query 'pipelineExecutionId' \
    --output text)
echo "Execution ID: $EXECUTION_ID"

echo "Waiting for pipeline to start..."
for i in $(seq 1 12); do
    sleep 10
    STATUS=$(aws codepipeline get-pipeline-execution \
        --pipeline-name "$PIPELINE_NAME" \
        --pipeline-execution-id "$EXECUTION_ID" \
        --region "$AWS_REGION" \
        --query 'pipelineExecution.status' \
        --output text 2>&1) || true

    echo "  [$i/12] Pipeline: $STATUS"

    case "$STATUS" in
        Failed|Cancelled|Stopped|Stopping)
            echo "ERROR: Pipeline failed to run ($STATUS)"
            exit 1 ;;
        InProgress|Succeeded)
            echo "Pipeline is running."
            break ;;
    esac
done

# --- Step 5: Poll for GitHub commit status ---
echo ""
echo "=== Step 5: Waiting for commit status on ${COMMIT_SHA:0:7} ==="

MAX_ATTEMPTS=30
for i in $(seq 1 $MAX_ATTEMPTS); do
    RESPONSE=$(curl -sf \
        -H "Authorization: token ${GITHUB_PAT}" \
        "https://api.github.com/repos/${REPO_FULL}/commits/${COMMIT_SHA}/status" || echo "{}")

    STATE=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('state',''))" 2>/dev/null || echo "")
    COUNT=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('total_count',0))" 2>/dev/null || echo "0")

    echo "  [$i/$MAX_ATTEMPTS] Status: ${STATE:-none} (${COUNT} statuses)"

    if [[ "$STATE" == "success" || "$STATE" == "failure" ]]; then
        echo ""
        echo "========================================="
        echo "  E2E TEST PASSED"
        echo "  Commit status: $STATE"
        echo "========================================="
        exit 0
    fi

    sleep 15
done

echo ""
echo "ERROR: Timed out waiting for commit status"
exit 1
