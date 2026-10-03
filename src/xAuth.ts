export interface XProfile {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

const PROFILE_KEY = 'agent-arena-x-profile-v1';
const TOKEN_KEY = 'agent-arena-x-access-token-v1';
const STATE_KEY = 'agent-arena-x-oauth-state-v1';
const VERIFIER_KEY = 'agent-arena-x-pkce-verifier-v1';

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function redirectUri() {
  return import.meta.env.VITE_X_REDIRECT_URI || `${window.location.origin}${window.location.pathname}`;
}

export function readXProfile(): XProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) as XProfile : null;
  } catch {
    return null;
  }
}

export function beginXConnection() {
  const clientId = import.meta.env.VITE_X_CLIENT_ID?.trim();
  if (!clientId) return { ok: false as const, reason: 'missing-client-id' as const };

  const state = randomToken(32);
  const verifier = randomToken(48);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then((digest) => {
    const url = new URL('https://x.com/i/oauth2/authorize');
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri(),
      scope: 'users.read',
      state,
      code_challenge: base64Url(new Uint8Array(digest)),
      code_challenge_method: 'S256',
    }).toString();
    window.location.assign(url.toString());
    return { ok: true as const };
  });
}

export async function completeXConnection(): Promise<{ profile: XProfile | null; error: string | null; handled: boolean }> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const oauthError = params.get('error_description') || params.get('error');
  if (!code && !oauthError) return { profile: readXProfile(), error: null, handled: false };

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

  if (oauthError) return { profile: null, error: 'The X sign-in request was not completed.', handled: true };
  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !verifier) {
    return { profile: null, error: 'X sign-in could not be verified. Please try again.', handled: true };
  }

  try {
    const clientId = import.meta.env.VITE_X_CLIENT_ID?.trim();
    if (!clientId) throw new Error('The X Client ID is not configured.');
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
        client_id: clientId,
      }),
    });
    if (!tokenResponse.ok) throw new Error('Could not retrieve the X access token. Check your callback URL and OAuth settings.');
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error('The X access token response is incomplete.');

    const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) throw new Error('Could not read your X profile. Enable the users.read permission in your app.');
    const profileData = await profileResponse.json() as { data?: XProfile };
    if (!profileData.data?.id || !profileData.data.username) throw new Error('The X profile response is invalid.');
    sessionStorage.setItem(TOKEN_KEY, tokenData.access_token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profileData.data));
    return { profile: profileData.data, error: null, handled: true };
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    return { profile: null, error: error instanceof Error ? error.message : 'Could not connect to X.', handled: true };
  }
}

export function disconnectX() {
  sessionStorage.removeItem(PROFILE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
