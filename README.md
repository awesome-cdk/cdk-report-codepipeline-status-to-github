# Report CodePipeline build status to GitHub commit

![CI status](https://github.com/awesome-cdk/cdk-report-codepipeline-status-to-github/actions/workflows/npm.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@awesome-cdk%2Fcdk-report-codepipeline-status-to-github.svg)](https://badge.fury.io/js/@awesome-cdk%2Fcdk-report-codepipeline-status-to-github)


An AWS CDK construct that, when attached to a CodePipeline, will make sure success or failure of that pipeline is
reflected back to GitHub and shown next to the commit.

This is largely based on
the <a href="https://aws.amazon.com/blogs/devops/aws-codepipeline-build-status-in-a-third-party-git-repository/">
reference architecture, proposed by AWS</a>, minus the SNS topic, since it's not really needed.

```mermaid
flowchart LR
    A["👨‍💻 Developer pushes commit"] --> B["GitHub Repository"]
    B --> C["AWS CodePipeline"]
    C -->|Pipeline status changes| D["Amazon EventBridge"]
    D -->|Triggers| E["AWS Lambda"]
    E -->|Reads commit details| C
    E -->|Reports build status| B
```
<img width="1393" height="598" alt="image" src="https://github.com/user-attachments/assets/36112e2b-5b68-4481-ba0c-e278b5433e7f" />


### Migrating from v1 (CDK v1) to v2 (CDK v2)

This package was rewritten for AWS CDK v2. If upgrading from an earlier version:

- Replace all `@aws-cdk/*` imports with `aws-cdk-lib` equivalents
- Add `constructs` as a dependency (`Construct` now comes from the `constructs` package)
- The public API (`CodePipelinePostToGitHub` class and its props) is unchanged

```diff
- import {StringParameter} from "@aws-cdk/aws-ssm";
+ import {StringParameter} from "aws-cdk-lib/aws-ssm";
```

The same pattern applies to all other `@aws-cdk/*` imports (e.g. `@aws-cdk/aws-codepipeline` → `aws-cdk-lib/aws-codepipeline`).

### Requirements

- AWS CDK v2 (`aws-cdk-lib` >= 2.100.0)
- Node.js >= 18

### Quick Start

```
npm i @awesome-cdk/cdk-report-codepipeline-status-to-github
```

```typescript
import {CodePipelinePostToGitHub} from "@awesome-cdk/cdk-report-codepipeline-status-to-github";
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";

// Create your pipeline with its Stages and all other configuration, as you would normally do it
const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {});

// Use the construct from this package, passing a "Systems Manager - Parameter Store" where you've previously stored your GitHub "Personal Access Token"
const githubToken = StringParameter.fromStringParameterName(this, 'GitHubToken', 'GITHUB_TOKEN');
new CodePipelinePostToGitHub(pipeline, 'CodePipelinePostToGitHub', {
    pipeline,
    githubToken,
});
```

### E2E Testing

An end-to-end test script is included that creates a throwaway GitHub repo, deploys the construct to a real AWS account, triggers a pipeline, and verifies the commit status is reported back to GitHub.

**Prerequisites:**

- [gh CLI](https://cli.github.com/) authenticated (`gh auth login`)
- AWS credentials in the shell (e.g. via `aws-vault`, `aws sso login`, or env vars)
- Node.js >= 18, pnpm installed
- A **classic** GitHub PAT with `repo` scope (fine-grained PATs are not supported by CodePipeline's GitHub source action)

**Run:**

```bash
aws-vault exec <profile> -- ./e2e.sh --github-pat ghp_xxx
```

**What it does:**

1. Creates a throwaway public GitHub repo
2. Pushes a test commit (via SSH)
3. Deploys the CDK example stack (CodePipeline + Lambda + CloudWatch Event Rule)
4. Starts the pipeline and waits for it to run
5. Polls the GitHub commit status API until `success` or `failure` is reported
6. Cleans up: destroys the stack, deletes the repo, removes the SSM parameter

**Note:** If repo deletion fails (missing `delete_repo` scope), the script will print a link to delete it manually. To enable auto-deletion for future runs:

```bash
gh auth refresh -h github.com -s delete_repo
```
