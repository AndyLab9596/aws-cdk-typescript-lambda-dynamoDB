import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigateway_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class UsersApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userHandler = new NodejsFunction(this, "UsersHandler", {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/handler.ts"),
      handler: "handler",
      functionName: `${this.stackName}-user-handler`,
    });

    const httpApi = new apigateway.HttpApi(this, "UsersApi", {
      apiName: "Users API",
      description: "User Management API",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ["*"],
      },
    });

    const routes = [
      {
        path: "/users",
        method: apigateway.HttpMethod.GET,
        name: "GetAllUsers",
      },
      {
        path: "/users",
        method: apigateway.HttpMethod.POST,
        name: "CreateUser",
      },
      {
        path: "/users/{id}",
        method: apigateway.HttpMethod.GET,
        name: "GetUser",
      },
      {
        path: "/users/{id}",
        method: apigateway.HttpMethod.PUT,
        name: "UpdateUser",
      },
      {
        path: "/users/{id}",
        method: apigateway.HttpMethod.DELETE,
        name: "DeleteUser",
      },
    ];

    routes.forEach(({ path, method, name }) => {
      httpApi.addRoutes({
        path,
        methods: [method],
        integration: new apigateway_integrations.HttpLambdaIntegration(
          `${name}Integration`,
          userHandler
        ),
      });
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.url!,
      description: "HTTP API URL",
    });
  }
}
