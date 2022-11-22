import { Construct } from "constructs";
import {
  StackProps,
  aws_ssm,
  Stack,
} from "aws-cdk-lib";
import {CodePipelinePostToGitHub} from '@awesome-cdk/cdk-report-codepipeline-status-to-github';
import {DummyPipeline} from "./DummyPipeline";

export class GitHubNotifierCdkConstructV1 extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const githubToken = aws_ssm.StringParameter.fromStringParameterName(this, 'GITHUB_TOKEN', 'GITHUB_TOKEN');

        const dummyPipeline = new DummyPipeline(this, 'DummyPipeline', {githubToken: githubToken.stringValue});

        new CodePipelinePostToGitHub(this, 'CodePipelinePostToGitHub', {
            pipeline: dummyPipeline.pipeline,
            githubToken,
        });
    }
}
