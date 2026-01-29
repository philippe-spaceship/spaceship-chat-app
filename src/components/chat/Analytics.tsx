import { useState, useMemo, useEffect } from "react";
import { Conversation } from "@/pages/Chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Loader2 } from "lucide-react";

interface AnalyticsProps {
  conversations: Conversation[];
}

const Analytics = ({ conversations }: AnalyticsProps) => {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [topN, setTopN] = useState<string>("10");
  const [citationData, setCitationData] = useState<{ url: string; queries: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStats, setBackendStats] = useState({
    conversations: 0,
    total_messages: 0,
    ai_responses: 0,
    avg_rating: 0,
    total_citations: 0,
    unique_urls: 0,
  });

  useEffect(() => {
    const fetchCitationData = async () => {
      setIsLoading(true);
      try {
        // Calculate date range based on filter
        let date_from: string | undefined;
        let date_to: string | undefined;
        
        if (dateFilter !== "all") {
          const now = new Date();
          const fromDate = new Date();
          
          switch (dateFilter) {
            case "today":
              fromDate.setHours(0, 0, 0, 0);
              break;
            case "week":
              fromDate.setDate(now.getDate() - 7);
              break;
            case "month":
              fromDate.setMonth(now.getMonth() - 1);
              break;
          }
          
          date_from = fromDate.toISOString();
          date_to = now.toISOString();
        }

        const requestBody: any = {
          conversation_id: null,
        };
        
        if (date_from) {
          requestBody.date_from = date_from;
        }
        
        if (date_to) {
          requestBody.date_to = date_to;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-citation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Analytics API error:', errorData);
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Store backend stats
        setBackendStats({
          conversations: data.conversations || 0,
          total_messages: data.total_messages || 0,
          ai_responses: data.ai_responses || 0,
          avg_rating: data.avg_rating || 0,
          total_citations: data.total_citations || 0,
          unique_urls: data.unique_urls || 0,
        });
        
        if (data.citation_counts) {
          const urlData = Object.entries(data.citation_counts).map(([url, count]) => ({
            url,
            queries: count as number,
          }));
          
          // Sort by queries descending
          urlData.sort((a, b) => b.queries - a.queries);
          
          setCitationData(urlData);
        }
      } catch (error) {
        console.error("Error fetching citation data:", error);
        // Set default values if fetch fails
        setBackendStats({
          conversations: 0,
          total_messages: 0,
          ai_responses: 0,
          avg_rating: 0,
          total_citations: 0,
          unique_urls: 0,
        });
        setCitationData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCitationData();
  }, [dateFilter]);

  const urlQueryData = useMemo(() => citationData, [citationData]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return urlQueryData;
    return urlQueryData.filter(item => 
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [urlQueryData, searchQuery]);

  const topUrls = useMemo(() => {
    return filteredData.slice(0, parseInt(topN));
  }, [filteredData, topN]);

  const stats = useMemo(() => {
    const totalQueries = filteredData.reduce((sum, item) => sum + item.queries, 0);

    return { 
      totalConversations: backendStats.conversations, 
      totalMessages: backendStats.total_messages, 
      aiMessages: backendStats.ai_responses, 
      avgRating: backendStats.avg_rating.toFixed(1),
      totalQueries,
      uniqueUrls: filteredData.length
    };
  }, [backendStats, filteredData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.totalConversations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Messages</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.totalMessages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI Responses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.aiMessages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Rating</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.avgRating} / 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Queries</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.totalQueries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique URLs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.uniqueUrls}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Top Queried URLs</CardTitle>
              <CardDescription>Most accessed URLs by the RAG system</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={topN} onValueChange={setTopN}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topUrls} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="url" 
                tick={false}
                height={20}
              />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium mb-1 max-w-xs truncate">{payload[0].payload.url}</p>
                        <p className="text-sm text-primary font-bold">Queries: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="queries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All URLs</CardTitle>
              <CardDescription>Complete list of queried URLs</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto relative">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12 bg-card">#</TableHead>
                    <TableHead className="bg-card">URL</TableHead>
                    <TableHead className="text-right w-32 bg-card">Queries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No URLs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{item.url}</TableCell>
                        <TableCell className="text-right font-semibold">{item.queries}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Showing {filteredData.length} of {urlQueryData.length} URLs
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
