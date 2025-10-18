# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


# 3. Project 3 : Users API - DynamoDB + API Gateway + Lambda Stack

## DynamoDB Overview

Amazon DynamoDB is a fully managed NoSQL database service provided by AWS that offers seamless scalability and high performance for applications requiring consistent, single-digit millisecond latency at any scale. It's designed to handle massive workloads and automatically scales up or down based on your application's needs without requiring manual intervention. DynamoDB supports both document and key-value data models, making it versatile for various use cases from gaming and mobile applications to IoT and web applications. The service provides built-in security, backup and restore capabilities, and in-memory caching with DynamoDB Accelerator (DAX) for microsecond performance.

**Cost Structure**

DynamoDB pricing is based on two primary models: **On-Demand** and **Provisioned** capacity. With **On-Demand** pricing, you pay only for the data you read and write, with no capacity planning required - costs are $1.25 per million write request units and $0.25 per million read request units. **Provisioned** capacity requires you to specify read and write capacity units in advance, with costs of $0.00065 per write capacity unit-hour and $0.00013 per read capacity unit-hour. Storage costs $0.25 per GB-month for the first 25TB, with additional storage tiers offering reduced rates. DynamoDB also charges for data transfer out of AWS regions ($0.09 per GB for the first 10TB), backup storage ($0.10 per GB-month for continuous backups), and point-in-time recovery ($0.20 per GB-month). The service includes 25GB of storage and 25 write/read capacity units free tier per month for the first 12 months, making it cost-effective for development and small applications.

## Create a Project

- On the desktop, create the project `users-api`, open it, and run `npx cdk init`. Pick "app" and run the command.
- run `npm i esbuild @faker-js/faker uuid @types/uuid @types/aws-lambda @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`

### Library Explanations

- **@faker-js/faker**: Generates realistic fake data for testing and development purposes, including names, addresses, emails, and other user information. It's essential for creating mock data to populate our users API with sample records.

- **uuid**: Creates universally unique identifiers (UUIDs) that are guaranteed to be unique across distributed systems. It's used to generate unique IDs for each user record in our DynamoDB database.

- **@types/uuid**: Provides TypeScript type definitions for the uuid library, enabling better IntelliSense and type checking when working with UUIDs in TypeScript code.

- **@types/aws-lambda**: Contains TypeScript type definitions for AWS Lambda functions, including event types, context objects, and callback functions. It ensures type safety when developing Lambda functions for our API.

- **@aws-sdk/client-dynamodb**: The core AWS SDK v3 client for DynamoDB that provides low-level access to DynamoDB operations like PutItem, GetItem, Query, and Scan. It handles the direct communication with DynamoDB service.

- **@aws-sdk/lib-dynamodb**: A higher-level library that simplifies DynamoDB operations by automatically handling data marshalling and unmarshalling between JavaScript objects and DynamoDB's AttributeValue format. It makes working with DynamoDB much more developer-friendly by allowing you to work with plain JavaScript objects instead of complex AttributeValue structures.

## API Structure

- create `src/lambda/handler.ts`

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    // Handle /users path operations
    if (path === '/users') {
      switch (method) {
        case 'GET':
          return getAllUsers(event);
        case 'POST':
          return createUser(event);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Unsupported HTTP method for /users path' }),
          };
      }
    }

    // Handle /users/{id} path operations
    if (path.startsWith('/users/')) {
      const userId = path.split('/users/')[1];
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'User ID is required' }),
        };
      }

      switch (method) {
        case 'GET':
          return getUser(userId);
        case 'PUT':
          return updateUser(event, userId);
        case 'DELETE':
          return deleteUser(userId);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Unsupported HTTP method for user operations' }),
          };
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not Found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

async function createUser(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  // const { name, email } = JSON.parse(event.body as string);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'create user' }),
  };
}

async function getAllUsers(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'fetch all users' }),
  };
}

async function getUser(userId: string): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'fetch single user' }),
  };
}

async function updateUser(event: APIGatewayProxyEventV2, userId: string): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'update user' }),
  };
}

