/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as ai_prompts_generateDescription from "../ai/prompts/generateDescription.js";
import type * as ai_prompts_rewriteBullet from "../ai/prompts/rewriteBullet.js";
import type * as ai_provider from "../ai/provider.js";
import type * as ai_schemas from "../ai/schemas.js";
import type * as aiKeys from "../aiKeys.js";
import type * as auth from "../auth.js";
import type * as contributions from "../contributions.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_slug from "../lib/slug.js";
import type * as model_aiKeys from "../model/aiKeys.js";
import type * as model_portfolio from "../model/portfolio.js";
import type * as model_profiles from "../model/profiles.js";
import type * as model_projects from "../model/projects.js";
import type * as model_snapshots from "../model/snapshots.js";
import type * as model_teams from "../model/teams.js";
import type * as portfolio from "../portfolio.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as resumes from "../resumes.js";
import type * as snapshots from "../snapshots.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  "ai/prompts/generateDescription": typeof ai_prompts_generateDescription;
  "ai/prompts/rewriteBullet": typeof ai_prompts_rewriteBullet;
  "ai/provider": typeof ai_provider;
  "ai/schemas": typeof ai_schemas;
  aiKeys: typeof aiKeys;
  auth: typeof auth;
  contributions: typeof contributions;
  http: typeof http;
  invites: typeof invites;
  "lib/access": typeof lib_access;
  "lib/crypto": typeof lib_crypto;
  "lib/errors": typeof lib_errors;
  "lib/slug": typeof lib_slug;
  "model/aiKeys": typeof model_aiKeys;
  "model/portfolio": typeof model_portfolio;
  "model/profiles": typeof model_profiles;
  "model/projects": typeof model_projects;
  "model/snapshots": typeof model_snapshots;
  "model/teams": typeof model_teams;
  portfolio: typeof portfolio;
  profiles: typeof profiles;
  projects: typeof projects;
  resumes: typeof resumes;
  snapshots: typeof snapshots;
  teams: typeof teams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
