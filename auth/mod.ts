/**
 * Helper functions for authentication via Microsoft accounts and retrieving access tokens.
 *
 * OAuth functionality is not included, so you will need to implement it yourself
 * or use third-party OAuth clients.
 *
 * To obtain an access token, use one of the available authentication flows:
 *
 * - [Authorization Code Flow (needs a web server for the redirect)](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
 * - [Device Code Flow (requires the user to visit a URL and enter a code)](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code)
 *
 * @module
 */

const XBOX_AUTH_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MINECRAFT_SERVICES_URL = "https://api.minecraftservices.com";
const MINECRAFT_XBOX_LOGIN_URL =
  `${MINECRAFT_SERVICES_URL}/authentication/login_with_xbox`;

export interface MinecraftToken {
  /** The token used to authenticate and join Minecraft servers. */
  accessToken: string;
  /** Unix timestamp in milliseconds when the access token expires. */
  expiryTime: number;
}

/**
 * Retrieves the Minecraft access token via Xbox Live services using the
 * provided Microsoft OAuth token.
 *
 * The intermediately generated Xbox Live tokens are very short-lived,
 * so there is little point in caching them.
 */
export async function fetchMinecraftToken(
  oauthToken: string,
): Promise<MinecraftToken> {
  const xblResponse = await getXboxLiveToken(oauthToken);
  const xstsResponse = await getXstsToken(xblResponse.Token);

  const response = await fetch(MINECRAFT_XBOX_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${
        xstsResponse.DisplayClaims.xui[0].uhs
      };${xstsResponse.Token}`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not get minecraft token (http status ${response.status})`,
    );
  }

  const loginResponse: MinecraftLoginResponse = await response.json();

  return {
    accessToken: loginResponse.access_token,
    expiryTime: Date.now() + loginResponse.expires_in * 1000,
  };
}

async function getXboxLiveToken(oauthToken: string): Promise<XboxLiveResponse> {
  const response = await fetch(XBOX_AUTH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${oauthToken}`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not get xbox live token (http status ${response.status})`,
    );
  }

  return response.json();
}

async function getXstsToken(xboxLiveToken: string): Promise<XboxLiveResponse> {
  const response = await fetch(XSTS_AUTH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xboxLiveToken],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not get xsts token (http status ${response.status})`,
    );
  }

  return await response.json();
}

interface XboxLiveResponse {
  IssueInstant: string;
  NotAfter: string;
  Token: string;
  DisplayClaims: {
    xui: {
      uhs: string;
    }[];
  };
}

interface MinecraftLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
