import pool from "../db/db";
import { fetchYouTubeCampaignData } from "./youtubeService";

type IngestInput = {
  name: string;
  query: string;
  brandName?: string;
  maxResults?: number;
};

export async function ingestCampaignData({
  name,
  query,
  brandName,
  maxResults = 10,
}: IngestInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const campaignResult = await client.query(
      `
            INSERT INTO campaigns (name, query, brand_name)
             VALUES ($1, $2, $3)
             RETURNING id, name, query, brand_name, created_at
            `,
      [name, query, brandName || null],
    );

    const campaign = campaignResult.rows[0];

    const videos = await fetchYouTubeCampaignData(query, maxResults);

    let creatorsInserted = 0;
    let contentInserted = 0;

    for (const video of videos) {
      const creatorResult = await client.query(
        `
                INSERT INTO creators (
                    platform,
                    external_creator_id,
                    name,
                    subscriber_count,
                    video_count
                )
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (platform, external_creator_id)
                    DO UPDATE SET
                       name = EXCLUDED.name,
                       subscriber_count = EXCLUDED.subscriber_count,
                       video_count = EXCLUDED.video_count,
                       updated_at = NOW()
                    RETURNING id   
                `,
        [
          video.creator.platform,
          video.creator.externalCreatorId,
          video.creator.name,
          video.creator.subscriberCount,
          video.creator.videoCount,
        ],
      );

      const creatorId = creatorResult.rows[0].id;
      creatorsInserted += 1;

      await client.query(
        `
                   INSERT INTO content_items (
                      creator_id,
                      campaign_id,
                      platform,
                      external_content_id,
                      title,
                      published_at,
                      url,
                      views,
                      likes,
                      comments,
                      engagement_rate
                   )
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                   ON CONFLICT (platform, external_content_id)
                   DO UPDATE SET 
                      title = EXCLUDED.title,
                      published_at = EXCLUDED.published_at,
                      url = EXCLUDED.url,
                      views = EXCLUDED.views,
                      likes = EXCLUDED.likes,
                      comments = EXCLUDED.comments,
                      engagement_rate = EXCLUDED.engagement_rate,
                      fetched_at = NOW()    
                `,
        [
          creatorId,
          campaign.id,
          video.platform,
          video.externalContentId,
          video.title,
          video.publishedAt,
          video.url,
          video.views,
          video.likes,
          video.comments,
          video.engagementRate,
        ],
      );

      contentInserted += 1;
    }

    await client.query("COMMIT");

    return {
      campaign,
      creatorsProcessed: creatorsInserted,
      contentProcessed: contentInserted,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
