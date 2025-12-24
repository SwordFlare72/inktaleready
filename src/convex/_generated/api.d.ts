/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as chapters from "../chapters.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as fileQueries from "../fileQueries.js";
import type * as files from "../files.js";
import type * as googleAuth from "../googleAuth.js";
import type * as googleOAuth from "../googleOAuth.js";
import type * as groupChats from "../groupChats.js";
import type * as http from "../http.js";
import type * as imageModeration from "../imageModeration.js";
import type * as library from "../library.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as otp from "../otp.js";
import type * as readingProgress from "../readingProgress.js";
import type * as reports from "../reports.js";
import type * as seedDemo from "../seedDemo.js";
import type * as sendEmails from "../sendEmails.js";
import type * as stories from "../stories.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  announcements: typeof announcements;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  chapters: typeof chapters;
  comments: typeof comments;
  crons: typeof crons;
  fileQueries: typeof fileQueries;
  files: typeof files;
  googleAuth: typeof googleAuth;
  googleOAuth: typeof googleOAuth;
  groupChats: typeof groupChats;
  http: typeof http;
  imageModeration: typeof imageModeration;
  library: typeof library;
  messages: typeof messages;
  notifications: typeof notifications;
  otp: typeof otp;
  readingProgress: typeof readingProgress;
  reports: typeof reports;
  seedDemo: typeof seedDemo;
  sendEmails: typeof sendEmails;
  stories: typeof stories;
  users: typeof users;
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

export declare const components: {};
