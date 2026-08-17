// Used by the Dockerfile's HEALTHCHECK instruction. A plain Node script
// avoids depending on curl/wget being present in the runtime image - the
// only guarantee we need is the Node binary already required to run the app.
//
// Checks "/" rather than a dedicated route handler - the frontend has no
// API-like routes of its own (that's the backend's job), so this just
// confirms the Next.js server is up and can render its own homepage.
"use strict";

const http = require("http");

const request = http.request(
  {
    host: "127.0.0.1",
    port: process.env.PORT || 3000,
    path: "/",
    timeout: 2000,
  },
  (res) => {
    process.exit(res.statusCode === 200 ? 0 : 1);
  },
);

request.on("error", () => process.exit(1));
request.on("timeout", () => request.destroy());
request.end();
