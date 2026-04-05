import {SecretValue} from 'aws-cdk-lib';
import {Artifact, Pipeline} from 'aws-cdk-lib/aws-codepipeline';
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger} from 'aws-cdk-lib/aws-codepipeline-actions';
import {BuildSpec, LinuxBuildImage, Project} from 'aws-cdk-lib/aws-codebuild';
import {Construct} from 'constructs';

export class DummyPipeline extends Construct {
    pipeline: Pipeline;

    constructor(scope: Construct, id: string, props: {
        githubToken: string,
        githubOwner: string,
        githubRepo: string,
    }) {
        super(scope, id);

        this.pipeline = new Pipeline(this, 'Pipeline', {crossAccountKeys: false});

        const sourceArtifact = new Artifact();

        this.pipeline.addStage({
            stageName: 'Source',
            actions: [
                new GitHubSourceAction({
                    actionName: 'Source',
                    oauthToken: SecretValue.unsafePlainText(props.githubToken),
                    output: sourceArtifact,
                    owner: props.githubOwner,
                    repo: props.githubRepo,
                    branch: 'main',
                    trigger: GitHubTrigger.NONE,
                }),
            ],
        });
        this.pipeline.addStage({
            stageName: 'Test',
            actions: [
                new CodeBuildAction({
                    input: sourceArtifact,
                    actionName: 'Test',
                    project: new Project(this, 'CodeBuild/Project/Test', {
                        environment: {buildImage: LinuxBuildImage.AMAZON_LINUX_2_ARM_2},
                        buildSpec: BuildSpec.fromObject({
                            version: '0.2',
                            phases: {
                                build: {
                                    commands: [
                                        'echo Dummy tests succeeded',
                                    ],
                                },
                            },
                        }),
                    }),
                }),
            ],
        });
    }
}
