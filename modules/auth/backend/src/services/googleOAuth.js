import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const GOOGLE_AUTH_SCOPES = ["openid", "profile", "email"];
const GOOGLE_CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.apps\.googleusercontent\.com$/;

export function isValidGoogleClientId(clientId) {
  return typeof clientId === "string" && GOOGLE_CLIENT_ID_PATTERN.test(clientId);
}

function toBase64Url(value) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateGoogleState() {
  return randomBytes(32).toString("hex");
}

export function generateGooglePkcePair() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = toBase64Url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function buildGoogleAuthUrl({ state, codeChallenge }) {
  if (!isValidGoogleClientId(config.GOOGLE_CLIENT_ID) || !config.GOOGLE_CALLBACK_URL) {
    throw new Error("Google OAuth is not configured.");
  }

  const client = new OAuth2Client({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.GOOGLE_CALLBACK_URL
  });

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_AUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });
}

export async function exchangeGoogleAuthorizationCode({ code, codeVerifier, redirectUri = config.GOOGLE_CALLBACK_URL }) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }

  const client = new OAuth2Client({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri
  });

  const { tokens } = await client.getToken({
    code,
    redirect_uri: redirectUri,
    codeVerifier
  });

  if (!tokens.id_token) {
    throw new Error("Google token exchange did not return an ID token.");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Google user payload is missing.");
  }

  if (!payload.sub) {
    throw new Error("Google user identifier is missing.");
  }

  if (payload.aud !== config.GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch.");
  }

  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Unexpected Google issuer.");
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error("Google ID token has expired.");
  }

  if (!payload.email || !payload.email_verified) {
    throw new Error("Google account email verification is required.");
  }

  return {
    payload,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };
}
