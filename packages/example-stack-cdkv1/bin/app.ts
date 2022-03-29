#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {GitHubNotifierCdkConstructV1} from '../lib/GitHubNotifierCdkConstructV1';

const app = new cdk.App();
new GitHubNotifierCdkConstructV1(app, 'GitHubNotifierCdkConstructV1', {
    env: {account: '176218606710', region: 'us-east-1'},
});