async function deleteUser(userId: string): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'delete user' }),
  };
}
```

`stack.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigateway_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class UsersApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a single Lambda function for all operations
    const userHandler = new NodejsFunction(this, 'UserHandler', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../src/lambda/handler.ts'),
      handler: 'handler',
      functionName: `${this.stackName}-user-handler`,
    });

    const httpApi = new apigateway.HttpApi(this, 'UserApi', {
      apiName: 'User API',
      description: 'User Management API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
      },
    });

    // Define routes configuration
    const routes = [
      { path: '/users', method: apigateway.HttpMethod.GET, name: 'GetAllUsers' },
      { path: '/users', method: apigateway.HttpMethod.POST, name: 'CreateUser' },
      { path: '/users/{id}', method: apigateway.HttpMethod.GET, name: 'GetUser' },
      { path: '/users/{id}', method: apigateway.HttpMethod.PUT, name: 'UpdateUser' },
      { path: '/users/{id}', method: apigateway.HttpMethod.DELETE, name: 'DeleteUser' },
    ];

    // Add all routes
    routes.forEach(({ path, method, name }) => {
      httpApi.addRoutes({
        path,
        methods: [method],
        integration: new apigateway_integrations.HttpLambdaIntegration(`${name}Integration`, userHandler),
      });
    });

    // Output the API URL
    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url ?? '',
      description: 'HTTP API URL',
    });
  }
}
```

- run `npx cdk deploy`

- create `makeRequests.http`

```ts


@URL = https://5g5nfth0pf.execute-api.eu-north-1.amazonaws.com/


### Get all users
GET {{URL}}/users

### Create a user
POST {{URL}}/users
Content-Type: application/json

{
    "name": "coding addict"
}

### Get a user
GET {{URL}}/users/1

### Update a user
PUT {{URL}}/users/1
Content-Type: application/json

{
    "name": "coding addict",
    "email": "coding@addict.com"
}

### Delete a user
DELETE {{URL}}/users/1

```

## DynamoDB

- create `lib/dynamodb-stack.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: `${this.stackName}-users-table`,
    });
  }
}
```

- **`partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }`**: Defines the primary key for the table where `id` is the partition key field and it stores string values. This is the main identifier for each user record and determines how data is distributed across DynamoDB's partitions.

**Primary Key**: A unique identifier that ensures no two items in the table can have the same value.

- **`billingMode: dynamodb.BillingMode.PAY_PER_REQUEST`**: Sets the table to use on-demand billing, meaning you only pay for the actual read/write operations performed rather than provisioning capacity in advance. This is cost-effective for variable workloads.

- **`removalPolicy: cdk.RemovalPolicy.DESTROY`**: Specifies that when the CDK stack is destroyed, the DynamoDB table should be completely deleted along with all its data. This is useful for development environments but should be used cautiously in production.

- **`tableName: \`${this.stackName}-users-table\``**: Creates a unique table name by combining the stack name with "users-table", ensuring the table has a predictable and unique identifier across different deployments.

A **partition** in DynamoDB is like a storage container that holds multiple user records. Think of it as a filing cabinet drawer where you store related files. DynamoDB uses a hash function on your partition key to decide which "drawer" (partition) should store each user. Using `id` as the partition key makes perfect sense because: 1) Each user has a unique ID, so data gets distributed evenly across partitions, 2) Most API operations are "get user by ID" or "update user by ID", which become lightning-fast since DynamoDB knows exactly which partition to look in, and 3) It's simple and predictable - no complex query patterns needed. When you query for a specific user ID, DynamoDB instantly knows which partition contains that user and retrieves it in milliseconds.

`bin/user-api.ts`

```ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { UsersApiStack } from '../lib/users-api-stack';

const app = new cdk.App();

// Create DynamoDB stack
const dynamodbStack = new DynamoDBStack(app, 'DynamoDBStack');

// Create Lambda stack with table name
const userApiStack = new UsersApiStack(app, 'UsersApiStack', { dynamodbStack });

userApiStack.addDependency(dynamodbStack);
```

`stack.ts`

```ts
import { DynamoDBStack } from './dynamodb-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface UsersApiStackProps extends cdk.StackProps {
  dynamodbStack: DynamoDBStack;
}

export class UsersApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: UsersApiStackProps) {
    super(scope, id, props);

    // Create a single Lambda function for all operations
    const userHandler = new NodejsFunction(this, 'UserHandler', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../src/lambda/handler.ts'),
      handler: 'handler',
      functionName: `${this.stackName}-user-handler`,
      environment: {
        TABLE_NAME: props.dynamodbStack.usersTable.tableName,
      },
    });

    // Grant the Lambda function access to the DynamoDB table
    props.dynamodbStack.usersTable.grantReadWriteData(userHandler);
  }
}
```

