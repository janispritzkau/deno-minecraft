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
export declare class OAuthClient {
  constructor(options: OAuthClientConfig);

  get redirectUri(): string;

  /** Builds the URI to which the user will be redirected to perform the authorization. */
  buildAuthorizationUri(): string;

  /**
   * Parses and validates the authorization response URI, and returns the authorization code.
   *
   * Returns `null`, if the URI doesn't match the specified redirect URI.
   */
  parseAuthorizationResponse(uri: string): AuthorizationResponse | null;

  /** Requests an access token using the authorization code. */
  requestAccessToken(code: string): Promise<OAuthToken>;

  /** Initiates the authorization code flow. */
  requestDeviceAuthorization(): Promise<DeviceCodeVerificationRequest>;

  /**
   * Requests an access token using a given device code.
   *
   * Returns `null`, if the authorization is pending.
   */
  requestDeviceAccessToken(deviceCode: string): Promise<OAuthToken | null>;

  /** Refreshes an access token using the refresh token. */
  refreshAccessToken(refreshToken: string): Promise<OAuthToken>;
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
