/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_embeddings from "../actions/embeddings.js";
import type * as functions_chunking from "../functions/chunking.js";
import type * as functions_documents from "../functions/documents.js";
import type * as functions_vectorSearch from "../functions/vectorSearch.js";
import type * as functions_vectorSearchV2 from "../functions/vectorSearchV2.js";
import type * as lib_vectors from "../lib/vectors.js";
import type * as testFunctions from "../testFunctions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/embeddings": typeof actions_embeddings;
  "functions/chunking": typeof functions_chunking;
  "functions/documents": typeof functions_documents;
  "functions/vectorSearch": typeof functions_vectorSearch;
  "functions/vectorSearchV2": typeof functions_vectorSearchV2;
  "lib/vectors": typeof lib_vectors;
  testFunctions: typeof testFunctions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