`handler.ts`

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    // Handle /users path operations
    if (path === '/users') {
      switch (method) {
        case 'GET':
          return getAllUsers(event);
        case 'POST':
          return createUser(event);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Unsupported HTTP method for /users path' }),
          };
      }
    }

    // Handle /users/{id} path operations
    if (path.startsWith('/users/')) {
      const userId = path.split('/users/')[1];
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'User ID is required' }),
        };
      }

      switch (method) {
        case 'GET':
          return getUser(userId);
        case 'PUT':
          return updateUser(event, userId);
        case 'DELETE':
          return deleteUser(userId);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Unsupported HTTP method for user operations' }),
          };
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not Found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

async function createUser(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  // const { name, email } = JSON.parse(event.body as string);
  const userId = uuidv4();

  const user = {
    id: userId,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: new Date().toISOString(),
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
    })
  );

  return {
    statusCode: 201,
    body: JSON.stringify(user),
  };
}

async function getUser(userId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: userId },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'User not found' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
}

async function getAllUsers(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items || []),
  };
}

async function updateUser(event: APIGatewayProxyEventV2, userId: string): Promise<APIGatewayProxyResultV2> {
  const { name, email } = JSON.parse(event.body!);

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: userId },
      UpdateExpression: 'SET #name = :name, #email = :email',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#email': 'email',
      },
      ExpressionAttributeValues: {
        ':name': name || null,
        ':email': email || null,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.Attributes),
  };
}

async function deleteUser(userId: string): Promise<APIGatewayProxyResultV2> {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: userId },
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'user deleted' }),
  };
}
```

## UpdateCommand Explanation

This code updates a user record in DynamoDB using the `UpdateCommand`. Here's how it works:

### 1. **Command Structure**

```typescript
new UpdateCommand({
  TableName: TABLE_NAME, // Which DynamoDB table to update
  Key: { id: userId }, // Which record to update (primary key)
  UpdateExpression: 'SET #name = :name, #email = :email', // What to change
  ExpressionAttributeNames: {
    // Placeholder names for attributes
    '#name': 'name',
    '#email': 'email',
  },
  ExpressionAttributeValues: {
    // Actual values to set
    ':name': name || null,
    ':email': email || null,
  },
  ReturnValues: 'ALL_NEW', // Return the updated record
});
```

### 2. **Key Components**

- **`TableName`**: Specifies which DynamoDB table to update
- **`Key`**: Identifies the specific record using the primary key (`id`)
- **`UpdateExpression`**: DynamoDB's way of specifying what to change
  - `SET` means "set these values"
  - `#name = :name` means "set the name attribute to the name value"

### 3. **Expression Attributes**

- **`ExpressionAttributeNames`**: Maps placeholders to actual attribute names
  - `#name` → `name`
  - `#email` → `email`
- **`ExpressionAttributeValues`**: Maps placeholders to actual values
  - `:name` → the name from the request body
  - `:email` → the email from the request body

### 4. **Why Use Placeholders?**

This prevents **injection attacks** and handles **reserved words**:

```typescript
// ❌ Bad - vulnerable to injection
UpdateExpression: `SET name = '${name}', email = '${email}'`;

// ✅ Good - safe with placeholders
UpdateExpression: 'SET #name = :name, #email = :email';
```

### 5. **ReturnValues: 'ALL_NEW'**

Returns the complete updated record after the update, so you can confirm what was changed.

### 6. **Null Handling**

```typescript
':name': name || null,
':email': email || null,
```

If no value is provided, it sets the field to `null` instead of leaving it unchanged.

This is a secure, efficient way to update specific fields in a DynamoDB record while preventing injection attacks and handling edge cases properly.

## Front-End App

- explore front-end app
- spin up the local dev instance
- deploy to Netlify
- change 'allowOrigins', don't forget about removing trailing '/'

# Project 4 - Product Management Stack

**Services Used:**

- API Gateway
- Lambda
- DynamoDB
- S3

## Setup

- create folder `product-management`
- inside of it run `cdk init app --language=typescript`
- remove existing git repository `rm -rf .git`
- copy contents of README
- run `npm i esbuild @types/aws-lambda @aws-sdk/client-dynamodb @aws-sdk/client-s3 @aws-sdk/lib-dynamodb @types/uuid uuid`

**Libraries Used:**

- **esbuild**: Fast JavaScript/TypeScript bundler for Lambda deployment
- **@types/aws-lambda**: TypeScript type definitions for AWS Lambda
- **@aws-sdk/client-dynamodb**: AWS SDK for DynamoDB operations
- **@aws-sdk/client-s3**: AWS SDK for S3 operations
- **@aws-sdk/lib-dynamodb**: Utility library for easier DynamoDB operations
- **@types/uuid**: TypeScript type definitions for UUID generation
- **uuid**: Library for generating unique identifiers

