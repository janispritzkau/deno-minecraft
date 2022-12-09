/**
 * Helper functions for authentication with Microsoft accounts and retrieval of access tokens.
 *
 * @module
 */

import { OAuthClient } from "./oauth.ts";

import {
  OAUTH_AUTHORIZATION_ENDPOINT,
  OAUTH_CLIENT_ID,
  OAUTH_DEVICE_AUTHORIZATION_ENDPOINT,
  OAUTH_REDIRECT_URI,
  OAUTH_SCOPE,
  OAUTH_TOKEN_ENDPOINT,
} from "./_constants.ts";

export * from "./oauth.ts";
export * from "./xbox.ts";

/** A preconfigured OAuth client that uses the client ID and OAuth endpoints of the official Minecraft launcher. */
export const oauthClient: OAuthClient = new OAuthClient({
  tokenEndpoint: OAUTH_TOKEN_ENDPOINT,
  authorizationEndpoint: OAUTH_AUTHORIZATION_ENDPOINT,
  deviceAuthorizationEndpoint: OAUTH_DEVICE_AUTHORIZATION_ENDPOINT,
  redirectUri: OAUTH_REDIRECT_URI,
  clientId: OAUTH_CLIENT_ID,
  scope: OAUTH_SCOPE,
});
