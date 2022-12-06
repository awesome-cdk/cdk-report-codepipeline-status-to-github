import { Construct } from "constructs";
import { aws_codepipeline, aws_codepipeline_actions, aws_codebuild, SecretValue } from "aws-cdk-lib";

export class DummyPipeline extends Construct {
  pipeline: aws_codepipeline.Pipeline;

  constructor(
    scope: Construct,
    id: string,
    props: {
      githubToken: string;
    }
  ) {
    super(scope, id);

    this.pipeline = new aws_codepipeline.Pipeline(this, "Pipeline", { crossAccountKeys: false });

    const sourceArtifact = new aws_codepipeline.Artifact();

    this.pipeline.addStage({
      stageName: "Source",
      actions: [
        new aws_codepipeline_actions.GitHubSourceAction({
          actionName: "Source",
          oauthToken: SecretValue.unsafePlainText(props.githubToken),
          output: sourceArtifact,
          owner: "awesome-cdk",
          repo: "cdk-report-codepipeline-status-to-github",
        }),
      ],
    });
    this.pipeline.addStage({
      stageName: "Test",
      actions: [
        new aws_codepipeline_actions.CodeBuildAction({
          input: sourceArtifact,
          actionName: "Test",
          project: new aws_codebuild.Project(this, "CodeBuild/Project/Test", {
            environment: {
              buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
            },
            buildSpec: aws_codebuild.BuildSpec.fromObject({
              version: "0.2",
              phases: {
                build: {
                  commands: ["echo Dummy tests succeeded"],
                },
              },
            }),
          }),
        }),
      ],
    });
  }
}
