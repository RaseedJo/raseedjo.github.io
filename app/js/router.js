// Hash-based routing (e.g. /app/#/orders/123), so refreshing any page works
// on GitHub Pages without a server.

const routes = [];

/**
 * Register a route. `path` can contain parameters, e.g. "/orders/:id".
 * Options: { public: true } doesn't need a login, { guestOnly: true } is only
 * for logged-out visitors, { action } runs instead of showing a view.
 */
export function addRoute(path, options) {
  const keys = [];
  const pattern = new RegExp(`^${path.replace(/\/:(\w+)/g, (_, key) => { keys.push(key); return "/([^/]+)"; })}$`);
  routes.push({ path, pattern, keys, ...options });
}

/** Current location, e.g. { path: "/orders", query: URLSearchParams } */
export function currentLocation() {
  const hash = window.location.hash.replace(/^#/, "");
  const [rawPath, rawQuery = ""] = hash.split("?");
  const path = `/${rawPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return { path, query: new URLSearchParams(rawQuery) };
}

export function matchRoute(path) {
  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (match) {
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

/** Go to a route. `replace` swaps the current history entry (used for redirects). */
export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (replace) {
    window.history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = path;
  }
}

export function onRouteChange(handler) {
  window.addEventListener("hashchange", handler);
}
