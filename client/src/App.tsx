import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

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

type SortKey =
  | "name"
  | "subscriber_count"
  | "total_views"
  | "avg_engagement_rate";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>("total_views");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSort(key: sortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  useEffect(() => {
    async function loadCampaigns() {
      const res = await axios.get("http://localhost:4000/api/campaigns");
      setCampaigns(res.data.campaigns);

      if (res.data.campaigns.length > 0) {
        setCampaignId(res.data.campaigns[0].id);
      }
    }

    loadCampaigns().catch(console.error);
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

    loadAnalytics().catch(console.error);
  }, [campaignId]);

  const chartData = useMemo(() => {
    return creators
      .map((creator) => ({
        name: creator.name,
        totalViews: Number(creator.total_views),
      }))
      .sort((a, b) => b.totalViews - a.totalViews);
  }, [creators]);

  const sortedCreators = [...creators].sort((a, b) => {
    let aValue: string | number = a[sortKey];
    let bValue: string | number = b[sortKey];

    if (sortKey === "name") {
      aValue = a.name.toLowerCase();
      bValue = b.name.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    }

    aValue = Number(a[sortKey]);
    bValue = Number(b[sortKey]);

    return sortDirection === "asc"
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  return (
    <div
      style={{
        padding: 40,
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#111827",
      }}
    >
      <h1>Creator Campaign Analytics</h1>

      <div style={{ marginBottom: 24 }}>
        <label htmlFor="campaign-select" style={{ marginRight: 12 }}>
          Campaign:
        </label>
        <select
          id="campaign-select"
          onChange={(e) => setCampaignId(Number(e.target.value))}
          value={campaignId ?? ""}
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 16 }}>Summary</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Total Videos
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatNumber(Number(summary.total_content_items))}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Total Creators
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatNumber(Number(summary.total_creators))}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Total Views
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatCompactNumber(Number(summary.total_views))}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Avg Engagement
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {Number(summary.avg_engagement_rate).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: 40,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Creator Views Chart</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCompactNumber(value)} />
              <Tooltip
                formatter={(value: number) => [
                  formatNumber(value),
                  "Total Views",
                ]}
              />
              <Bar dataKey="totalViews" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Top Creators</h2>

        <table
          cellPadding={10}
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("name")}
              >
                Creator
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("subscriber_count")}
              >
                Subscribers
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("total_views")}
              >
                Total Views
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("avg_engagement_rate")}
              >
                Avg Engagement
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedCreators.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{formatNumber(Number(c.subscriber_count))}</td>
                <td>{formatNumber(Number(c.total_views))}</td>
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