## Lambdas

- create `src/lambda/products`
  - `createProduct.ts`
  - `getAllProducts.ts`
  - `deleteProduct.ts`

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event: ', event);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'create product' }),
  };
};
```

- repeat for all Lambdas

## Stack

`product-management-stack.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaRuntime from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class ProductManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create DynamoDB table for products
    const productsTable = new dynamodb.Table(this, `${this.stackName}-Products-Table`, {
      tableName: `${this.stackName}-Products-Table`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change to RETAIN for production
    });

    // Create S3 bucket for product images
    const productImagesBucket = new s3.Bucket(this, `${this.stackName}-Product-Images-Bucket`, {
      // needs to be lowercase
      bucketName: `${this.stackName.toLowerCase()}-images`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // For development - change to RETAIN for production
    });

    // Create Lambda functions for products
    const createProductLambda = new NodejsFunction(this, `${this.stackName}-create-product-lambda`, {
      runtime: lambdaRuntime.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/products/createProduct.ts'),
      functionName: `${this.stackName}-create-product-lambda`,
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        PRODUCT_IMAGES_BUCKET_NAME: productImagesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(60),
    });

    const getAllProductsLambda = new NodejsFunction(this, `${this.stackName}-get-all-products-lambda`, {
      runtime: lambdaRuntime.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/products/getAllProducts.ts'),
      functionName: `${this.stackName}-get-all-products-lambda`,
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
      },
    });

    const deleteProductLambda = new NodejsFunction(this, `${this.stackName}-delete-product-lambda`, {
      runtime: lambdaRuntime.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/products/deleteProduct.ts'),
      functionName: `${this.stackName}-delete-product-lambda`,
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        PRODUCT_IMAGES_BUCKET_NAME: productImagesBucket.bucketName,
      },
    });

    // Grant permissions to Lambda functions
    productsTable.grantWriteData(createProductLambda);
    productsTable.grantReadData(getAllProductsLambda);
    productsTable.grantReadWriteData(deleteProductLambda);

    // Grant S3 permissions
    productImagesBucket.grantWrite(createProductLambda);
    productImagesBucket.grantWrite(deleteProductLambda);

    // Create API Gateway V2
    const api = new apigatewayv2.HttpApi(this, `${this.stackName}-Api`, {
      apiName: `${this.stackName}-Api`,
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    // Add the products routes
    api.addRoutes({
      path: '/products',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration('CreateProductIntegration', createProductLambda),
    });

    api.addRoutes({
      path: '/products',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration('GetAllProductsIntegration', getAllProductsLambda),
    });

    api.addRoutes({
      path: '/products/{id}',
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration('DeleteProductIntegration', deleteProductLambda),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url!,
      description: 'API Gateway URL for the products API',
      exportName: `${this.stackName}-ApiGatewayUrl`,
    });

    new cdk.CfnOutput(this, 'ProductsTableName', {
      value: productsTable.tableName,
      description: 'DynamoDB table name for products',
      exportName: `${this.stackName}-Products-TableName`,
    });

    new cdk.CfnOutput(this, 'ProductImagesBucketName', {
      value: productImagesBucket.bucketName,
      description: 'S3 bucket name for product images',
      exportName: `${this.stackName}-Product-Images-BucketName`,
    });
  }
}
```

### Test API

- create `makeRequests.http`

```ts
@URL = https://k83kjpufqf.execute-api.eu-north-1.amazonaws.com

### Create Product
POST {{URL}}/products
Content-Type: application/json

{
    "name": "Product 1"
}

### Get All Products
GET {{URL}}/products

### Delete Product
DELETE {{URL}}/products/1
```

## Types

- create `src/types/product.ts`

```ts
// Product-related interfaces used across Lambda functions

