export const OAUTH_TOKEN_ENDPOINT = "https://login.live.com/oauth20_token.srf";
export const OAUTH_AUTHORIZATION_ENDPOINT =
  "https://login.live.com/oauth20_authorize.srf";
export const OAUTH_DEVICE_AUTHORIZATION_ENDPOINT =
  "https://login.live.com/oauth20_connect.srf";

export const OAUTH_REDIRECT_URI = "https://login.live.com/oauth20_desktop.srf";
export const OAUTH_CLIENT_ID = "00000000402b5328";
export const OAUTH_SCOPE = "XboxLive.signin offline_access";

export const XBL_ENDPOINT = "https://user.auth.xboxlive.com/user/authenticate";
export const XSTS_ENDPOINT = "https://xsts.auth.xboxlive.com/xsts/authorize";
export const MINECRAFT_XBOX_LOGIN_ENDPOINT =
  "https://api.minecraftservices.com/authentication/login_with_xbox";

// https://github.com/PrismarineJS/prismarine-auth/blob/bca4a9238414d25f08de21bc656b8b9d1bddce7a/src/common/Constants.js
export const XBOX_LIVE_ERRORS: Record<string, string> = {
  2148916227:
    "Your account was banned by Xbox for violating one or more Community Standards for Xbox and is unable to be used.",
  2148916229:
    "Your account is currently restricted and your guardian has not given you permission to play online. Login to https://account.microsoft.com/family/ and have your guardian change your permissions.",
  2148916233:
    "Your account currently does not have an Xbox profile. Please create one at https://signup.live.com/signup",
  2148916234:
    "Your account has not accepted Xbox's Terms of Service. Please login and accept them.",
  2148916235:
    "Your account resides in a region that Xbox has not authorized use from. Xbox has blocked your attempt at logging in.",
  2148916236:
    "Your account requires proof of age. Please login to https://login.live.com/login.srf and provide proof of age.",
  2148916237:
    "Your account has reached the its limit for playtime. Your account has been blocked from logging in.",
  2148916238:
    "The account date of birth is under 18 years and cannot proceed unless the account is added to a family by an adult.",
};
