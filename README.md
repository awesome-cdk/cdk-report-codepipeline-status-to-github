# Report CodePipeline build status to GitHub commit

An AWS CDK construct that, when attached to a CodePipeline, will make sure success or failure of that pipeline is
reflected back to GitHub and shown next to the commit.

This is largely based on
the <a href="https://aws.amazon.com/blogs/devops/aws-codepipeline-build-status-in-a-third-party-git-repository/">
reference architecture, proposed by AWS</a>, minus the SNS topic, since it's not really needed.

<img src="https://d2908q01vomqb2.cloudfront.net/7719a1c782a1ba91c031a682a0a2f8658209adbf/2021/03/24/AWS-CodePipeline-external-status-1-1.png"/>
