export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', version: '0.1.0' });
    }

    // TODO: wire up routes for CRUD operations
    return Response.json({ error: 'Not yet implemented' }, { status: 404 });
  },
};

interface Env {
  FORGE_DB: D1Database;
  FORGE_STORAGE: R2Bucket;
}
