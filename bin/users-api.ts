#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { UsersApiStack } from "../lib/users-api-stack";
import { DynamoDBStack } from "../lib/dynamo-db-stack";

const app = new cdk.App();

const dynamodbStack = new DynamoDBStack(app, "DynamoDBStack", {});
const userApiStack = new UsersApiStack(app, "UsersApiStack", {dynamodbStack});
userApiStack.addDependency(dynamodbStack);
