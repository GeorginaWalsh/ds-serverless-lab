// import { Handler } from "aws-lambda";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

import {
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(
  schema.definitions["MovieAndCastMemberQueryParams"] || {}
);

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change
  try {
    console.log("Event: ", event);
    // const parameters = event?.queryStringParameters;
    // const movieId = parameters ? parseInt(parameters.movieId) : undefined;
    const parameters  = event?.pathParameters;
    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }


    const queryParams = event.queryStringParameters;
    if (!queryParams) {
      return {
        
        // statusCode: 500,
        // headers: {
        //   "content-type": "application/json",
        // },
        // body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }
    if (!isValidQueryParams(queryParams)) {
      return {
      //   statusCode: 500,
      //   headers: {
      //     "content-type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     message: `Incorrect type. Must match Query parameters schema`,
      //     schema: schema.definitions["MovieAndCastMemberQueryParams"],
      //   }),
      // };
      } 
    }

    const cast = queryParams;
    let commandInput: QueryCommandInput = {
      TableName: process.env.CAST_TABLE_NAME,
    };
    if ("cast" in queryParams) {
      commandInput = {
        ...commandInput,
        // IndexName: "roleIx",
        KeyConditionExpression: " movieId = :m ",
        ExpressionAttributeValues: {
          ":m": movieId,
          cast: new QueryCommand(commandInput)
        },
      };
      // const additionalCommandOutput = await ddbDocClient.send(
      // new QueryCommand(commandInput)
      // );
    }



    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { movieId: movieId },
      }),
    );

    // const additionalCommandOutput = await ddbDocClient.send(
    //   new QueryCommand(commandInput)
    //   );
    
    console.log("GetCommand response: ", commandOutput);
    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }
    const body = {
      movie: commandOutput.Item,
      // cast: new QueryCommand(commandInput)
      // cast: commandInput
      // cast: additionalCommandOutput
    };

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
