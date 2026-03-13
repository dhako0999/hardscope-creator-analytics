import { useEffect, useState } from "react";
import axios from "axios";

type Campaign = {
  id: number;
  name: string;
};

type Summary = {
  total_content_items: string;
  total_creators: string;
  total_views: string;
  avg_engagement_rate: string;
};

type Creator = {
  id: number;
  name: string;
  subscriber_count: string;
  total_views: string;
  avg_engagement_rate: string;
};

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    async function loadCampaigns() {
      const res = await axios.get("http://localhost:4000/api/campaigns");
      setCampaigns(res.data.campaigns);

      if (res.data.campaigns.length > 0) {
        setCampaignId(res.data.campaigns[0].id);
      }
    }

    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    async function loadAnalytics() {
      const summaryRes = await axios.get(
        `http://localhost:4000/api/analytics/summary?campaignId=${campaignId}`,
      );

      const creatorsRes = await axios.get(
        `http://localhost:4000/api/analytics/top-creators?campaignId=${campaignId}`,
      );

      setSummary(summaryRes.data.summary);
      setCreators(creatorsRes.data.creators);
    }

    loadAnalytics();
  }, [campaignId]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Creator Campaign Analytics</h1>

      <select
        onChange={(e) => setCampaignId(Number(e.target.value))}
        value={campaignId ?? ""}
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {summary && (
        <div style={{ marginTop: 30 }}>
          <h2>Summary</h2>
          <p>Total Videos: {summary.total_content_items}</p>
          <p>Total Creators: {summary.total_creators}</p>
          <p>Total Views: {summary.total_views}</p>
          <p>
            Avg Engagement: {Number(summary.avg_engagement_rate).toFixed(2)}%
          </p>
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h2>Top Creators</h2>

        <table border={1} cellPadding={10}>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Subscribers</th>
              <th>Total Views</th>
              <th>Avg Engagement</th>
            </tr>
          </thead>

          <tbody>
            {creators.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.subscriber_count}</td>
                <td>{c.total_views}</td>
                <td>{Number(c.avg_engagement_rate).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
