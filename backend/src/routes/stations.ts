import { Hono } from 'hono';
import { searchStations } from '../services/stations.service.js';

export const stationsRouter = new Hono();

// GET /api/v1/stations/search?q=QUERY
stationsRouter.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const cleanQuery = query.trim();

  // Performance rule: do not search when query is too short (< 2 characters)
  if (cleanQuery.length < 2) {
    return c.json(
      {
        success: true,
        data: [],
      },
      200
    );
  }

  const results = await searchStations(cleanQuery);

  return c.json(
    {
      success: true,
      data: results,
    },
    200
  );
});
