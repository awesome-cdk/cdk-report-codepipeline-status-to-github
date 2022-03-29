import {CodePipelineCloudWatchPipelineHandler} from "aws-lambda";
import axios from 'axios';
import {CodePipeline} from 'aws-sdk';

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

    if (!result) {
        console.error(`Can not resolve pipeline execution`);
        return;
    }

    await postStatusToGitHub(result.owner, result.repository, result.sha, payload);

    console.log(`Successfully notified GitHub repository ${result.owner}/${result.repository} for commit ${result.sha} with payload:`, payload);
};

const getPersonalAccessToken = () => {
    if (process.env.ACCESS_TOKEN) {
        return process.env.ACCESS_TOKEN as string;
    }
    throw new Error('process.env.ACCESS_TOKEN is not defined');
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

    const result = await new CodePipeline().getPipelineExecution(params).promise();
    const artifactRevision = result?.pipelineExecution?.artifactRevisions?.find(() => true);

    const revisionURL = artifactRevision?.revisionUrl;
    const sha = artifactRevision?.revisionId;

    if (!revisionURL || !sha) {
        console.error('No revision URL or commit hash resolved');
        return;
    }

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
        baseURL: 'https://api.github.com/repos',
        headers: {
            'Content-Type': 'application/json'
        },
        // @ts-ignore
        auth: {
            password: getPersonalAccessToken(),
        },
    });
};
