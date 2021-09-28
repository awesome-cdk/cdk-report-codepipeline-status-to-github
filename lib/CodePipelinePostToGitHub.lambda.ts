import {CodePipelineCloudWatchPipelineHandler} from "aws-lambda";
import axios from 'axios';

const aws = require('aws-sdk');

const BaseURL = 'https://api.github.com/repos';

const codepipeline = new aws.CodePipeline();

const Password = () => {
    if (process.env.ACCESS_TOKEN) {
        return process.env.ACCESS_TOKEN;
    }
    throw new Error('process.env.ACCESS_TOKEN is not defined');
};

export const handler: CodePipelineCloudWatchPipelineHandler = async (event) => {
    const region = event.region;
    const pipelineName = event.detail.pipeline;
    const executionId = event.detail['execution-id'];
    const state = transformState(event.detail.state);

    if (state === null) {
        return;
    }

    const result = await getPipelineExecution(pipelineName, executionId);
    const payload = createPayload(pipelineName, region, state);

    await postStatusToGitHub(result.owner, result.repository, result.sha, payload);
};

function transformState(state: string) {
    if (state === 'STARTED') {
        return 'pending';
    }
    if (state === 'SUCCEEDED') {
        return 'success';
    }
    if (state === 'FAILED') {
        return 'failure';
    }

    return null;
}

function createPayload(pipelineName: string, region: string, status: string) {
    let description;
    if (status === 'pending') {
        description = 'Build started';
    } else if (status === 'success') {
        description = 'Build succeeded';
    } else if (status === 'failure') {
        description = 'Build failed!';
    }

    return {
        state: status,
        'target_url': buildCodePipelineUrl(pipelineName, region),
        description: description,
        context: `ci/${pipelineName}/${region}`
    };
}

const getPipelineExecution = async (pipelineName: string, executionId: string) => {
    const params = {
        pipelineName: pipelineName,
        pipelineExecutionId: executionId
    };

    const result = await codepipeline.getPipelineExecution(params).promise();
    console.log(result.pipelineExecution);
    const artifactRevision = result.pipelineExecution.artifactRevisions[0];

    console.log(artifactRevision);

    const revisionURL = artifactRevision.revisionUrl;
    const sha = artifactRevision.revisionId;

    const pattern = /github.com\/(.+)\/(.+)\/commit\//;
    const matches = pattern.exec(revisionURL);

    return {
        owner: matches?.[1],
        repository: matches?.[2],
        sha: sha
    };
};

function buildCodePipelineUrl(pipelineName: string, region: string) {
    return `https://${region}.console.aws.amazon.com/codepipeline/home?region=${region}#/view/${pipelineName}`;
}

const postStatusToGitHub = async (owner: string | undefined, repository: string | undefined, sha: any, payload: any) => {
    const url = `/${owner}/${repository}/statuses/${sha}`;

    await axios.post(url, payload, {
        baseURL: BaseURL,
        headers: {
            'Content-Type': 'application/json'
        },
        // @ts-ignore
        auth: {
            password: Password()!,
        },
    });
};
