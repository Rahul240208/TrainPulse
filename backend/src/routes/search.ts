import { Hono } from 'hono';
import { searchGlobal } from '../services/search.service.js';

export const searchRouter = new Hono();

// GET /api/v1/search?q=QUERY
searchRouter.get('/', async (c) => {
  const query = c.req.query('q') || '';
  const cleanQuery = query.trim();

  // Minimum length check (>= 2 characters) to guard against high load
  if (cleanQuery.length < 2) {
    return c.json(
      {
        success: true,
        data: [],
      },
      200
    );
  }

  const results = await searchGlobal(cleanQuery);

  return c.json(
    {
      success: true,
      data: results,
    },
    200
  );
});

