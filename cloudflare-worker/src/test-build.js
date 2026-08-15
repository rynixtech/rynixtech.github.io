import { Hono } from 'hono';
import * as admin from 'firebase-admin';

// Initialize firebase admin to see if it compiles
const app = new Hono();

app.get('/test', (c) => {
  return c.json({ adminKeys: Object.keys(admin) });
});

export default app;
