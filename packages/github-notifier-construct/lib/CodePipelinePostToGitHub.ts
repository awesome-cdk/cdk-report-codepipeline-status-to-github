import {Duration} from "aws-cdk-lib";
import {Construct} from "constructs";
import {IPipeline} from "aws-cdk-lib/aws-codepipeline";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {PolicyStatement} from "aws-cdk-lib/aws-iam";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {IStringParameter} from "aws-cdk-lib/aws-ssm";
import * as path from "path";

export class CodePipelinePostToGitHub extends Construct {

    constructor(scope: Construct, id: string, private props: {
        pipeline: IPipeline,
        githubToken: IStringParameter,
    }) {
        super(scope, id);

        const lambda = new Function(this, 'Function', {
            code: Code.fromAsset(path.resolve(__dirname, './../dist'), {}),
            handler: 'lambda.handler',
            timeout: Duration.seconds(30),
            logRetention: RetentionDays.ONE_MONTH,
            runtime: Runtime.NODEJS_20_X,
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
