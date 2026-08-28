import { Router } from 'express';
import {
  AnalyticsRepository,
  config as appConfig,
  getLiveStreams,
} from '@aiostreams/core';
import { createResponse } from '../../utils/responses.js';

const router: Router = Router();
const INTERNAL_HEADER = 'X-AIOStreams-Internal-Secret';

router.get('/telemetry', async (req, res, next) => {
  if (
    appConfig.bootstrap.nodeEnv !== 'development' &&
    req.get(INTERNAL_HEADER) !== appConfig.bootstrap.internalSecret
  ) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  try {
    const [live, overview, requests, addons] = await Promise.all([
      getLiveStreams(),
      AnalyticsRepository.overview(),
      AnalyticsRepository.requests('24h'),
      AnalyticsRepository.addons('24h'),
    ]);
    const errors24h = addons.addons.reduce(
      (total, addon) => total + addon.errors,
      0,
    );

    res.status(200).json(createResponse({
      success: true,
      data: {
        timestamp: Date.now(),
        activeStreams: live.summary,
        analytics: {
          requests24h: overview.requests24h,
          errors24h,
          errorRate24h: overview.requests24h
            ? (errors24h / overview.requests24h) * 100
            : 0,
          requests,
        },
        services: addons.addons,
      },
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
