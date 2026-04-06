#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {GitHubNotifierExampleStack} from '../lib/GitHubNotifierExampleStack';

const app = new cdk.App();
const stackName = app.node.tryGetContext('stackName') || 'E2ECodePipelineGitHubStatus';
new GitHubNotifierExampleStack(app, stackName);
