#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {GitHubNotifierExampleStack} from '../lib/GitHubNotifierExampleStack';

const app = new cdk.App();
new GitHubNotifierExampleStack(app, 'E2ECodePipelineGitHubStatus');
