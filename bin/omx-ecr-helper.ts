#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ContainerPullerStack } from '../lib/container-puller-stack';
import { ContainerBuilderStack } from '../lib/container-builder-stack';

import * as fs from 'fs';

// dynamically load app-config.json
// this is an alternative to the following which works if config is static and/or
// can be commited with the code base:
// import * as config from '../app-config.json';
// this is simple for now, but if config gets more complex consider using node-config instead
const app_config = process.env.CDK_APP_CONFIG || 'app-config.json';
let source_uris: string[] = [];
let source_aws_accounts: string[] = [];
let allow_cross_region_pull: boolean = false;
try {
  const config = JSON.parse(fs.readFileSync(app_config, 'utf8'));
  console.log('configuration loaded: ' + app_config);

  const has_container_puller_config = config.hasOwnProperty('container_puller');
  const has_container_builder_config = config.hasOwnProperty('container_builder');

  if (has_container_puller_config) {
    console.log('container puller config: ' + has_container_puller_config);
    source_aws_accounts = config.container_puller.source_aws_accounts;

    allow_cross_region_pull = config.container_puller.hasOwnProperty('allow_cross_region_pull') ? config.container_puller.allow_cross_region_pull : allow_cross_region_pull;
  }

  if (has_container_builder_config) {
    console.log('container builder config: ' + has_container_builder_config)
    source_uris = config.container_builder.source_uris;
  }

} catch (error) {
  console.log('no configuration file provided. using defaults.')
}

const app = new cdk.App();
new ContainerPullerStack(app, 'OmxEcrHelper-ContainerPuller', {
  // this stack is region specific
  // users must deploy it on a per region basis
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION 
  },

  // additional aws accounts that ecr private container images can be retrieved from
  source_aws_accounts: source_aws_accounts,
  allow_cross_region_pull: allow_cross_region_pull

});

new ContainerBuilderStack(app, 'OmxEcrHelper-ContainerBuilder', {
  // this stack is region specific
  // users must deploy it on a per region basis
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION 
  },

  // bucket names where container source bundles would come from
  source_uris: source_uris

});