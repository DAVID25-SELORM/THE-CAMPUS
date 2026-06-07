const defaultPublicAppUrl = "https://the-campus.vercel.app";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getPublicAppUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL;
  const fallbackUrl = typeof window !== "undefined" ? window.location.origin : defaultPublicAppUrl;

  return trimTrailingSlash(configuredUrl || defaultPublicAppUrl || fallbackUrl);
}

export function getAuthRedirectUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}
