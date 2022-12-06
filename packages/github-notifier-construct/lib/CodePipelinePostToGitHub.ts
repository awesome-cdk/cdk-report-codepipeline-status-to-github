import { Construct } from "constructs";
import {
  aws_codepipeline,
  aws_lambda,
  aws_events_targets,
  aws_iam,
  aws_logs,
  aws_ssm,
  Duration,
} from "aws-cdk-lib";
import * as path from "path";

export class CodePipelinePostToGitHub extends Construct {
  constructor(
    scope: Construct,
    id: string,
    private props: {
      pipeline: aws_codepipeline.IPipeline;
      githubToken: aws_ssm.IStringParameter | string;
    }
  ) {
    super(scope, id);

    const lambda = new aws_lambda.Function(this, "Function", {
      code: aws_lambda.Code.fromAsset(path.resolve(__dirname, "./../dist"), {}),
      handler: "lambda.handler",
      timeout: Duration.seconds(30),
      logRetention: aws_logs.RetentionDays.ONE_MONTH,
      runtime: aws_lambda.Runtime.NODEJS_14_X,
    });

    // Allow the Lambda to query CodePipeline for more details on the build that triggered the event
    lambda.addToRolePolicy(
      new aws_iam.PolicyStatement({
        actions: ["codepipeline:GetPipelineExecution"],
        resources: [this.props.pipeline.pipelineArn],
      })
    );

    const accessToken = typeof props.githubToken === 'string' ? props.githubToken : props.githubToken.stringValue;

    // Allow the Lambda to post to a private GitHub API on behalf of the repo owner
    lambda.addEnvironment("ACCESS_TOKEN", accessToken);

    this.props.pipeline.onStateChange("onStateChange", {
      target: new aws_events_targets.LambdaFunction(lambda),
    });
  }
}
