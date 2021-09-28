import {Construct, Duration} from "@aws-cdk/core";
import {IPipeline} from "@aws-cdk/aws-codepipeline";
import {NodejsFunction} from "@aws-cdk/aws-lambda-nodejs";
import {LambdaFunction} from "@aws-cdk/aws-events-targets";
import {PolicyStatement} from "@aws-cdk/aws-iam";
import {RetentionDays} from "@aws-cdk/aws-logs";
import * as path from "path";
import {IStringParameter, StringParameter} from "@aws-cdk/aws-ssm";

export class CodePipelinePostToGitHub extends Construct {

    constructor(scope: Construct, id: string, private props: {
        pipeline: IPipeline,
        githubToken: IStringParameter,
    }) {
        super(scope, id);

        const lambda = new NodejsFunction(this, 'NodejsFunction', {
            entry: path.resolve(__dirname, 'CodePipelinePostToGitHub.lambda.ts'),
            timeout: Duration.seconds(30),
            logRetention: RetentionDays.ONE_MONTH,
        });

        // Allow the Lambda to query CodePipeline for more details on the build that triggered the event
        lambda.addToRolePolicy(new PolicyStatement({
            actions: ['codepipeline:GetPipelineExecution'],
            resources: [this.props.pipeline.pipelineArn],
        }));

        // Allow the Lambda to post to a private GitHub API on behalf of the repo owner
        lambda.addEnvironment('ACCESS_TOKEN', props.githubToken.stringValue);

        this.props.pipeline.onStateChange('onStateChange', {
            target: new LambdaFunction(lambda),
        });
    }
}
