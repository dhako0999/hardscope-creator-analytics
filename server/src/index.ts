import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db/db";
import { ingestCampaignData } from "./services/ingestService";
import { fetchYouTubeCampaignData } from "./services/youtubeService";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-test", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      now: result.rows[0].now,
    });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.post("/api/ingest", async (req, res) => {
  try {
    const { name, query, brandName, maxResults } = req.body;

    if (!name || !query) {
      return res.status(400).json({
        status: "error",
        message: "Both name and query are required",
      });
    }

    const result = await ingestCampaignData({
      name,
      query,
      brandName,
      maxResults,
    });

    res.status(201).json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to ingest campaign data",
    });
  }
});

app.get("/api/youtube-test", async (_req, res) => {
  try {
    const data = await fetchYouTubeCampaignData("notion productivity", 5);
    res.json({
      status: "ok",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch YouTube campaign data",
    });
  }
});

app.get("/api/campaigns", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, query, brand_name, created_at 
      FROM campaigns
      ORDER BY created_at DESC
      `);

    res.json({
      status: "ok",
      campaigns: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch campaigns",
    });
  }
});

app.get("/api/analytics/summary", async (req, res) => {
  try {
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      return res.status(400).json({
        status: "error",
        message: "campaignId is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT ci.id) AS total_content_items,
        COUNT(DISTINCT ci.creator_id) AS total_creators,
        COALESCE(SUM(ci.views), 0) AS total_views,
        COALESCE(AVG(ci.engagement_rate), 0) AS avg_engagement_rate
      FROM content_items ci
      WHERE ci.campaign_id = $1    
      `,
      [campaignId],
    );

    res.json({
      status: "ok",
      summary: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch analytics summary",
    });
  }
});

app.get("/api/analytics/top-creators", async (req, res) => {
  try {
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      res.status(500).json({
        status: "error",
        message: "campaign id is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.subscriber_count,
        COUNT(ci.id) AS total_videos,
        COALESCE(SUM(ci.views), 0) AS total_views,
        COALESCE(AVG(ci.views), 0) AS avg_views,
        COALESCE(AVG(ci.engagement_rate), 0) AS avg_engagement_rate
      FROM creators c
      JOIN content_items ci ON ci.creator_id = c.id
      WHERE ci.campaign_id = $1
      GROUP BY c.id, c.name, c.subscriber_count
      ORDER BY total_views DESC                
      `,
      [campaignId],
    );

    res.json({
      status: "ok",
      creators: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch top creators",
    });
  }
});

app.get("/api/analytics/alerts", async (req, res) => {
  try {
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      return res.status(400).json({
        status: "error",
        message: "campaignId is required",
      });
    }

    const result = await pool.query(
      `
      WITH campaign_average AS (
        SELECT AVG(engagement_rate) AS avg_campaign_engagement
        FROM content_items
        WHERE campaign_id = $1
      )
      SELECT
        c.id,
        c.name,
        c.subscriber_count,
        COUNT(ci.id) AS total_videos,
        COALESCE(SUM(ci.views), 0) AS total_views,
        COALESCE(AVG(ci.engagement_rate), 0) AS avg_engagement_rate,
        campaign_average.avg_campaign_engagement
      FROM creators c
      JOIN content_items ci ON ci.creator_id = c.id
      CROSS JOIN campaign_average
      WHERE ci.campaign_id = $1
      GROUP BY
        c.id,
        c.name,
        c.subscriber_count,
        campaign_average.avg_campaign_engagement
      HAVING AVG(ci.engagement_rate) < campaign_average.avg_campaign_engagement
      ORDER BY total_views DESC
      `,
      [campaignId],
    );

    res.json({
      status: "ok",
      alerts: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch campaign alerts",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
