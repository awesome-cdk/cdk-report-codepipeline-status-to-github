import * as cdk from '@aws-cdk/core';
import {Artifact, Pipeline} from "@aws-cdk/aws-codepipeline";
import {CodePipelinePostToGitHub} from "./CodePipelinePostToGitHub";
import {StringParameter} from "@aws-cdk/aws-ssm";
import {GitHubSourceAction, GitHubTrigger} from "@aws-cdk/aws-codepipeline-actions";
import {SecretValue} from '@aws-cdk/core';

export class ExampleStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new Pipeline(this, 'Pipeline', {
            crossAccountKeys: false,
        });

        const githubToken = StringParameter.fromStringParameterName(this, 'GitHubToken', '');

        new CodePipelinePostToGitHub(this, 'CodePipelinePostToGitHub', {
            pipeline,
            githubToken,
        });

        const artifact = new Artifact();

        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new GitHubSourceAction({
                    output: artifact,
                    actionName: 'Source',
                    owner: 'awesome-cdk',
                    repo: 'cdk-report-codepipeline-status-to-github',
                    trigger: GitHubTrigger.POLL,
                    branch: 'master',
                    oauthToken: SecretValue.plainText(githubToken.stringValue)
                })
            ],
        });

        pipeline.addStage({
            stageName: 'Test',
            actions: [],
        })
    }
}
