// /photos/<filters…> (e.g. /photos/varsity/17/2026-10-13-williamsport) all render the one photos page;
// app.js reads the filters from the path. Images under /photos/full and /photos/thumb skip this (see site/_routes.json).
export const onRequest = ({ request, env }) => env.ASSETS.fetch(new Request(new URL("/photos", request.url), request));
