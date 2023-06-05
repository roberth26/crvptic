import { APIRoute } from '../common';

export function APIURL(...params: ConstructorParameters<typeof window.URL>) {
  const url = new URL(...params);
  return new URL(APIRoute(url.pathname as `/${string}`), url.href);
}
