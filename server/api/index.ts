// Vercel serverless entry: the Express app IS the function handler.
// Local dev still uses src/server.ts (app.listen); Vercel ignores that.
import app from "../src/app";

export default app;