export type Product = {
  name: string;
  description: string;
  price: number;
  imageData: string; // Base64 encoded image data
};

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};
```

## Create Product

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductRecord } from '../../types/product';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

// Environment variables
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME!;
const PRODUCT_IMAGES_BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET_NAME!;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  try {
    // Parse and validate the request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Request body is required',
        }),
      };
    }

    const product: Product = JSON.parse(event.body);

    // Validate required fields
    if (!product.name || !product.description || typeof product.price !== 'number' || !product.imageData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'All fields are required: name, description, price, and image',
        }),
      };
    }

    // Generate unique ID for the product
    const productId = uuidv4();
    const timestamp = new Date().toISOString();

    // Upload image to S3
    let imageUrl: string;
    try {
      console.log('Starting S3 upload process...');
      console.log('Bucket name:', PRODUCT_IMAGES_BUCKET_NAME);

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = product.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Determine file extension from base64 data
      const fileExtension = product.imageData.includes('data:image/jpeg') ? 'jpg' : product.imageData.includes('data:image/png') ? 'png' : product.imageData.includes('data:image/gif') ? 'gif' : 'jpg';

      const s3Key = `products/${productId}.${fileExtension}`;

      console.log('S3 upload parameters:', {
        bucket: PRODUCT_IMAGES_BUCKET_NAME,
        key: s3Key,
        contentType: `image/${fileExtension}`,
        bufferSize: imageBuffer.length,
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: PRODUCT_IMAGES_BUCKET_NAME,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: `image/${fileExtension}`,
        })
      );

      imageUrl = `https://${PRODUCT_IMAGES_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

      console.log('Image uploaded to S3 successfully:', imageUrl);
    } catch (s3Error: any) {
      console.error('Error uploading image to S3:', s3Error);
      console.error('S3 Error details:', {
        message: s3Error.message,
        code: s3Error.code,
        statusCode: s3Error.statusCode,
        requestId: s3Error.requestId,
        bucketName: PRODUCT_IMAGES_BUCKET_NAME,
      });
      console.log('S3 Error:', s3Error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to upload image',
          error: s3Error.message,
        }),
      };
    }

    // Create product record for DynamoDB
    const productRecord: ProductRecord = {
      id: productId,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: imageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Store product in DynamoDB
    try {
      await docClient.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE_NAME,
          Item: productRecord,
        })
      );

      console.log('Product stored in DynamoDB:', productId);
    } catch (dynamoError) {
      console.error('Error storing product in DynamoDB:', dynamoError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to store product',
        }),
      };
    }

    // Return success response
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Product created successfully',
        product: productRecord,
      }),
    };
  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};
```

## AWS Console Test Event

**Note:** The `body` field contains a JSON string (not a JSON object), so quotes inside must be escaped with `\"`.

Since we only use `event.body` in our Lambda functions, we only need to provide the `body` field in our test event. If your Lambda code accesses other properties like `event.path`, `event.headers`, or `event.httpMethod`, you would need to include those fields in your test event as well.

```json
{
  "body": "{\"name\":\"Test Product\",\"description\":\"This is a test product description\",\"price\":29.99,\"imageData\":\"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=\"}"
}
```

- check logs

**Error Response**

```json
{
  "body": "{\"name\":\"Test Product\",\"description\":\"This is a test product description\",\"price\":\"not-a-number\",\"imageData\":\"\"}"
}
```

## Front-End

- open up front-end folder
- provide your backend api url
- decrease the timeout
- test the benefit of logs

## Get All Products

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ProductRecord } from '../../types/product';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  try {
    // Scan DynamoDB table to get all products
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE_NAME,
      })
    );

    const products: ProductRecord[] = (scanResult.Items as ProductRecord[]) || [];

    // Sort products by creation date (newest first)
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`Retrieved ${products.length} products from DynamoDB`);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Error retrieving products:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};
```

- test in aws console and front-end

## Fix

```ts
const productImagesBucket = new s3.Bucket(this, `${this.stackName}-Product-Images-Bucket`, {
  bucketName: `${this.stackName.toLowerCase()}-images`,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls: true,
    blockPublicPolicy: false,
    ignorePublicAcls: true,
    restrictPublicBuckets: false,
  }),
});

