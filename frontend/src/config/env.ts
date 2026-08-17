interface Env {
  readonly apiUrl: string;
  readonly apiInternalUrl: string;
}

const env: Env = {
  // Browser-facing base URL. Behind the production nginx proxy this stays
  // relative ("/api") so requests are same-origin and CORS never enters the
  // picture; point it at the backend's own origin (e.g. http://localhost:4000)
  // only for local dev without nginx in front.
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "/api",

  // Server-only base URL for calls made from Server Components/Route
  // Handlers. These run inside the Docker network and can reach the backend
  // container directly by service name - this value is never sent to the
  // browser, unlike NEXT_PUBLIC_API_URL.
  apiInternalUrl: process.env.API_INTERNAL_URL ?? "http://localhost:4000",
};

export default env;
