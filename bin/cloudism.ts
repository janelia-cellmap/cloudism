#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpenDataBucketStack } from '../lib/openDataBucketStack';
import { CellmapDB } from '../lib/datasetsDBStack';
const app = new cdk.App();
new CellmapDB(app, 'OpenDataBucketStack', {
});