import * as cdk from '@aws-cdk/core';
import {Pipeline} from "@aws-cdk/aws-codepipeline";
import {CodePipelinePostToGitHub} from "./CodePipelinePostToGitHub";
import {StringParameter} from "@aws-cdk/aws-ssm";

export class CdkReportCodepipelineStatusToGithubStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new Pipeline(this, 'Pipeline', {
            crossAccountKeys: false,
        });

        const githubToken = StringParameter.fromStringParameterName(this,
            'GitHubToken',
            '');

        new CodePipelinePostToGitHub(this, 'CodePipelinePostToGitHub', {
            pipeline,
            githubToken,
        })
    }
}
