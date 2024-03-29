import {
  MINECRAFT_XBOX_LOGIN_ENDPOINT,
  XBL_ENDPOINT,
  XBOX_LIVE_ERRORS,
  XSTS_ENDPOINT,
} from "./_constants.ts";

/** The access token used for accessing Minecraft APIs and joining servers. */
export interface MinecraftAccessToken {
  /** The token used to authenticate and join Minecraft servers. */
  accessToken: string;
  /** Unix timestamp in milliseconds when the access token expires. */
  expiresAt: number;
}

/** Retrieves the Minecraft access token via Xbox Live services using the provided OAuth access token. */
export async function fetchMinecraftAccessToken(
  /** The access token previously obtained from the OAuth client. */
  accessToken: string,
): Promise<MinecraftAccessToken> {
  const xblResponse = await getXboxLiveToken(accessToken);
  const xstsResponse = await getXstsToken(xblResponse.Token);

  const response = await fetch(MINECRAFT_XBOX_LOGIN_ENDPOINT, {
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

  const body = await response.json();
  return {
    accessToken: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}
interface XboxLiveResponse {
  Token: string;
  DisplayClaims: {
    xui: {
      uhs: string;
    }[];
  };
}

async function getXboxLiveToken(oauthToken: string): Promise<XboxLiveResponse> {
  const response = await fetch(XBL_ENDPOINT, {
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
      `Could not get xbox live token (http status code ${response.status})`,
    );
  }

  return response.json();
}

async function getXstsToken(xboxLiveToken: string): Promise<XboxLiveResponse> {
  const response = await fetch(XSTS_ENDPOINT, {
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

  if (response.status == 401) {
    const json = await response.json();
    const message = XBOX_LIVE_ERRORS[json.XErr];
    throw new Error(
      message
        ? `Xbox Live authentication failed: ${message}`
        : `Xbox Live authentication failed (XErr:${json.XErr})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Could not get xsts token (http status code ${response.status})`,
    );
  }

  return response.json();
}
