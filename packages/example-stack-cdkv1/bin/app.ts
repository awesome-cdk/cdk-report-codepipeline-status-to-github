#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { GitHubNotifierCdkConstructV1 } from "../lib/GitHubNotifierCdkConstructV1";

const app = new App();
new GitHubNotifierCdkConstructV1(app, "GitHubNotifierCdkConstructV1", {
  env: { account: "176218606710", region: "us-east-1" },
});
