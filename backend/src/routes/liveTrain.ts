import { Hono } from 'hono';
import { config } from '../config.js';
import { validateTrainNumber } from '../schemas/trainNumber.js';
import { stationCodeSchema } from '../schemas/trainsBetween.js';
import { getLiveTrainTelemetry, fetchTrainsBetween } from '../services/railradar.service.js';
import { getTrainCoaches } from '../services/mockData.service.js';

export const liveTrainRouter = new Hono();

// GET /api/v1/trains/between?from=CDG&to=NDLS
liveTrainRouter.get('/between', async (c) => {
  const rawFrom = c.req.query('from');
  const rawTo = c.req.query('to');

  if (!rawFrom || !rawTo || rawFrom.trim() === '' || rawTo.trim() === '') {
    return c.json(
      {
        success: false,
        error: {
          code: 'MISSING_STATION_QUERY',
          message: 'Both departure (from) and destination (to) station codes are required.',
        },
      },
      400
    );
  }

  const fromValidation = stationCodeSchema.safeParse(rawFrom);
  const toValidation = stationCodeSchema.safeParse(rawTo);

  if (!fromValidation.success || !toValidation.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_STATION_CODE',
          message: 'Station codes must be between 2 and 6 alphanumeric characters (e.g. CDG, NDLS).',
        },
      },
      400
    );
  }

  const from = fromValidation.data;
  const to = toValidation.data;

  if (from === to) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SAME_STATION',
          message: 'Departure and arrival stations cannot be the same.',
        },
      },
      400
    );
  }

  const result = await fetchTrainsBetween(from, to);

  return c.json(
    {
      success: true,
      data: result,
    },
    200
  );
});

liveTrainRouter.get('/:trainNumber/live', async (c) => {

  const rawTrainNumber = c.req.param('trainNumber');

  // Validate 5-digit train number strictly before hitting cache or upstream
  const validation = validateTrainNumber(rawTrainNumber);
  if (!validation.success || !validation.data) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_TRAIN_NUMBER',
          message:
            validation.error ||
            'Train number must be exactly 5 numeric digits (e.g. 12301).',
        },
      },
      400
    );
  }

  const trainNumber = validation.data;
  const forceRefresh = c.req.query('refresh') === 'true';

  // Fetch live telemetry from RailRadar with single-flight coalescing & configurable TTL cache
  const { data, cached, isStale } = await getLiveTrainTelemetry(trainNumber, {
    bypassCache: forceRefresh,
  });

  const cacheStatus = isStale ? 'STALE' : cached ? 'HIT' : 'MISS';
  c.header('X-Cache', cacheStatus);
  c.header('Cache-Control', `public, max-age=${config.CACHE_TTL_SECONDS}`);

  if (isStale) {
    c.header('Warning', '110 - "Response is Stale"');
  }

  return c.json(
    {
      success: true,
      data,
    },
    200
  );
});

// GET /api/v1/trains/:trainNumber/platform (Milestone 14)
liveTrainRouter.get('/:trainNumber/platform', async (c) => {
  const rawTrainNumber = c.req.param('trainNumber');

  const validation = validateTrainNumber(rawTrainNumber);
  if (!validation.success || !validation.data) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_TRAIN_NUMBER',
          message:
            validation.error ||
            'Train number must be exactly 5 numeric digits (e.g. 12301).',
        },
      },
      400
    );
  }

  const trainNumber = validation.data;
  const forceRefresh = c.req.query('refresh') === 'true';

  const { data, cached, isStale } = await getLiveTrainTelemetry(trainNumber, {
    bypassCache: forceRefresh,
  });

  const cacheStatus = isStale ? 'STALE' : cached ? 'HIT' : 'MISS';
  c.header('X-Cache', cacheStatus);
  c.header('Cache-Control', `public, max-age=${config.CACHE_TTL_SECONDS}`);

  if (isStale) {
    c.header('Warning', '110 - "Response is Stale"');
  }

  const platformInfo = data.platformInfo || {
    platformNumber: null,
    status: 'UNKNOWN',
    station: null,
    updatedAt: data.lastUpdatedTime || new Date().toISOString(),
    source: 'RAILRADAR',
  };

  return c.json(
    {
      success: true,
      data: platformInfo,
    },
    200
  );
});

// GET /api/v1/trains/:trainNumber/coaches (Milestone 15)
liveTrainRouter.get('/:trainNumber/coaches', async (c) => {
  const rawTrainNumber = c.req.param('trainNumber');

  const validation = validateTrainNumber(rawTrainNumber);
  if (!validation.success || !validation.data) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_TRAIN_NUMBER',
          message:
            validation.error ||
            'Train number must be exactly 5 numeric digits (e.g. 12301).',
        },
      },
      400
    );
  }

  const trainNumber = validation.data;
  const coachData = await getTrainCoaches(trainNumber);

  c.header('Cache-Control', `public, max-age=${config.CACHE_TTL_SECONDS * 4}`);

  return c.json(
    {
      success: true,
      data: coachData,
    },
    200
  );
});
