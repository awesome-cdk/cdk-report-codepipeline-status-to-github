import {Construct, SecretValue} from "@aws-cdk/core";
import {Artifact, Pipeline} from "@aws-cdk/aws-codepipeline";
import {CodeBuildAction, GitHubSourceAction} from "@aws-cdk/aws-codepipeline-actions";
import {BuildSpec, Project} from "@aws-cdk/aws-codebuild";

export class DummyPipeline extends Construct {
    pipeline: Pipeline;

    constructor(scope: Construct, id: string, props: {
        githubToken: string,
    }) {
        super(scope, id);

        this.pipeline = new Pipeline(this, 'Pipeline', {crossAccountKeys: false});

        const sourceArtifact = new Artifact();

        this.pipeline.addStage({
            stageName: "Source",
            actions: [
                new GitHubSourceAction({
                    actionName: "Source",
                    oauthToken: SecretValue.plainText(props.githubToken),
                    output: sourceArtifact, owner: "awesome-cdk",
                    repo: "cdk-report-codepipeline-status-to-github"
                })
            ],
        });
        this.pipeline.addStage({
            stageName: "Test",
            actions: [
                new CodeBuildAction({
                    input: sourceArtifact,
                    actionName: "Test",
                    project: new Project(this, 'CodeBuild/Project/Test', {
                        buildSpec: BuildSpec.fromObject({
                            version: '0.2',
                            phases: {
                                build: {
                                    commands: [
                                        'echo Dummy tests succeeded'
                                    ],
                                },
                            },
                        }),
                    }),
                })
            ],
        })

    }
}
