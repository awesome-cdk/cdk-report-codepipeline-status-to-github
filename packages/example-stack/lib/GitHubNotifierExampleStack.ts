import * as cdk from 'aws-cdk-lib';
import {StringParameter} from 'aws-cdk-lib/aws-ssm';
import {Construct} from 'constructs';
import {CodePipelinePostToGitHub} from '@awesome-cdk/cdk-report-codepipeline-status-to-github';
import {DummyPipeline} from './DummyPipeline';

export class GitHubNotifierExampleStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const githubTokenValue = this.node.getContext('githubToken');
        const githubOwner = this.node.getContext('githubOwner');
        const githubRepo = this.node.getContext('githubRepo');

        if (!githubTokenValue || !githubOwner || !githubRepo) {
            throw new Error('Missing required context: -c githubToken=ghp_xxx -c githubOwner=OWNER -c githubRepo=REPO');
        }

        // Create the SSM parameter inline so we don't depend on pre-existing resources
        const githubToken = new StringParameter(this, 'GitHubTokenParam', {
            parameterName: `/test/github-token-${this.stackName}`,
            stringValue: githubTokenValue,
        });

        const dummyPipeline = new DummyPipeline(this, 'DummyPipeline', {
            githubToken: githubTokenValue,
            githubOwner,
            githubRepo,
        });

        new CodePipelinePostToGitHub(this, 'CodePipelinePostToGitHub', {
            pipeline: dummyPipeline.pipeline,
            githubToken,
        });

        new cdk.CfnOutput(this, 'PipelineName', {
            value: dummyPipeline.pipeline.pipelineName,
        });
    }
}