// Add bucket policy for fine-grained public access to product images only
productImagesBucket.addToResourcePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
    actions: ['s3:GetObject'],
    resources: [`${productImagesBucket.bucketArn}/products/*`],
  })
);
```

# S3 Bucket Public Access Configuration Explained

```ts
blockPublicAcls: true,
blockPublicPolicy: false,
ignorePublicAcls: true,
restrictPublicBuckets: false,
```

### `blockPublicAcls: true`

- **What it does**: Prevents setting public ACLs (Access Control Lists) on individual objects
- **Why**: ACLs are an older, less secure way to control access. By blocking them, you force all access control through bucket policies (which is more secure)
- **Example**: This prevents someone from uploading an object with a public ACL like `public-read`

### `blockPublicPolicy: false`

- **What it does**: Allows bucket policies to be applied
- **Why**: When `true`, it blocks any bucket policy that grants public access
- **Why we set it to `false`**: We need this to be `false` so our bucket policy can work (the policy that allows public read access to `/products/*`)

### `ignorePublicAcls: true`

- **What it does**: Ignores any public ACLs that might be set on objects
- **Why**: Even if someone somehow sets a public ACL on an object, this setting ignores it and uses the bucket policy instead
- **Security benefit**: Provides an extra layer of protection against accidental public ACLs

### `restrictPublicBuckets: false`

- **What it does**: Allows the bucket policy to grant public access
- **Why**: When `true`, this blocks ALL public access regardless of bucket policies
- **Why we set it to `false`**: We need this to be `false` so our bucket policy can grant public read access to product images

## The Security Strategy

This configuration creates a **defense-in-depth** approach:

1. **Block ACLs** (`blockPublicAcls: true`) - Prevent insecure ACL-based access
2. **Allow policies** (`blockPublicPolicy: false`) - Enable secure bucket policy control
3. **Ignore ACLs** (`ignorePublicAcls: true`) - Extra protection against ACL bypass
4. **Allow public via policy** (`restrictPublicBuckets: false`) - Let our bucket policy work

## Result

- ✅ Bucket is private by default
- ✅ Only objects in `/products/*` are publicly readable (via bucket policy)
- ✅ No public upload/delete access
- ✅ Lambda functions control what gets uploaded
- ✅ Maximum security with minimum public exposure

This is the modern, secure way to handle S3 public access - using bucket policies for fine-grained control rather than ACLs.

This is the CDK way to add bucket policies

### 2. **`new iam.PolicyStatement()`**

- Creates a new IAM policy statement
- Defines permissions: who can do what on which resources

### 3. **`effect: iam.Effect.ALLOW`**

- Explicitly allows the specified actions
- Could be `DENY` to block access instead

### 4. **`principals: [new iam.AnyPrincipal()]`**

- `AnyPrincipal()` means "anyone" (public access)
- Makes the bucket publicly readable
- Could be specific users, roles, or AWS accounts

### 5. **`actions: ['s3:GetObject']`**

- Only allows `GetObject` (read/download files)
- Does NOT allow `PutObject`, `DeleteObject`, etc.
- Users can view images but cannot upload or delete

### 6. **`resources: [`${productImagesBucket.bucketArn}/products/\*`]`**

- `bucketArn` = the bucket's Amazon Resource Name
- `/products/*` = only files in the `products/` folder
- The `*` wildcard means any file in that folder
- **Security**: Only images in `products/` folder are public

`next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'productmanagementstack-images.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

## Delete Product

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ProductRecord } from '../../types/product';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

// Environment variables
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME!;
const PRODUCT_IMAGES_BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET_NAME!;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  try {
    // Get product ID from path parameters
    const productId = event.pathParameters?.id;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Product ID is required',
        }),
      };
    }

    // First, get the product to retrieve the image URL
    let product: ProductRecord;
    try {
      const getResult = await docClient.send(
        new GetCommand({
          TableName: PRODUCTS_TABLE_NAME,
          Key: { id: productId },
        })
      );

      if (!getResult.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: 'Product not found',
          }),
        };
      }

      product = getResult.Item as ProductRecord;
    } catch (dynamoError) {
      console.error('Error retrieving product from DynamoDB:', dynamoError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to retrieve product',
        }),
      };
    }

    // Delete image from S3 if it exists
    if (product.imageUrl) {
      try {
        // Extract S3 key from the URL
        const urlParts = product.imageUrl.split('/');
        const s3Key = urlParts.slice(3).join('/'); // Remove https://bucket-name.s3.amazonaws.com/

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: PRODUCT_IMAGES_BUCKET_NAME,
            Key: s3Key,
          })
        );

        console.log('Image deleted from S3:', s3Key);
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete product from DynamoDB
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: PRODUCTS_TABLE_NAME,
          Key: { id: productId },
        })
      );

      console.log('Product deleted from DynamoDB:', productId);
    } catch (dynamoError) {
      console.error('Error deleting product from DynamoDB:', dynamoError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to delete product',
        }),
      };
    }

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Product deleted successfully',
        productId: productId,
      }),
    };
  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};
```

- aws console test event

```json
{
  "pathParameters": {
    "id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

- first get product id by running `getAllProducts.ts` lambda and provide the value
- run the test two times
- second time you should see the 404 response since we removed the product
- test on front-end

## The End

- optional : destroy the stack `npx cdk destroy`