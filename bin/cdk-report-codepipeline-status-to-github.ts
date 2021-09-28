#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {ExampleStack} from '../lib/example-stack';

const app = new cdk.App();
new ExampleStack(app, 'ExampleStack-ReportCodepipelineStatusToGithubStack', {
    env: {account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION},
});
