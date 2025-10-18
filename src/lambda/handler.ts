import { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    if (path === "/users") {
      switch (method) {
        case "GET":
          return getAllUsers(event);
        case "POST":
          return createUser(event);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({
              message: "Unsupported HTTP method for /users path",
            }),
          };
      }
    }

    if (path.startsWith("/users/")) {
      const userId = path.split("/users/")[1];

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "User ID is required",
          }),
        };
      }

      switch (method) {
        case "GET":
          return getUser(userId);
        case "PUT":
          return updateUser(event, userId);
        case "DELETE":
          return deleteUser(userId);
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({
              message: "Unsupported HTTP method for users path",
            }),
          };
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Not Found",
      }),
    };
  } catch (error) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};

async function getAllUsers(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "fetch all users" }),
  };
}

async function createUser(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 201,
    body: JSON.stringify({ message: "create user" }),
  };
}

async function getUser(userId: string): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "fetch single user" }),
  };
}

async function updateUser(
  event: APIGatewayProxyEventV2,
  userId: string
): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "update user" }),
  };
}

async function deleteUser(userId: string): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `user deleted: ${userId}` }),
  };
}
