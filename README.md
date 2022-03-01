# Report CodePipeline build status to GitHub commit

![CI status](https://github.com/awesome-cdk/cdk-report-codepipeline-status-to-github/actions/workflows/npm.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@awesome-cdk%2Fcdk-report-codepipeline-status-to-github.svg)](https://badge.fury.io/js/@awesome-cdk%2Fcdk-report-codepipeline-status-to-github)


An AWS CDK construct that, when attached to a CodePipeline, will make sure success or failure of that pipeline is
reflected back to GitHub and shown next to the commit.

This is largely based on
the <a href="https://aws.amazon.com/blogs/devops/aws-codepipeline-build-status-in-a-third-party-git-repository/">
reference architecture, proposed by AWS</a>, minus the SNS topic, since it's not really needed.

<img src="https://d2908q01vomqb2.cloudfront.net/7719a1c782a1ba91c031a682a0a2f8658209adbf/2021/03/24/AWS-CodePipeline-external-status-1-1.png"/>

### Quick Start

```
npm i @awesome-cdk/cdk-report-codepipeline-status-to-github
```

```typescript
import {CodePipelinePostToGitHub} from "@awesome-cdk/cdk-report-codepipeline-status-to-github";

// Create your pipeline with its Stages and all other configuration, as you would normally do it
const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {});

// Use the construct from this package, passing a "Systems Manager - Parameter Store" where you've previously stored your GitHub "Personal Access Token"
const githubToken = StringParameter.fromStringParameterName(this, 'GitHubToken', 'GITHUB_TOKEN');
new CodePipelinePostToGitHub(pipeline, 'CodePipelinePostToGitHub', {
    pipeline,
    githubToken,
});
```

