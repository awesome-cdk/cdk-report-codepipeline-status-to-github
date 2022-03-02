import * as cdk from '@aws-cdk/core';
import {StringParameter} from "@aws-cdk/aws-ssm";
import {CodePipelinePostToGitHub} from '@awesome-cdk/cdk-report-codepipeline-status-to-github';
import {DummyPipeline} from "./DummyPipeline";

export class GitHubNotifierCdkConstructV1 extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const githubToken = StringParameter.fromStringParameterName(this, 'GITHUB_TOKEN', 'GITHUB_TOKEN');

        const dummyPipeline = new DummyPipeline(this, 'DummyPipeline', {githubToken: githubToken.stringValue});

        new CodePipelinePostToGitHub(this, 'CodePipelinePostToGitHub', {
            pipeline: dummyPipeline.pipeline,
            githubToken,
        });
    }
}
