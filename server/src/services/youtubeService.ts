import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

type SearchVideoItem = {
  id: {
    videoId?: string;
  };
};

type VideoApiItem = {
  id: string;
  snippet?: {
    title?: string;
    publishedAt?: string;
    channelId?: string;
    channelTitle?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type ChannelApiItem = {
  id: string;
  snippet?: {
    title?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
};

export type NormalizedVideo = {
  platform: "youtube";
  externalContentId: string;
  title: string;
  publishedAt: string | null;
  url: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  creator: {
    platform: "youtube";
    externalCreatorId: string;
    name: string;
    subscriberCount: number | null;
    videoCount: number | null;
  };
};

function calculateEngagementRate(
  views: number,
  likes: number,
  comments: number,
): number {
  if (!views || views <= 0) return 0;
  return Number((((likes + comments) / views) * 100).toFixed(4));
}

export async function fetchYouTubeCampaignData(
  query: string,
  maxResults = 10,
): Promise<NormalizedVideo[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("Missing YOUTUBE_API_KEY in environment variables.");
  }

  const searchResponse = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
    params: {
      key: YOUTUBE_API_KEY,
      part: "snippet",
      q: query,
      type: "video",
      maxResults,
      order: "viewCount",
    },
  });

  const searchItems: SearchVideoItem[] = searchResponse.data.items || [];
  const videoIds = searchItems
    .map((item) => item.id?.videoId)
    .filter(Boolean) as string[];

  if (videoIds.length === 0) {
    return [];
  }

  const videosResponse = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
    params: {
      key: YOUTUBE_API_KEY,
      part: "snippet,statistics",
      id: videoIds.join(","),
    },
  });

  const videoItems: VideoApiItem[] = videosResponse.data.items || [];

  const channelIds = Array.from(
    new Set(
      videoItems
        .map((video) => video.snippet?.channelId)
        .filter(Boolean) as string[],
    ),
  );

  let channelItems: ChannelApiItem[] = [];

  if (channelIds.length > 0) {
    const channelsResponse = await axios.get(`${YOUTUBE_BASE_URL}/channels`, {
      params: {
        key: YOUTUBE_API_KEY,
        part: "snippet,statistics",
        id: channelIds.join(","),
      },
    });

    channelItems = channelsResponse.data.items || [];
  }

  const channelsById = new Map<string, ChannelApiItem>();
  for (const channel of channelItems) {
    channelsById.set(channel.id, channel);
  }

  return videoItems.map((video) => {
    const channelId = video.snippet?.channelId || "";
    const channel = channelsById.get(channelId);

    const views = Number(video.statistics?.viewCount || 0);
    const likes = Number(video.statistics?.likeCount || 0);
    const comments = Number(video.statistics?.commentCount || 0);

    return {
      platform: "youtube",
      externalContentId: video.id,
      title: video.snippet?.title || "Untitled Video",
      publishedAt: video.snippet?.publishedAt || null,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      views,
      likes,
      comments,
      engagementRate: calculateEngagementRate(views, likes, comments),
      creator: {
        platform: "youtube",
        externalCreatorId: channelId,
        name:
          channel?.snippet?.title ||
          video.snippet?.channelTitle ||
          "Unknown Creator",
        subscriberCount: channel?.statistics?.subscriberCount
          ? Number(channel.statistics.subscriberCount)
          : null,
        videoCount: channel?.statistics?.videoCount
          ? Number(channel.statistics.videoCount)
          : null,
      },
    };
  });
}
