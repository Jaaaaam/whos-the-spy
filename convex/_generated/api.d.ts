/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as game from "../game.js";
import type * as game_constants from "../game/constants.js";
import type * as game_discussion from "../game/discussion.js";
import type * as game_errors from "../game/errors.js";
import type * as game_playAgain from "../game/playAgain.js";
import type * as game_results from "../game/results.js";
import type * as game_reveal from "../game/reveal.js";
import type * as game_startRound from "../game/startRound.js";
import type * as game_types from "../game/types.js";
import type * as game_voting from "../game/voting.js";
import type * as gameRules from "../gameRules.js";
import type * as lib_db from "../lib/db.js";
import type * as lib_shuffle from "../lib/shuffle.js";
import type * as players from "../players.js";
import type * as rooms from "../rooms.js";
import type * as schema_players from "../schema/players.js";
import type * as schema_roleAssignments from "../schema/roleAssignments.js";
import type * as schema_rooms from "../schema/rooms.js";
import type * as schema_rounds from "../schema/rounds.js";
import type * as schema_votes from "../schema/votes.js";
import type * as test_gameTestUtils from "../test/gameTestUtils.js";
import type * as wordPairs from "../wordPairs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  game: typeof game;
  "game/constants": typeof game_constants;
  "game/discussion": typeof game_discussion;
  "game/errors": typeof game_errors;
  "game/playAgain": typeof game_playAgain;
  "game/results": typeof game_results;
  "game/reveal": typeof game_reveal;
  "game/startRound": typeof game_startRound;
  "game/types": typeof game_types;
  "game/voting": typeof game_voting;
  gameRules: typeof gameRules;
  "lib/db": typeof lib_db;
  "lib/shuffle": typeof lib_shuffle;
  players: typeof players;
  rooms: typeof rooms;
  "schema/players": typeof schema_players;
  "schema/roleAssignments": typeof schema_roleAssignments;
  "schema/rooms": typeof schema_rooms;
  "schema/rounds": typeof schema_rounds;
  "schema/votes": typeof schema_votes;
  "test/gameTestUtils": typeof test_gameTestUtils;
  wordPairs: typeof wordPairs;
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
