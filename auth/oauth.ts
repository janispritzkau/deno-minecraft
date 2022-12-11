import * as json from "../_utils/json.ts";

/** Configuration for the {@linkcode OAuthClient} */
export interface OAuthClientConfig {
  tokenEndpoint: string;
  authorizationEndpoint?: string | undefined;
  deviceAuthorizationEndpoint?: string;
  redirectUri?: string | undefined;
  clientId: string;
  scope: string;
}

/** A simple OAuth client that supports public clients (without client secret). */
export class OAuthClient {
  #options: OAuthClientConfig;

  constructor(options: OAuthClientConfig) {
    this.#options = Object.freeze(options);
  }

  get redirectUri(): string {
    if (!this.#options.redirectUri) {
      throw new Error("No redirect uri specified");
    }
    return this.#options.redirectUri;
  }

  /** Builds the URI to which the user will be redirected to perform the authorization. */
  buildAuthorizationUri(): string {
    if (!this.#options.authorizationEndpoint || !this.#options.redirectUri) {
      throw new Error("No authorization endpoint or redirect uri specified");
    }
    return `${this.#options.authorizationEndpoint}?${new URLSearchParams({
      client_id: this.#options.clientId,
      redirect_uri: this.#options.redirectUri,
      response_type: "code",
      scope: this.#options.scope,
    })}`;
  }

  /**
   * Parses and validates the authorization response URI, and returns the authorization code.
   *
   * Returns `null`, if the URI doesn't match the specified redirect URI.
   */
  parseAuthorizationResponse(uri: string): AuthorizationResponse | null {
    const url = new URL(uri);

    if (`${url.origin}${url.pathname}` != this.redirectUri) return null;

    const error = url.searchParams.get("error");
    if (error != null) {
      throw new Error(`Authentication failed (error code: ${error})`);
    }

    const code = url.searchParams.get("code");
    if (code == null) throw new Error("Authorization code missing");

    return { code };
  }

  /** Requests an access token using the authorization code. */
  async requestAccessToken(code: string): Promise<OAuthToken> {
    if (!this.#options.redirectUri) {
      throw new Error("No redirect uri specified");
    }

    const response = await fetch(this.#options.tokenEndpoint, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.#options.clientId,
        redirect_uri: this.#options.redirectUri,
        code: code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (http status code ${response.status})`);
    }

    return mapTokenResponse(await response.json());
  }

  /** Initiates the authorization code flow. */
  async requestDeviceAuthorization(): Promise<DeviceCodeVerificationRequest> {
    if (!this.#options.deviceAuthorizationEndpoint) {
      throw new Error("No device authorization endpoint specified");
    }

    const response = await fetch(this.#options.deviceAuthorizationEndpoint, {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.#options.clientId,
        response_type: "device_code",
        scope: this.#options.scope,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (http status code ${response.status})`);
    }

    const body = json.asObject(await response.json());

    return {
      deviceCode: json.asString(body["device_code"]),
      userCode: json.asString(body["user_code"]),
      verificationUri: json.asString(body["verification_uri"]),
      expiresAt: Date.now() + json.asNumber(body["expires_in"]) * 1000,
      interval: json.asNumber(body["interval"]) * 1000,
    };
  }

  /**
   * Requests an access token using a given device code.
   *
   * Returns `null`, if the authorization is pending.
   */
  async requestDeviceAccessToken(deviceCode: string): Promise<OAuthToken | null> {
    const response = await fetch(this.#options.tokenEndpoint, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: this.#options.clientId,
        device_code: deviceCode,
      }),
    });

    if (response.status == 400) {
      const body = json.asObject(await response.json());
      const error = json.asString(body["error"]);
      if (error == "authorization_pending") return null;
    }

    if (!response.ok) {
      throw new Error(`Request failed (http status code ${response.status})`);
    }

    return mapTokenResponse(await response.json());
  }

  /** Refreshes an access token using the refresh token. */
  async refreshAccessToken(refreshToken: string): Promise<OAuthToken> {
    const response = await fetch(this.#options.tokenEndpoint, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.#options.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (http status code ${response.status})`);
    }

    return mapTokenResponse(await response.json());
  }
}

function mapTokenResponse(body: unknown): OAuthToken {
  json.assertIsObject(body);
  return {
    accessToken: json.asString(body["access_token"]),
    refreshToken: json.asString(body["refresh_token"]),
    expiresAt: Date.now() + json.asNumber(body["expires_in"]) * 1000,
  };
}

export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp in milliseconds when the access token expires. */
  expiresAt: number;
}

export interface AuthorizationResponse {
  /** The authorization code used to request the access token. */
  code: string;
}

export interface DeviceCodeVerificationRequest {
  /** The code used for requesting the access token. */
  deviceCode: string;
  /** The code the user needs to enter. */
  userCode: string;
  /** The URI the user has to visit. */
  verificationUri: string;
  /** Unix timestamp in milliseconds when the device code and user code expires. */
  expiresAt: number;
  /** Token request interval in milliseconds. */
  interval: number;
}
