/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Database, 
  FileText, 
  TrendingUp, 
  Terminal, 
  Check, 
  Copy, 
  RefreshCw, 
  Search, 
  Plus, 
  AlertTriangle, 
  Info, 
  Clock, 
  Layers, 
  Activity,
  HeartPulse,
  DatabaseZap,
  Tag,
  ArrowUpRight,
  Sparkles,
  Trash2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Newspaper,
  X
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine,
  CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

import { FinancialNews, Candlestick, MarketInterval } from "./types.js";
import { SUPABASE_NEWS_SQL, COCKROACH_CANDLES_SQL } from "./schema-sql.js";
import { TradingViewStyleChart } from "./components/TradingViewStyleChart.js";

function getCurrentWeekAndYear(): { year: number; week: number } {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  return { year, week: weekNum };
}

export default function App() {
  // Site Authentication Gated Portal Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);
  const [enteredPasscode, setEnteredPasscode] = useState("");
  const [isSubmittingPasscode, setIsSubmittingPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"api-overview" | "schemas" | "news" | "charts" | "connection">("api-overview");
  const [apiStats, setApiStats] = useState<{
    lifetimeRequests: number;
    todayRequests: number;
    weekRequests: number;
    monthRequests: number;
    averageRequestsPerDay: number;
    averageLatencyMs: number;
    unauthorizedRequests: number;
    secretKeysAuthorizedRatio: number;
    dailyTrends: { date: string; count: number }[];
    distributions: {
      endpoints: Record<string, number>;
      statusCodes: Record<string, number>;
      symbols: Record<string, number>;
      sources: Record<string, number>;
    };
    recentLogs: any[];
  } | null>(null);
  const [isRefreshingApiStats, setIsRefreshingApiStats] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [copiedHealthUrl, setCopiedHealthUrl] = useState(false);
  const [enableTerminalConsoleLogs, setEnableTerminalConsoleLogs] = useState(false);
  
  // Database Status Information
  const [dbStatus, setDbStatus] = useState<any>({
    supabase: { 
      configured: false, 
      url: "", 
      connected: null, 
      error: undefined, 
      tableCount: 0,
      diagnostics: {
        totalSize: "0 B",
        tableSize: "0 B",
        indexSize: "0 B",
        rowCount: 0,
        engine: "PostgREST API Gateway (RLS Locked)",
        info: "To enable direct SQL auto-creation and actual byte size calculations for Supabase, set SUPABASE_DB_URL in your secrets."
      }
    },
    cockroach: { 
      configured: false, 
      url: "", 
      connected: null, 
      error: undefined,
      diagnostics: {
        totalSize: "0 B",
        tableSize: "0 B",
        indexSize: "0 B",
        rowCount: 0,
        engine: "CockroachDB Serverless Cluster",
        info: "Connected using primary keys clustered layout mapping to range shards."
      }
    }
  });
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // News Explorer State
  const [news, setNews] = useState<FinancialNews[]>([]);
  const [newsSource, setNewsSource] = useState<string>("sandbox");
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsTickerFilter, setNewsTickerFilter] = useState<string>("");
  const [newsSentimentFilter, setNewsSentimentFilter] = useState<string>("");
  const [newsImpactFilter, setNewsImpactFilter] = useState<string>("");
  const [newsSearch, setNewsSearch] = useState<string>("");

  // Forex Factory News Sync State
  const [syncState, setSyncState] = useState<{
    status: 'idle' | 'syncing' | 'completed' | 'paused' | 'error';
    startDate: string;
    currentDate: string;
    endDate: string;
    totalProcessed: number;
    lastCompletedDate: string | null;
    error: string | null;
  }>({
    status: 'idle',
    startDate: '2015-01-01',
    currentDate: '2015-01-01',
    endDate: '2026-05-25',
    totalProcessed: 0,
    lastCompletedDate: null,
    error: null
  });
  const [isSyncActionLoading, setIsSyncActionLoading] = useState(false);

  // Sync / Refresh News Stream Helper
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/news/sync/status");
      if (res.ok) {
        const body = await res.json();
        if (body.syncState) {
          setSyncState(body.syncState);
        }
      }
    } catch (err) {
      console.error("Failed to query news sync status:", err);
    }
  };

  const fetchApiStats = async (loadingIndicator = false) => {
    if (loadingIndicator) setIsRefreshingApiStats(true);
    try {
      const res = await fetch("/api/admin/api-stats");
      if (res.ok) {
        const body = await res.json();
        setApiStats(body);
      }
    } catch (err) {
      console.error("Failed to fetch administrative API statistics:", err);
    } finally {
      if (loadingIndicator) setIsRefreshingApiStats(false);
    }
  };

  const triggerSyncAction = async (action: 'start' | 'pause' | 'reset') => {
    setIsSyncActionLoading(true);
    try {
      const res = await fetch("/api/news/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.syncState) {
          setSyncState(body.syncState);
          if (action === "start") {
            fetchNews();
          }
        }
      }
    } catch (err) {
      console.error("Failed to trigger sync action:", err);
    } finally {
      setIsSyncActionLoading(false);
    }
  };

  const getSyncPercentage = () => {
    const startMs = new Date("2015-01-01").getTime();
    const endMs = new Date(syncState.endDate || new Date().toISOString().split('T')[0]).getTime();
    const currentMs = new Date(syncState.currentDate || "2015-01-01").getTime();
    if (endMs <= startMs) return 100;
    const pct = ((currentMs - startMs) / (endMs - startMs)) * 100;
    return Math.min(Math.max(Math.round(pct), 0), 100);
  };
  
  // News Form State
  const [showAddNews, setShowAddNews] = useState(false);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsSource, setNewNewsSource] = useState("");
  const [newNewsUrl, setNewNewsUrl] = useState("");
  const [newNewsSentiment, setNewNewsSentiment] = useState<"bullish" | "bearish" | "neutral">("neutral");
  const [newNewsTickers, setNewNewsTickers] = useState("");

  // Market Charts State
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [candlesSource, setCandlesSource] = useState<string>("sandbox");
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string>("BTCUSD");
  const [selectedInterval, setSelectedInterval] = useState<MarketInterval>("1h");
  const [selectedChartSource, setSelectedChartSource] = useState<"exness" | "dukascopy">("exness");
  const [showHistoricalLogs, setShowHistoricalLogs] = useState(false);

  // Chart range filter state (default: past 30 days)
  const [chartStartDate, setChartStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [chartEndDate, setChartEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  });

  // API Testing Playground State
  const [apiSymbol, setApiSymbol] = useState("EURUSD");
  const [apiSource, setApiSource] = useState("exness");
  const [apiTimeframe, setApiTimeframe] = useState("1h");
  const [apiStartTime, setApiStartTime] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [apiEndTime, setApiEndTime] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [apiLimit, setApiLimit] = useState(200);
  const [apiSecret, setApiSecret] = useState("secret!");
  const [apiTestingResult, setApiTestingResult] = useState<any | null>(null);
  const [apiResultError, setApiResultError] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [rawJsonOutput, setRawJsonOutput] = useState<string | null>(null);
  const [copiedPlaygroundText, setCopiedPlaygroundText] = useState(false);
  const [showJsonDump, setShowJsonDump] = useState(true);
  
  // Interactive Collapsible News State
  const [isChartNewsExpanded, setIsChartNewsExpanded] = useState(true);

  // Trigger test for /api/warehouse-candles (directly pointing to the real deployed endpoint URL)
  const handleTestApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsTestingApi(true);
    setApiResultError(null);
    setApiTestingResult(null);
    setRawJsonOutput(null);

    try {
      const qParams = new URLSearchParams();
      qParams.set("symbol", apiSymbol.trim().toUpperCase());
      qParams.set("source", apiSource.trim().toLowerCase());
      qParams.set("timeframe", apiTimeframe.trim().toLowerCase());
      if (apiStartTime) qParams.set("startTime", apiStartTime.trim());
      if (apiEndTime) qParams.set("endTime", apiEndTime.trim());
      if (apiLimit) qParams.set("limit", String(apiLimit));

      const headers: Record<string, string> = {
        "Accept": "application/json"
      };
      if (apiSecret) {
        headers["X-API-Secret"] = apiSecret.trim();
      }

      // Querying the backend proxy which bypasses browser sandbox CORS
      const res = await fetch(`/api/warehouse-candles?${qParams.toString()}`, {
        method: "GET",
        headers
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `HTTP error! status: ${res.status}`);
      }

      const body = await res.json();
      setApiTestingResult(body);
      setRawJsonOutput(JSON.stringify(body, null, 2));
    } catch (err: any) {
      console.error("API Testing failure:", err);
      setApiResultError(err.message || "An unexpected error occurred while calling the API.");
    } finally {
      setIsTestingApi(false);
    }
  };

  // Candle Form State
  const [showAddCandle, setShowAddCandle] = useState(false);
  const [newCandleTimestamp, setNewCandleTimestamp] = useState("");
  const [newCandleOpen, setNewCandleOpen] = useState("");
  const [newCandleHigh, setNewCandleHigh] = useState("");
  const [newCandleLow, setNewCandleLow] = useState("");
  const [newCandleClose, setNewCandleClose] = useState("");
  const [newCandleVolume, setNewCandleVolume] = useState("");

  // Multi-CockroachDB Instance Forms state
  const [instName, setInstName] = useState("");
  const [instUrl, setInstUrl] = useState("");
  const [instPairs, setInstPairs] = useState("");
  const [instSource, setInstSource] = useState<"exness" | "dukascopy">("exness");
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [isSavingInstance, setIsSavingInstance] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);
  const [confirmWipeInstId, setConfirmWipeInstId] = useState<string | null>(null);

  // Collapsible sections
  const [isDeployFormCollapsed, setIsDeployFormCollapsed] = useState(true);
  const [isSchemaBlueprintCollapsed, setIsSchemaBlueprintCollapsed] = useState(true);
  
  // Dataset Ingest Jobs Tracking State
  const [ingestStates, setIngestStates] = useState<{ [key: string]: any }>({});
  const [selectedLogJobKey, setSelectedLogJobKey] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<{ [instanceId: string]: "exness" | "dukascopy" }>({});

  // Auto-Ingest state hooks
  const [autoIngestConfig, setAutoIngestConfig] = useState<{ enabled: boolean; source: string }>({ enabled: false, source: "exness" });
  const [isSavingAutoIngest, setIsSavingAutoIngest] = useState(false);

  // Gap repairing & dropdown states
  const [isRepairing, setIsRepairing] = useState<{ [key: string]: boolean }>({});
  const [isUnrepairing, setIsUnrepairing] = useState<{ [key: string]: boolean }>({});
  const [expandedGaps, setExpandedGaps] = useState<{ [key: string]: boolean }>({});

  const toggleGapsDropdown = (pair: string) => {
    setExpandedGaps(prev => ({ ...prev, [pair]: !prev[pair] }));
  };

  const handleRepairGaps = async (instanceId: string, pair: string, source: string) => {
    setIsRepairing(prev => ({ ...prev, [pair]: true }));
    try {
      const res = await fetch("/api/gaps/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, pair, source })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Feed repaired. Filled ${data.count} gappy timestamps with Dukascopy backup source.`);
        fetchDbStatus(); // Reload active instance diagnostic stats
      } else {
        alert(data.error || "Failed to fill backup gaps.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while filling backup gaps.");
    } finally {
      setIsRepairing(prev => ({ ...prev, [pair]: false }));
    }
  };

  const handleUnfillGaps = async (instanceId: string, pair: string, source: string) => {
    setIsUnrepairing(prev => ({ ...prev, [pair]: true }));
    try {
      const res = await fetch("/api/gaps/unfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, pair, source })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Cleared ${data.count} filled gap timestamps. Source feed restored to original state.`);
        fetchDbStatus(); // Reload active instance diagnostic stats
      } else {
        alert(data.error || "Failed to unfill backup gaps.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while unfilling backup gaps.");
    } finally {
      setIsUnrepairing(prev => ({ ...prev, [pair]: false }));
    }
  };

  // State and handler for individual pair and source series deletion
  const [isDeletingPair, setIsDeletingPair] = useState<{ [key: string]: boolean }>({});
  const [confirmDeletePairKey, setConfirmDeletePairKey] = useState<string | null>(null);

  const handleDeletePairSource = async (instanceId: string, pair: string, source: string) => {
    const key = `${instanceId}:${pair}:${source}`;
    if (confirmDeletePairKey !== key) {
      setConfirmDeletePairKey(key);
      setTimeout(() => setConfirmDeletePairKey(null), 4000);
      return;
    }

    setConfirmDeletePairKey(null);
    setIsDeletingPair(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/db/delete/pair-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, pair, source })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully deleted ${data.deletedCount} candle records of ${source.toUpperCase()} data for ${pair}.`);
        fetchDbStatus(); // Reload active instance diagnostic stats
      } else {
        alert(data.error || `Failed to delete ${source.toUpperCase()} data for ${pair}.`);
      }
    } catch (err: any) {
      alert(err.message || "Network error while deleting series data.");
    } finally {
      setIsDeletingPair(prev => ({ ...prev, [key]: false }));
    }
  };

  // UI state
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});
  const [isWipingAllNews, setIsWipingAllNews] = useState(false);
  const [confirmWipeAllNews, setConfirmWipeAllNews] = useState(false);
  const [isWipingSupabase, setIsWipingSupabase] = useState(false);
  const [isWipingCockroach, setIsWipingCockroach] = useState(false);
  const [confirmWipeSupabase, setConfirmWipeSupabase] = useState(false);
  const [confirmWipeCockroach, setConfirmWipeCockroach] = useState(false);
  const [wipeMessage, setWipeMessage] = useState<string | null>(null);

  // Security properties for wipe flow
  const [showWipeSecurityModal, setShowWipeSecurityModal] = useState(false);
  const [wipeActionType, setWipeActionType] = useState<"supabase" | "cockroach_all" | "cockroach_instance" | null>(null);
  const [wipeInstanceId, setWipeInstanceId] = useState<string | null>(null);
  const [enteredWipeSecret, setEnteredWipeSecret] = useState("");
  const [wipeSecurityError, setWipeSecurityError] = useState<string | null>(null);

  // Supabase Dynamic Configuration UI controls
  const [supabaseConfigUrl, setSupabaseConfigUrl] = useState("");
  const [supabaseConfigAnonKey, setSupabaseConfigAnonKey] = useState("");
  const [supabaseConfigDbUrl, setSupabaseConfigDbUrl] = useState("");
  const [isSavingSupabaseConfig, setIsSavingSupabaseConfig] = useState(false);
  const [supabaseConfigMessage, setSupabaseConfigMessage] = useState<string | null>(null);
  const [isFetchingSupabaseConfig, setIsFetchingSupabaseConfig] = useState(false);

  const fetchSupabaseConfig = async () => {
    setIsFetchingSupabaseConfig(true);
    try {
      const res = await fetch("/api/supabase/config");
      if (res.ok) {
        const config = await res.json();
        if (config.url || config.anonKey || config.dbUrl) {
          setSupabaseConfigUrl(config.url || "");
          setSupabaseConfigAnonKey(config.anonKey || "");
          setSupabaseConfigDbUrl(config.dbUrl || "");
          // Persistent browser backup sync
          localStorage.setItem("forex_supabase_config", JSON.stringify(config));
        } else {
          // If server is clean-slate/ephemeral, check if localStorage cache has details to auto-restore
          const cached = localStorage.getItem("forex_supabase_config");
          if (cached) {
            try {
              const savedConfig = JSON.parse(cached);
              if (savedConfig.url || savedConfig.anonKey || savedConfig.dbUrl) {
                console.log("[Auto-Restore] Syncing Supabase config from client localStorage into brand new server...");
                await fetch("/api/supabase/config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(savedConfig)
                });
                setSupabaseConfigUrl(savedConfig.url || "");
                setSupabaseConfigAnonKey(savedConfig.anonKey || "");
                setSupabaseConfigDbUrl(savedConfig.dbUrl || "");
                fetchDbStatus(true);
              }
            } catch (err) {
              console.error("[Auto-Restore] Failed to parse cached supabase config:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch custom Supabase config:", err);
    } finally {
      setIsFetchingSupabaseConfig(false);
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSupabaseConfig(true);
    setSupabaseConfigMessage(null);
    try {
      const res = await fetch("/api/supabase/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: supabaseConfigUrl,
          anonKey: supabaseConfigAnonKey,
          dbUrl: supabaseConfigDbUrl
        })
      });
      if (res.ok) {
        setSupabaseConfigMessage("✓ Custom Supabase credentials saved and initialized successfully.");
        // Persist browser backup
        const config = { url: supabaseConfigUrl, anonKey: supabaseConfigAnonKey, dbUrl: supabaseConfigDbUrl };
        localStorage.setItem("forex_supabase_config", JSON.stringify(config));
        fetchDbStatus(true);
        fetchNews();
        setTimeout(() => setSupabaseConfigMessage(null), 5000);
      } else {
        setSupabaseConfigMessage("⚠️ Failed to store custom Supabase configuration.");
      }
    } catch (err) {
      console.error("Failed to save supabase config:", err);
      setSupabaseConfigMessage("⚠️ Connection error while saving custom Supabase config.");
    } finally {
      setIsSavingSupabaseConfig(false);
    }
  };

  const executeSecureWipe = async (secret: string) => {
    setWipeSecurityError(null);
    try {
      if (wipeActionType === "supabase") {
        setIsWipingSupabase(true);
        const response = await fetch("/api/db/wipe/supabase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
          setWipeMessage(`Supabase News Purge: Successfully wiped ${result.wipedCount || 0} articles.`);
          setShowWipeSecurityModal(false);
          setEnteredWipeSecret("");
          fetchNews();
          fetchDbStatus();
          setTimeout(() => setWipeMessage(null), 5000);
        } else {
          setWipeSecurityError(result.error || "Incorrect database wipe administrative secret.");
        }
      } else if (wipeActionType === "cockroach_all") {
        setIsWipingCockroach(true);
        const response = await fetch("/api/db/wipe/cockroach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
          setWipeMessage(`CockroachDB Candles Purge: Successfully wiped ${result.wipedCount || 0} entries.`);
          setShowWipeSecurityModal(false);
          setEnteredWipeSecret("");
          fetchCandles();
          fetchDbStatus();
          setTimeout(() => setWipeMessage(null), 5000);
        } else {
          setWipeSecurityError(result.error || "Incorrect database wipe administrative secret.");
        }
      } else if (wipeActionType === "cockroach_instance") {
        setIsWipingCockroach(true);
        const response = await fetch("/api/db/wipe/cockroach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret, instanceId: wipeInstanceId })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
          setWipeMessage(`Instance Candlesticks Purged: Successfully wiped ${result.wipedCount || 0} records.`);
          setShowWipeSecurityModal(false);
          setEnteredWipeSecret("");
          fetchCandles();
          fetchDbStatus();
          setTimeout(() => setWipeMessage(null), 5000);
        } else {
          setWipeSecurityError(result.error || "Incorrect database wipe administrative secret.");
        }
      }
    } catch (err) {
      console.error("Secure wipe error:", err);
      setWipeSecurityError("Connection failure during authorization checks.");
    } finally {
      setIsWipingSupabase(false);
      setIsWipingCockroach(false);
    }
  };

  const fetchIngestStatus = async () => {
    try {
      const res = await fetch("/api/cockroach/ingest/status");
      if (res.ok) {
        const data = await res.json();
        setIngestStates(data.pairIngestStates || {});
      }
    } catch (err) {
      console.error("Error retrieving ingest status:", err);
    }
  };

  const fetchAutoIngestConfig = async () => {
    try {
      const res = await fetch("/api/auto-ingest/config");
      if (res.ok) {
        const data = await res.json();
        setAutoIngestConfig(data);
      }
    } catch (err) {
      console.error("Error retrieving auto-ingest configuration:", err);
    }
  };

  const handleToggleAutoIngest = async (enabled: boolean) => {
    setIsSavingAutoIngest(true);
    try {
      const res = await fetch("/api/auto-ingest/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setAutoIngestConfig(data.config);
      }
    } catch (err) {
      console.error("Error toggling auto-ingest option:", err);
    } finally {
      setIsSavingAutoIngest(false);
    }
  };

  const handleUpdateAutoIngestSource = async (source: string) => {
    setIsSavingAutoIngest(true);
    try {
      const res = await fetch("/api/auto-ingest/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source })
      });
      if (res.ok) {
        const data = await res.json();
        setAutoIngestConfig(data.config);
      }
    } catch (err) {
      console.error("Error updating auto-ingest source:", err);
    } finally {
      setIsSavingAutoIngest(false);
    }
  };

  // Sync / Refresh Server DB Status Reports
  const fetchDbStatus = async (forceRefresh: boolean = false) => {
    setIsRefreshingStatus(true);
    try {
      const url = forceRefresh ? "/api/db/status?refresh=true" : "/api/db/status";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);

        // Auto-detect and backup customized CockroachDB instances
        const serverClusters = data.cockroachInstances || [];
        const customClusters = serverClusters
          .map((c: any) => c.instance)
          .filter((inst: any) => inst && inst.id && inst.id.startsWith("cr-"));

        if (customClusters.length > 0) {
          localStorage.setItem("forex_cockroach_instances", JSON.stringify(customClusters));
        } else {
          // Empty server / ephemeral memory checkout. Check localStorage for restoration
          const cached = localStorage.getItem("forex_cockroach_instances");
          if (cached) {
            try {
              const savedClusters = JSON.parse(cached);
              if (Array.isArray(savedClusters) && savedClusters.length > 0) {
                console.log("[Auto-Restore] Found previously configured CockroachDB profiles. Re-importing into backend...");
                for (const cluster of savedClusters) {
                  await fetch("/api/cockroach/instances", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: cluster.name,
                      url: cluster.url,
                      pairs: cluster.pairs,
                      source: cluster.source || "exness"
                    })
                  });
                }
                
                // Tracing delay is needed to let backend pool instantiate tables
                setTimeout(async () => {
                  const rRes = await fetch("/api/db/status");
                  if (rRes.ok) {
                    const rData = await rRes.json();
                    setDbStatus(rData);
                  }
                }, 800);
              }
            } catch (err) {
              console.error("[Auto-Restore] Failed to process cached CockroachDB setup:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error checking databases status:", err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const getImpact = (item: FinancialNews) => {
    if (item.impact && item.impact !== 'none') return item.impact;
    const titleLower = (item.title || "").toLowerCase();
    if (titleLower.includes("high impact") || titleLower.includes("high-impact")) return "high";
    if (titleLower.includes("medium impact") || titleLower.includes("medium-impact")) return "medium";
    if (titleLower.includes("low impact") || titleLower.includes("low-impact")) return "low";
    return "none";
  };

  // Sync / Refresh News Stream
  const fetchNews = async () => {
    setIsLoadingNews(true);
    try {
      const url = `/api/news?ticker=${encodeURIComponent(newsTickerFilter)}&sentiment=${encodeURIComponent(newsSentimentFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        let list: FinancialNews[] = body.data || [];
        // Perform local frontend keywords sweep if search is typed
        if (newsSearch) {
          const s = newsSearch.toLowerCase();
          list = list.filter(item => 
            item.title.toLowerCase().includes(s) || 
            item.content.toLowerCase().includes(s) ||
            item.source.toLowerCase().includes(s)
          );
        }
        // Filter by impact level
        if (newsImpactFilter) {
          list = list.filter(item => getImpact(item) === newsImpactFilter);
        }
        setNews(list);
        setNewsSource(body.source || "sandbox");
      }
    } catch (err) {
      console.error("Error loading news stream:", err);
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Fetch Candlestick Charts
  const fetchCandles = async () => {
    setIsLoadingCandles(true);
    try {
      let url = `/api/candles?pair=${encodeURIComponent(selectedPair)}&interval=${selectedInterval}&source=${selectedChartSource}`;
      if (chartStartDate) {
        url += `&startTime=${encodeURIComponent(chartStartDate)}`;
      }
      if (chartEndDate) {
        url += `&endTime=${encodeURIComponent(chartEndDate)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        setCandles(body.data || []);
        setCandlesSource(body.source || "sandbox");
      }
    } catch (err) {
      console.error("Error loading candles:", err);
    } finally {
      setIsLoadingCandles(false);
    }
  };

  // Check saved passkey session on mount
  useEffect(() => {
    const savedSecret = localStorage.getItem("forex_site_secret");
    if (savedSecret) {
      fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: savedSecret })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("forex_site_secret");
            setIsAuthenticated(false);
          }
        })
        .catch(err => {
          console.error("Auth verify error:", err);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsVerifyingSession(false);
        });
    } else {
      setIsVerifyingSession(false);
    }
  }, []);

  // Fetch initial data on authorization confirmation
  useEffect(() => {
    if (isAuthenticated) {
      fetchDbStatus();
      fetchSyncStatus();
      fetchIngestStatus();
      fetchSupabaseConfig();
      fetchApiStats();
      fetchAutoIngestConfig();
    }
  }, [isAuthenticated]);

  // Dynamically poll database status when in "null" (handshaking/verifying) state
  useEffect(() => {
    if (!isAuthenticated) return;
    const isSupabaseVerifying = dbStatus.supabase?.configured && dbStatus.supabase?.connected === null;
    const isCockroachVerifying = dbStatus.cockroachInstances && dbStatus.cockroachInstances.some((i: any) => i.connected === null);

    if (isSupabaseVerifying || isCockroachVerifying) {
      const timer = setInterval(() => {
        fetchDbStatus();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [dbStatus.supabase?.connected, dbStatus.supabase?.configured, dbStatus.cockroachInstances, isAuthenticated]);

  // Poll API stats in background every 2 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      fetchApiStats();
    }, 2000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Poll active dataset ingestions periodically if any is running
  useEffect(() => {
    const hasRunning = Object.values(ingestStates).some((s: any) => s.status === 'running');
    if (hasRunning) {
      const timer = setInterval(() => {
        fetchIngestStatus();
        fetchDbStatus(); // automatically update row count stats in background
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [ingestStates]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (syncState.status === "syncing") {
      timer = setInterval(() => {
        fetchSyncStatus();
        fetchNews();       // load newly ingested records live as they arrive!
        fetchDbStatus();   // refresh counts
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [syncState.status]);

  useEffect(() => {
    fetchNews();
  }, [newsTickerFilter, newsSentimentFilter, newsSearch, newsImpactFilter]);

  useEffect(() => {
    fetchCandles();
  }, [selectedPair, selectedInterval, selectedChartSource, chartStartDate, chartEndDate]);

  useEffect(() => {
    const gathered: string[] = [];
    if (dbStatus.cockroachInstances && Array.isArray(dbStatus.cockroachInstances)) {
      dbStatus.cockroachInstances.forEach((inst: any) => {
        if (inst.instance?.pairs && Array.isArray(inst.instance.pairs)) {
          inst.instance.pairs.forEach((p: string) => {
            const up = p.trim().toUpperCase();
            if (up && !gathered.includes(up)) {
              gathered.push(up);
            }
          });
        }
      });
    }
    const finalPairs = gathered.length > 0 ? gathered : ["BTCUSD", "ETHUSD", "EURUSD", "AAPL"];
    if (!finalPairs.includes(selectedPair.toUpperCase())) {
      setSelectedPair(finalPairs[0]);
    }
    if (!finalPairs.includes(apiSymbol.toUpperCase())) {
      setApiSymbol(finalPairs[0]);
    }
  }, [dbStatus, apiSymbol]);

  // Copy code helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedText((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Safe database delete and wipe endpoints (double-click to confirm)
  const handleWipeSupabase = async () => {
    if (!confirmWipeSupabase) {
      setConfirmWipeSupabase(true);
      // Auto-reset confirmation state if they do not click again in 4 seconds
      setTimeout(() => setConfirmWipeSupabase(false), 4000);
      return;
    }

    setConfirmWipeSupabase(false);
    setWipeActionType("supabase");
    setWipeInstanceId(null);
    setWipeSecurityError(null);
    setEnteredWipeSecret("");
    setShowWipeSecurityModal(true);
  };

  const handleWipeAllNews = async () => {
    if (!confirmWipeAllNews) {
      setConfirmWipeAllNews(true);
      setTimeout(() => setConfirmWipeAllNews(false), 4000);
      return;
    }
    setConfirmWipeAllNews(false);
    setIsWipingAllNews(true);
    try {
      const response = await fetch("/api/news/wipe-all", {
        method: "POST"
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setWipeMessage("All financial news data has been successfully wiped from Supabase. Ingestion pointer was reset.");
        fetchNews();
        fetchSyncStatus();
        setTimeout(() => setWipeMessage(null), 5000);
      } else {
        alert(result.error || "Failed to fully delete news data.");
      }
    } catch (err: any) {
      console.error("Wiping all news failed:", err);
      alert("Network error: Failed to fully delete news data.");
    } finally {
      setIsWipingAllNews(false);
    }
  };

  const handleWipeCockroach = async () => {
    if (!confirmWipeCockroach) {
      setConfirmWipeCockroach(true);
      // Auto-reset confirmation state if they do not click again in 4 seconds
      setTimeout(() => setConfirmWipeCockroach(false), 4000);
      return;
    }

    setConfirmWipeCockroach(false);
    setWipeActionType("cockroach_all");
    setWipeInstanceId(null);
    setWipeSecurityError(null);
    setEnteredWipeSecret("");
    setShowWipeSecurityModal(true);
  };

  const handleSaveInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName || !instUrl) {
      setInstError("Name and connection URL are required.");
      return;
    }

    setIsSavingInstance(true);
    setInstError(null);

    const pairsArr = instPairs
      .split(",")
      .map(p => p.trim())
      .filter(Boolean);

    try {
      const url = editingInstId 
        ? `/api/cockroach/instances/${editingInstId}`
        : "/api/cockroach/instances";
      const method = editingInstId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: instName,
          url: instUrl,
          pairs: pairsArr,
          source: instSource
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setInstError(data.error || "Failed to save Cockroach DB instance.");
      } else {
        // Reset form
        setInstName("");
        setInstUrl("");
        setInstPairs("");
        setInstSource("exness");
        setEditingInstId(null);
        fetchDbStatus(true);
        fetchCandles();
      }
    } catch (err: any) {
      console.error(err);
      setInstError("Network failure saving Cockroach DB instance.");
    } finally {
      setIsSavingInstance(false);
    }
  };

  const handleDeleteInstance = async (id: string) => {
    try {
      const res = await fetch(`/api/cockroach/instances/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Remove from browser cache
        const cached = localStorage.getItem("forex_cockroach_instances");
        if (cached) {
          try {
            const savedClusters = JSON.parse(cached);
            if (Array.isArray(savedClusters)) {
              const filtered = savedClusters.filter((c: any) => c.id !== id);
              if (filtered.length > 0) {
                localStorage.setItem("forex_cockroach_instances", JSON.stringify(filtered));
              } else {
                localStorage.removeItem("forex_cockroach_instances");
              }
            }
          } catch {}
        }
        fetchDbStatus();
        fetchCandles();
      }
    } catch (err) {
      console.error("Failed to delete Cockroach URL instance:", err);
    }
  };

  const handleWipeInstance = async (id: string) => {
    if (confirmWipeInstId !== id) {
      setConfirmWipeInstId(id);
      setTimeout(() => setConfirmWipeInstId(null), 4000);
      return;
    }

    setConfirmWipeInstId(null);
    setWipeActionType("cockroach_instance");
    setWipeInstanceId(id);
    setWipeSecurityError(null);
    setEnteredWipeSecret("");
    setShowWipeSecurityModal(true);
  };

  const handleTriggerPairIngest = async (instanceId: string, pair: string, source: string) => {
    try {
      const res = await fetch("/api/cockroach/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, pair, source, enableConsoleLogs: enableTerminalConsoleLogs })
      });
      if (res.ok) {
        fetchIngestStatus();
        fetchDbStatus();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to start data ingestion.");
      }
    } catch (err) {
      console.error("Failed to start ingestion:", err);
    }
  };

  const handleCancelIngestion = async (instanceId: string, pair: string, source: string) => {
    try {
      const res = await fetch("/api/cockroach/ingest/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, pair, source })
      });
      if (res.ok) {
        fetchIngestStatus();
        fetchDbStatus();
      } else {
        const errData = await res.json();
        console.warn(errData.error || "Failed to cancel data ingestion.");
      }
    } catch (err) {
      console.error("Failed to cancel ingestion:", err);
    }
  };

  const handleAddCustomPair = async (instanceId: string, pair: string) => {
    const cleanPair = (pair || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanPair) {
      return;
    }
    try {
      const res = await fetch(`/api/cockroach/instances/${instanceId}/pairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair: cleanPair })
      });
      if (res.ok) {
        fetchDbStatus();
      } else {
        const data = await res.json();
        console.error(data.error || "Failed to add asset pair.");
      }
    } catch (err) {
      console.error("Failed to add asset pair:", err);
    }
  };

  const handleRemoveCustomPair = async (instanceId: string, pair: string) => {
    const cleanPair = (pair || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanPair) return;
    try {
      const res = await fetch(`/api/cockroach/instances/${instanceId}/pairs/${cleanPair}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDbStatus();
      } else {
        const data = await res.json();
        console.error(data.error || "Failed to remove asset pair.");
      }
    } catch (err) {
      console.error("Failed to remove asset pair:", err);
    }
  };

  // Add news action handler
  const handleAddNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle || !newNewsContent || !newNewsSource) return;

    try {
      const tickerList = newNewsTickers
        .split(",")
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);

      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNewsTitle,
          content: newNewsContent,
          source: newNewsSource,
          url: newNewsUrl,
          sentiment: newNewsSentiment,
          tickers: tickerList
        })
      });

      if (response.ok) {
        // Success
        setNewNewsTitle("");
        setNewNewsContent("");
        setNewNewsSource("");
        setNewNewsUrl("");
        setNewNewsSentiment("neutral");
        setNewNewsTickers("");
        setShowAddNews(false);
        fetchNews();
        fetchDbStatus(); // update tableCount feedback
      }
    } catch (error) {
      console.error("Failed to add news item:", error);
    }
  };

  // Add candle action handler
  const handleAddCandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ts = newCandleTimestamp || new Date().toISOString();
    const op = parseFloat(newCandleOpen);
    const hi = parseFloat(newCandleHigh);
    const lo = parseFloat(newCandleLow);
    const cl = parseFloat(newCandleClose);
    const vl = parseFloat(newCandleVolume || "0");

    if (isNaN(op) || isNaN(hi) || isNaN(lo) || isNaN(cl)) {
      alert("Please ensure Open, High, Low, and Close are valid numbers.");
      return;
    }

    try {
      const response = await fetch("/api/candles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedPair,
          interval: selectedInterval,
          timestamp: ts,
          open: op,
          high: hi,
          low: lo,
          close: cl,
          volume: vl
        })
      });

      if (response.ok) {
        setNewCandleTimestamp("");
        setNewCandleOpen("");
        setNewCandleHigh("");
        setNewCandleLow("");
        setNewCandleClose("");
        setNewCandleVolume("");
        setShowAddCandle(false);
        fetchCandles();
      }
    } catch (error) {
      console.error("Failed to submit candle:", error);
    }
  };

  // Verification callback to authenticate gateway access
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPasscode) return;
    setIsSubmittingPasscode(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: enteredPasscode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          localStorage.setItem("forex_site_secret", enteredPasscode);
          setIsAuthenticated(true);
        } else {
          setAuthError("🔒 ACCESS DENIED: Incorrect administrative secret key.");
        }
      } else {
        setAuthError("⚠️ Connection failure. Verify database microservice status.");
      }
    } catch (err) {
      console.error(err);
      setAuthError("⚠️ Network error during credential checkout.");
    } finally {
      setIsSubmittingPasscode(false);
    }
  };

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-[#050608] text-[#E0E6ED] flex flex-col items-center justify-center font-mono p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-10 h-10 border-t-2 border-b-2 border-[#3B82F6] rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Verifying administrative socket...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050608] text-[#E0E6ED] flex flex-col items-center justify-center font-mono p-4 selection:bg-red-500/30">
        <div className="w-full max-w-md bg-[#0B0D13] border border-red-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Top pulse strip */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"></div>

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/40 rounded flex items-center justify-center text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">RESTRICTED TERMINAL ACCESS</h2>
              <p className="text-[10px] text-red-400 uppercase tracking-widest mt-0.5">FX Ingestion Terminal Gateway</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            An active <strong>administrative secret key</strong> (Wipe Secret or Forex API Secret) is required to unlock this terminal context.
          </p>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                ENTER SECRET PASSKEY
              </label>
              <input
                type="password"
                value={enteredPasscode}
                onChange={(e) => {
                  setEnteredPasscode(e.target.value);
                  setAuthError(null);
                }}
                placeholder="••••••••••••"
                className="w-full bg-[#121620] border border-[#232B3D] focus:border-red-500/50 py-2.5 px-3 text-sm text-white focus:outline-none font-mono placeholder-slate-600 transition-all rounded-sm"
                autoFocus
              />
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono p-3 leading-snug uppercase rounded-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingPasscode || !enteredPasscode}
              className="w-full py-2.5 bg-red-600/90 hover:bg-red-500 active:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono uppercase font-bold text-xs rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-red-900/10"
            >
              <span>{isSubmittingPasscode ? "CONNECTING..." : "UNLOCK TERMINAL FORWARDER"}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1C222F] flex justify-between items-center text-[9px] text-slate-500 font-mono select-none">
            <span>SECURE TERMINAL TUNNEL</span>
            <span className="text-red-500 font-bold">STATUS: LOCKED</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E0E6ED] flex flex-col font-sans selection:bg-[#3B82F6]/30 border-0 md:border-4 border-[#1A1D23]">
      
      {/* 1. TOP MARGIN & TITLE PANEL */}
      <header className="border-b border-[#1E232D] bg-[#0F1218] sticky top-0 z-50 px-4 py-3 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#3B82F6] rounded flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)] shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2 font-mono">
              FirstLook Datawarehouse
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs max-w-lg hidden md:block leading-snug mt-1 font-sans">
              Automated bid/ask spread ingestion pipelines (Exness & Dukascopy), historic news timelines (Supabase), and CockroachDB range-sharded charts with administrative metrics.
            </p>
            <p className="text-slate-500 font-mono text-[10px] md:text-xs uppercase tracking-wider mt-1.5">
              System Status: {(() => {
                const isSupabaseLive = dbStatus.supabase?.connected === true;
                const isCockroachLive = dbStatus.cockroachInstances?.length > 0 && dbStatus.cockroachInstances.some((i: any) => i.connected === true);
                
                const isSupabaseVerifying = dbStatus.supabase?.configured && dbStatus.supabase?.connected === null;
                const isCockroachVerifying = dbStatus.cockroachInstances?.length > 0 && dbStatus.cockroachInstances.some((i: any) => i.connected === null);

                if (isSupabaseLive || isCockroachLive) {
                  return <span className="text-emerald-400 font-bold animate-pulse">PRODUCTION METRICS ACTIVE</span>;
                } else if (isSupabaseVerifying || isCockroachVerifying) {
                  return <span className="text-amber-400 font-bold animate-pulse">ESTABLISHING Handshake...</span>;
                } else {
                  return <span className="text-rose-500 font-bold">OFFLINE / PENDING ENVIRONMENT SETUP</span>;
                }
              })()} // Alpha Release 02
            </p>
          </div>
        </div>

        {/* Database Quick Health Indicator Panel */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 font-mono text-[10px] md:text-xs">
          {/* Supabase Status bubble */}
          {(() => {
            const isConfigured = dbStatus.supabase?.configured;
            const isConnected = dbStatus.supabase?.connected;

            let borderCls = "border-rose-500/20 text-rose-400";
            let dotCls = "bg-rose-500";
            let label = "SUPABASE: OFFLINE";

            if (isConnected === true) {
              borderCls = "border-emerald-500/20 text-emerald-400";
              dotCls = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse";
              label = "SUPABASE: LIVE";
            } else if (isConnected === null && isConfigured) {
              borderCls = "border-amber-500/20 text-amber-400";
              dotCls = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse";
              label = "SUPABASE: VERIFYING...";
            }

            return (
              <div className={`flex items-center space-x-2 px-2.5 py-1 md:space-x-2.5 md:px-3 md:py-1.5 rounded bg-[#151921] border ${borderCls}`}>
                <div className={`h-2 w-2 md:h-2.5 md:w-2.5 rounded-full ${dotCls}`} />
                <span className="font-bold">{label}</span>
              </div>
            );
          })()}

          {/* CockroachDB Status bubble */}
          {(() => {
            const totalInst = dbStatus.cockroachInstances?.length || 0;
            const liveInst = dbStatus.cockroachInstances?.filter((i: any) => i.connected === true).length || 0;
            const verifyingInst = dbStatus.cockroachInstances?.filter((i: any) => i.connected === null).length || 0;

            let borderCls = "border-rose-500/20 text-rose-400";
            let dotCls = "bg-rose-500";
            let label = "COCKROACH: OFFLINE";

            if (totalInst > 0) {
              if (liveInst === totalInst) {
                borderCls = "border-emerald-500/20 text-emerald-400";
                dotCls = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse";
                label = `COCKROACH: ${liveInst}/${totalInst} LIVE`;
              } else if (verifyingInst > 0) {
                borderCls = "border-amber-500/20 text-amber-400";
                dotCls = "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse";
                label = `COCKROACH: VERIFYING...`;
              } else if (liveInst > 0) {
                borderCls = "border-blue-500/20 text-blue-400";
                dotCls = "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse";
                label = `COCKROACH: ${liveInst}/${totalInst} LIVE`;
              } else {
                borderCls = "border-rose-500/20 text-rose-400";
                dotCls = "bg-rose-500";
                label = `COCKROACH: ${totalInst} OFFLINE`;
              }
            }

            return (
              <div className={`flex items-center space-x-2 px-2.5 py-1 md:space-x-2.5 md:px-3 md:py-1.5 rounded bg-[#151921] border ${borderCls}`}>
                <div className={`h-2 w-2 md:h-2.5 md:w-2.5 rounded-full ${dotCls}`} />
                <span className="font-bold uppercase">{label}</span>
              </div>
            );
          })()}

          {/* Current Year & Dynamic Week Number indicator */}
          {(() => {
            const { year, week } = getCurrentWeekAndYear();
            return (
              <div className="flex items-center space-x-2 px-2.5 py-1 md:space-x-2.5 md:px-3 md:py-1.5 rounded bg-[#151921] border border-blue-500/20 text-blue-400">
                <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="font-bold uppercase">{year} WEEK {week}</span>
              </div>
            );
          })()}

          <button 
            onClick={() => fetchDbStatus(true)} 
            disabled={isRefreshingStatus}
            className="p-1.5 md:p-2 bg-[#151921] hover:bg-[#1E232D] rounded border border-[#1E232D] text-slate-400 hover:text-white transition-all duration-150 disabled:opacity-40"
            title="Refresh database health status"
          >
            <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isRefreshingStatus ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE / SIDEBAR ROW */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3.5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 bg-[#0A0C10]">
        
        {/* Navigation Sidebar Selector */}
        <aside className="lg:col-span-3 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible py-1 lg:py-0 border-b lg:border-b-0 lg:border-r border-[#1E232D]/60 pr-0 lg:pr-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab("api-overview")}
            className={`flex-1 lg:w-full text-left px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-none flex items-center space-x-2.5 transition-all duration-150 border whitespace-nowrap lg:whitespace-normal font-medium cursor-pointer shrink-0 ${
              activeTab === "api-overview"
                ? "bg-[#151921] text-[#A78BFA] border-b-4 border-b-[#8B5CF6] border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-[#8B5CF6] lg:border-b-transparent lg:border-t-transparent lg:border-r-transparent"
                : "bg-transparent text-slate-400 border-b-4 border-b-transparent border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-transparent lg:border-b-transparent hover:bg-[#151921]/60 hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-purple-400" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-mono uppercase tracking-wider">
                <span className="inline lg:hidden">01 // API ADMIN</span>
                <span className="hidden lg:inline">01 // API Request Telemetry</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden lg:block font-mono max-w-[200px] mt-0.5">Live metrics & query analytics</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("schemas")}
            className={`flex-1 lg:w-full text-left px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-none flex items-center space-x-2.5 transition-all duration-150 border whitespace-nowrap lg:whitespace-normal font-medium cursor-pointer shrink-0 ${
              activeTab === "schemas"
                ? "bg-[#151921] text-white border-b-4 border-b-[#3B82F6] border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-[#3B82F6] lg:border-b-transparent lg:border-t-transparent lg:border-r-transparent"
                : "bg-transparent text-slate-400 border-b-4 border-b-transparent border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-transparent lg:border-b-transparent hover:bg-[#151921]/60 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-blue-500" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-mono uppercase tracking-wider">
                <span className="inline lg:hidden">02 // SCHEMAS</span>
                <span className="hidden lg:inline">02 // DB DDL Schemas</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden lg:block font-mono max-w-[200px] mt-0.5">Interactive SQL setup schemas</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("news")}
            className={`flex-1 lg:w-full text-left px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-none flex items-center space-x-2.5 transition-all duration-150 border whitespace-nowrap lg:whitespace-normal font-medium cursor-pointer shrink-0 ${
              activeTab === "news"
                ? "bg-[#151921] text-white border-b-4 border-b-[#3B82F6] border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-[#3B82F6] lg:border-b-transparent lg:border-t-transparent lg:border-r-transparent"
                : "bg-transparent text-slate-400 border-b-4 border-b-transparent border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-transparent lg:border-b-transparent hover:bg-[#151921]/60 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-amber-500" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-mono uppercase tracking-wider">
                <span className="inline lg:hidden">03 // NEWS</span>
                <span className="hidden lg:inline">03 // News Dataset</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden lg:block font-mono max-w-[200px] mt-0.5">Historical news stream (Supabase)</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex-1 lg:w-full text-left px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-none flex items-center space-x-2.5 transition-all duration-150 border whitespace-nowrap lg:whitespace-normal font-medium cursor-pointer shrink-0 ${
              activeTab === "charts"
                ? "bg-[#151921] text-white border-b-4 border-b-[#3B82F6] border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-[#3B82F6] lg:border-b-transparent lg:border-t-transparent lg:border-r-transparent"
                : "bg-transparent text-slate-400 border-b-4 border-b-transparent border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-transparent lg:border-b-transparent hover:bg-[#151921]/60 hover:text-white"
            }`}
          >
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-emerald-500" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-mono uppercase tracking-wider">
                <span className="inline lg:hidden">04 // CHARTS</span>
                <span className="hidden lg:inline">04 // Time Series OHLCV</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden lg:block font-mono max-w-[200px] mt-0.5">1m/1h/1w pricing with dynamic spread</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("connection")}
            className={`flex-1 lg:w-full text-left px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-none flex items-center space-x-2.5 transition-all duration-150 border whitespace-nowrap lg:whitespace-normal font-medium cursor-pointer shrink-0 ${
              activeTab === "connection"
                ? "bg-[#151921] text-white border-b-4 border-b-[#3B82F6] border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-[#3B82F6] lg:border-b-transparent lg:border-t-transparent lg:border-r-transparent"
                : "bg-transparent text-slate-400 border-b-4 border-b-transparent border-t-transparent border-l-transparent border-r-transparent lg:border-l-4 lg:border-l-transparent lg:border-b-transparent hover:bg-[#151921]/60 hover:text-white"
            }`}
          >
            <Terminal className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-[#22D3EE]" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-mono uppercase tracking-wider">
                <span className="inline lg:hidden">05 // INGRESS</span>
                <span className="hidden lg:inline">05 // Ingress Controllers</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden lg:block font-mono max-w-[200px] mt-0.5">Dukascopy and Exness live ingestion</p>
            </div>
          </button>
          {/* Core visual helper card in sidebar */}
          <div className="mt-auto hidden lg:flex flex-col bg-[#0F1218] border border-[#1E232D] rounded-none p-4">
            <div className="flex items-center space-x-2 text-blue-500 text-xs font-mono font-bold mb-2">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>DATASET PIPELINE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono uppercase tracking-tight text-[11px]">
              STRUCTURED FOR VELOCITY QUANTITATIVE INGESTION. RUN SCHEMAS REMOTELY TO ACTIVATE PRODUCTION MODE.
            </p>
          </div>
        </aside>

        {/* Primary View Area */}
        <main className="lg:col-span-9 flex flex-col">
          
          {/* TAB 1: API OVERVIEW TAB */}
          {activeTab === "api-overview" && (
            <div className="space-y-6">
              {/* Telemetry Header */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-45 bg-[#8B5CF6]/5 blur-3xl rounded-full" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-400 animate-pulse" /> ADMINISTRATIVE API METRICS & TELEMETRY
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">
                        LIVE TELEMETRY ACTIVE // AUTO-REFRESHING STREAM
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchApiStats(true)}
                    disabled={isRefreshingApiStats}
                    className="cursor-pointer bg-[#151921] hover:bg-[#1E232D] border border-[#1E232D] text-xs font-mono text-purple-300 px-3.5 py-2 flex items-center gap-2 transition-all shrink-0 hover:border-purple-500/30 font-medium"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshingApiStats ? "animate-spin text-purple-400" : ""}`} />
                    FORCE REFRESH
                  </button>
                </div>
              </div>

              {/* Bento Grid 2x4 Stats Card */}
              {apiStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Lifetime Requests</div>
                      <div className="text-xl md:text-2xl font-bold text-white mt-1.5">{apiStats.lifetimeRequests.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <span>●</span> Active Logger
                      </div>
                    </div>

                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Today's Traffic</div>
                      <div className="text-xl md:text-2xl font-bold text-white mt-1.5">{apiStats.todayRequests.toLocaleString()}</div>
                      <div className="text-[10px] text-purple-300 mt-1 flex items-center gap-1">
                        <span>●</span> UTC Cycle
                      </div>
                    </div>

                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Weekly Requests</div>
                      <div className="text-xl md:text-2xl font-bold text-white mt-1.5">{apiStats.weekRequests.toLocaleString()}</div>
                      <div className="text-[10px] text-blue-400 mt-1">Past 7 days</div>
                    </div>

                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Monthly Requests</div>
                      <div className="text-xl md:text-2xl font-bold text-white mt-1.5">{apiStats.monthRequests.toLocaleString()}</div>
                      <div className="text-[10px] text-blue-400 mt-1">Past 30 days</div>
                    </div>

                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Latency</div>
                      <div className="text-xl md:text-2xl font-bold text-emerald-400 mt-1.5">{apiStats.averageLatencyMs}ms</div>
                      <div className="text-[10px] text-slate-400 mt-1">Postgres / Cockroach</div>
                    </div>

                    <div className="bg-[#0F1218] border border-[#1E232D] p-4 font-mono relative overflow-hidden">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Authorization Rate</div>
                      <div className="text-xl md:text-2xl font-bold text-purple-300 mt-1.5">{apiStats.secretKeysAuthorizedRatio}%</div>
                      <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                        <span>●</span> {apiStats.unauthorizedRequests} Blocked
                      </div>
                    </div>
                  </div>

                  {/* Primary charts/distributions split row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                    {/* Traffic Trends */}
                    <div className="lg:col-span-8 bg-[#0F1218] border border-[#1E232D] p-5 flex flex-col h-[320px]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-purple-400" /> Lifetime Query Frequency Trend (30 Days)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Avg: {apiStats.averageRequestsPerDay}/day</span>
                      </div>
                      <div className="flex-1 w-full h-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={apiStats.dailyTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#475569" 
                              fontSize={9} 
                              fontFamily="monospace"
                              tickFormatter={(str) => {
                                const parts = str.split("-");
                                return parts.length > 2 ? `${parts[1]}/${parts[2]}` : str;
                              }}
                            />
                            <YAxis stroke="#475569" fontSize={9} fontFamily="monospace" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#0A0C10", borderColor: "#1E232D" }}
                              labelStyle={{ color: "#94A3B8", fontFamily: "monospace", fontSize: "10px" }}
                              itemStyle={{ color: "#E2E8F0", fontFamily: "monospace", fontSize: "11px" }}
                            />
                            <Area type="monotone" dataKey="count" name="Queries" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Distributions Breakdown */}
                    <div className="lg:col-span-4 bg-[#0F1218] border border-[#1E232D] p-5 flex flex-col h-[320px] overflow-y-auto scrollbar-thin">
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5 text-blue-400" /> Endpoint Traffic Breakdown
                      </span>
                      <div className="space-y-3.5 text-xs font-mono flex-1">
                        {Object.entries(apiStats.distributions.endpoints).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([endpoint, count]) => {
                          const countNum = count as number;
                          const maxCount = Math.max(...Object.values(apiStats.distributions.endpoints) as number[]);
                          const percent = maxCount > 0 ? (countNum / maxCount) * 100 : 0;
                          return (
                            <div key={endpoint}>
                              <div className="flex justify-between items-center text-slate-300 text-[11px] mb-1">
                                <span className="font-semibold text-purple-300 truncate max-w-[200px]" title={endpoint}>
                                  {endpoint}
                                </span>
                                <span className="text-slate-400 shrink-0">{countNum} calls</span>
                              </div>
                              <div className="w-full bg-[#151921] h-1.5 rounded-none overflow-hidden">
                                <div className="bg-purple-500 h-full transition-all" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })}

                        {/* Status Integrity Pill indicators */}
                        <div className="border-t border-[#1E232D]/80 pt-3 mt-4">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-mono">Response Integrity Codes</div>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {Object.entries(apiStats.distributions.statusCodes).map(([code, count]) => {
                              const isSuccess = code.startsWith("2");
                              const isUnauthorized = code === "401";
                              const countNum = count as number;
                              return (
                                <span 
                                  key={code} 
                                  className={`px-2 py-0.5 font-semibold font-mono flex items-center gap-1.5 rounded-none ${
                                    isSuccess ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                    isUnauthorized ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {code}: {countNum}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* REST API Sandbox Quick Tester Link Card */}
                  <div className="bg-[#151921]/40 border border-[#1E232D] p-4 font-mono flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-500/10 text-purple-400 mt-0.5 shrink-0">
                        <Info className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-white font-bold uppercase">Dynamic Spread & news integration embedded</div>
                        <p className="text-slate-400 mt-1 font-sans">
                          When you request candles through the endpoint using administrative credentials, the response embeds dynamic spreads (computed directly from historical bids and asks) and overlays matching high-impact news stories automatically! Use the playground below or external tools to interface.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab("charts");
                        setTimeout(() => {
                          const element = document.getElementById("api-playground-section");
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth" });
                          }
                        }, 100);
                      }}
                      className="cursor-pointer whitespace-nowrap bg-purple-600/10 text-purple-300 hover:bg-purple-600/20 px-3.5 py-1.5 border border-purple-500/20 rounded-none transition-all uppercase tracking-wide font-semibold text-[11px]"
                    >
                      Open API Sandbox Playground →
                    </button>
                  </div>

                  {/* UptimeRobot Keep-Alive Health Integration Card */}
                  <div className="bg-[#151921]/40 border border-[#1E232D] p-4 sm:p-5 font-mono flex flex-col justify-between items-start gap-4 text-xs">
                    <div className="flex flex-col sm:flex-row items-start gap-3 w-full">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                        <HeartPulse className="h-4.5 w-4.5 animate-pulse" />
                      </div>
                      <div className="space-y-1.5 w-full min-w-0">
                        <div className="text-white font-bold uppercase flex items-center gap-1.5 flex-wrap">
                          UptimeRobot Keep-Alive Integration 
                          <span className="text-[10px] lowercase font-normal bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/20">status: bypass-logging</span>
                        </div>
                        <p className="text-slate-400 font-sans leading-relaxed max-w-2xl text-[11px]">
                          Configure your uptime monitoring service (e.g., <span className="text-slate-300 font-mono">UptimeRobot</span> or <span className="text-slate-300 font-mono">Better Stack</span>) with the target health check URL below. This pings the container periodically to override the default Cloud Run scale-to-zero server sleep state. Real-time requests on this endpoint bypass third-party query statistics on your admin telemetry stream.
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2.5 w-full max-w-[500px]">
                          <div className="flex items-center gap-2 bg-[#0F1218] border border-[#1E232D] px-2.5 py-1.5 text-slate-300 rounded-none flex-1 min-w-0">
                            <span className="text-emerald-400 font-mono text-[10px] font-bold shrink-0 select-none">GET</span>
                            <span className="truncate text-slate-400 select-all font-mono text-[10px] flex-1">
                              {window.location.origin}/api/health
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/health`);
                              setCopiedHealthUrl(true);
                              setTimeout(() => setCopiedHealthUrl(false), 2000);
                            }}
                            className="shrink-0 cursor-pointer flex items-center justify-center gap-1.5 bg-[#151921] hover:bg-[#1E232D] border border-[#1E232D] px-3 py-1.5 text-[10px] font-mono text-slate-300 transition-all uppercase select-none font-medium h-[32px]"
                          >
                            {copiedHealthUrl ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" /> COPIED
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> COPY URL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent API Transactions Stream table */}
                  <div className="bg-[#0F1218] border border-[#1E232D] p-5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-purple-400" /> Live Query Registry Stream
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Showing last 35 telemetry frames</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-[#1E232D]/80 text-slate-400 uppercase tracking-widest text-[9px]">
                            <th className="pb-2.5 font-medium">TIMESTAMP</th>
                            <th className="pb-2.5 font-medium">METHOD</th>
                            <th className="pb-2.5 font-medium">ENDPOINT</th>
                            <th className="pb-2.5 font-medium">SOURCE IP</th>
                            <th className="pb-2.5 font-medium">SECURITY STAT</th>
                            <th className="pb-2.5 font-medium">TICKER/TF/SRC</th>
                            <th className="pb-2.5 font-medium text-right">RESPONSE</th>
                            <th className="pb-2.5 font-medium text-right">LATENCY</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E232D]/40 text-slate-300">
                          {apiStats.recentLogs.map((log: any, idx: number) => {
                            const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                            const isUnauthorized = log.statusCode === 401;
                            const timeStr = new Date(log.timestamp).toLocaleTimeString();
                            const paramLabel = log.symbol ? `${log.symbol} (${log.timeframe || "1h"}) [${log.source || "n/a"}]` : "-";
                            
                            return (
                              <tr key={idx} className="hover:bg-[#151921]/30 transition-all group">
                                <td className="py-2 text-slate-500 whitespace-nowrap">{timeStr}</td>
                                <td className="py-2">
                                  <span className={`px-1.5 py-0.5 rounded-none font-bold text-[9px] ${
                                    log.method === "POST" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  }`}>
                                    {log.method}
                                  </span>
                                </td>
                                <td className="py-2 font-semibold text-purple-300 select-all">{log.endpoint}</td>
                                <td className="py-2 text-slate-400">{log.clientIp}</td>
                                <td className="py-2">
                                  {log.secretUsed ? (
                                    <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                      <Check className="h-3 w-3" /> VERIFIED ADMIN
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-sans italic">PUBLIC (UNSEC)</span>
                                  )}
                                </td>
                                <td className="py-2 text-slate-400">{paramLabel}</td>
                                <td className="py-2 text-right">
                                  <span className={`px-1.5 py-0.5 rounded-none font-bold text-[10px] ${
                                    isSuccess ? "bg-emerald-500/10 text-emerald-400" :
                                    isUnauthorized ? "bg-rose-500/10 text-rose-400 font-bold" :
                                    "bg-amber-500/10 text-amber-400"
                                  }`}>
                                    {log.statusCode} {isSuccess ? "OK" : isUnauthorized ? "DENIED" : "ERROR"}
                                  </span>
                                </td>
                                <td className="py-2 text-right">
                                  <span className={`font-semibold ${
                                    log.latencyMs < 50 ? "text-emerald-400" :
                                    log.latencyMs < 150 ? "text-amber-400" : "text-rose-400"
                                  }`}>
                                    {log.latencyMs}ms
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#0F1218] border border-[#1E232D] p-12 text-center flex flex-col items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-purple-400 animate-spin mb-4" />
                  <span className="text-slate-400 font-mono uppercase tracking-wider text-xs">Querying administrative telemetry server...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEMAS TAB */}
          {activeTab === "schemas" && (
            <div className="space-y-6">
              {/* Informative Header indicating Fully Automated Tables */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-45 bg-[#3B82F6]/5 blur-3xl rounded-full" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <DatabaseZap className="h-5 w-5 text-emerald-400" /> DATABASE DEPLOYMENT - FULLY AUTOMATED
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed font-sans">
                  The Express server intercepts database pool events on startup and automatically executes <code className="text-xs text-blue-400 font-mono bg-blue-950/20 px-1 py-0.5 rounded">CREATE TABLE IF NOT EXISTS</code> protocols. You do not need to copy or paste DDL statements; indices and structural ranges generate dynamically.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-[#151921] border border-[#1E232D] rounded-none p-4 flex items-start space-x-3">
                    <div className="bg-emerald-500/10 p-2 text-emerald-400 shrink-0">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">Historical News Ledger</div>
                      <div className="text-sm font-semibold text-white mt-1">Supabase DB Table Verified</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        GIN multi-value index structures active on <code className="text-[10px] text-slate-300 bg-slate-850 px-1 font-mono">tickers text[]</code>. Ready for production streams.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#151921] border border-[#1E232D] rounded-none p-4 flex items-start space-x-3">
                    <div className="bg-blue-500/10 p-2 text-blue-400 shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">Multi-Source Candle Spreads</div>
                      <div className="text-sm font-semibold text-white mt-1">CockroachDB Table Verified</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Composite key range shards active on <code className="text-[10px] text-slate-300 bg-slate-800 px-1 font-mono">(pair, interval, source, timestamp DESC)</code>. Records bid & ask open, high, low, close levels dynamically for exact spreads.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SQL Schema Blueprints list (Collapsible & collapsed by default) */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none p-5 space-y-4">
                <div 
                  className="flex justify-between items-center cursor-pointer select-none group"
                  onClick={() => setIsSchemaBlueprintCollapsed(!isSchemaBlueprintCollapsed)}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                    <Database className="h-4 w-4 text-emerald-400 shrink-0" /> VIEW SQL SCHEMA BLUEPRINTS
                  </h3>
                  <span className="text-xs font-mono text-[#3B82F6] font-bold">
                    {isSchemaBlueprintCollapsed ? "[EXPAND +]" : "[COLLAPSE -]"}
                  </span>
                </div>
                
                {!isSchemaBlueprintCollapsed && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#1E232D]/40 animate-fadeIn font-mono text-xs">
                    {/* Supabase News SQL */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-[#151921] px-3 py-1.5 border border-[#1E232D]/80">
                        <span className="text-emerald-400 font-bold uppercase text-[9px] font-mono">Supabase: history_news</span>
                        <button 
                          type="button"
                          onClick={() => handleCopy(SUPABASE_NEWS_SQL, "supabase_sql")}
                          className="text-[8px] text-slate-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-none font-bold"
                        >
                          {copiedText["supabase_sql"] ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedText["supabase_sql"] ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="p-3 bg-black/90 text-slate-300 font-mono text-[9px] overflow-x-auto leading-normal border border-[#1E232D] max-h-72 custom-scrollbar whitespace-pre text-left">
                        {SUPABASE_NEWS_SQL}
                      </pre>
                    </div>

                    {/* CockroachDB Candles SQL */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-[#151921] px-3 py-1.5 border border-[#1E232D]/80">
                        <span className="text-blue-400 font-bold uppercase text-[9px] font-mono">CockroachDB: pair_candles</span>
                        <button 
                          type="button"
                          onClick={() => handleCopy(COCKROACH_CANDLES_SQL, "cockroach_sql")}
                          className="text-[8px] text-slate-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-none font-bold"
                        >
                          {copiedText["cockroach_sql"] ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedText["cockroach_sql"] ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="p-3 bg-black/90 text-slate-300 font-mono text-[9px] overflow-x-auto leading-normal border border-[#1E232D] max-h-72 custom-scrollbar whitespace-pre text-left">
                        {COCKROACH_CANDLES_SQL}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Database Wipe & Control Panel */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-6 space-y-6 rounded-none">
                <div className="border-b border-[#1E232D] pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> Storage Sanitation Controls (Wipe Tools)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest leading-relaxed">
                    Safely flush database rows from storage engines on live connectors or local memory arrays
                  </p>
                </div>

                {/* Global Wipe Message Banner */}
                {wipeMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 font-mono text-xs text-red-400 flex items-center gap-1.5 animate-fadeIn rounded-none">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{wipeMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supabase News Wiper Card */}
                  <div className="border border-[#1E232D] bg-[#0A0C10] p-5 space-y-5 rounded-none flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Database className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">SUPABASE (history_news)</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        Completely wipe the news ledger table. When a connected Supabase database is active, this fires a standard DDL or API <code className="text-red-400 bg-red-400/5 px-1 rounded font-mono">DELETE</code> statement. If in sandbox mode, it flushes cached mock states.
                      </p>
                    </div>

                    <div>
                      <button
                        onClick={handleWipeSupabase}
                        disabled={isWipingSupabase}
                        className={`w-full text-center py-2.5 font-mono uppercase font-bold text-xs rounded-none transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer border disabled:opacity-40 select-none ${
                          confirmWipeSupabase
                            ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-500 ring-4 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                            : "bg-red-950/25 hover:bg-red-900/35 border-red-900/50 hover:border-red-500 text-red-400"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{isWipingSupabase ? "Executing..." : confirmWipeSupabase ? "CLICK ONCE MORE TO CONFIRM" : "WIPE SUPABASE LEDGER"}</span>
                      </button>
                      {confirmWipeSupabase && (
                        <p className="text-[10px] text-amber-500 text-center uppercase tracking-widest font-mono mt-1.5 animate-pulse">
                          ⚠️ Click again within 4 seconds!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CockroachDB Candles Wiper Card */}
                  <div className="border border-[#1E232D] bg-[#0A0C10] p-5 space-y-5 rounded-none flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">COCKROACH (pair_candles)</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        Empty all candlestick time-series files. If using CockroachDB clusters, it runs structural range truncate protocols. In sandbox environments, it returns existing charts back to empty state ranges.
                      </p>
                    </div>

                    <div>
                      <button
                        onClick={handleWipeCockroach}
                        disabled={isWipingCockroach}
                        className={`w-full text-center py-2.5 font-mono uppercase font-bold text-xs rounded-none transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer border disabled:opacity-40 select-none ${
                          confirmWipeCockroach
                            ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-500 ring-4 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                            : "bg-red-950/25 hover:bg-red-900/35 border-red-900/50 hover:border-red-500 text-red-400"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{isWipingCockroach ? "Executing..." : confirmWipeCockroach ? "CLICK ONCE MORE TO CONFIRM" : "WIPE COCKROACH CANDLES"}</span>
                      </button>
                      {confirmWipeCockroach && (
                        <p className="text-[10px] text-amber-500 text-center uppercase tracking-widest font-mono mt-1.5 animate-pulse">
                          ⚠️ Click again within 4 seconds!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEWS INGESTION PANEL (SUPABASE) */}
          {activeTab === "news" && (
            <div className="space-y-6">
              
              {/* Header block with statistics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                    Historical News Database (history_news)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">
                    Active Storage Source: <span className="text-emerald-400 font-semibold">{newsSource === "supabase" ? "CONNECTED SUPABASE INSTANCE" : "SANDBOX MEMORY COMPONENT"}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={fetchNews}
                    disabled={isLoadingNews}
                    className="p-2 bg-[#151921] hover:bg-[#1E232D] rounded-none border border-[#1E232D] text-slate-400 hover:text-white transition-colors duration-150 cursor-pointer"
                    title="Reload ledger"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingNews ? "animate-spin text-emerald-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* FOREX FACTORY HISTORICAL INGESTION WIDGET */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 sm:p-6 rounded-none space-y-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-40 bg-blue-500/5 blur-3xl rounded-none pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                      <DatabaseZap className="h-4 w-4 text-blue-400" />
                      Forex Factory Data Synchronization Engine
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase font-mono tracking-wider">
                      Batch-process global macroeconomic events (NFP, CPI, ECB decisions) chronologically starting from 2015
                    </p>
                  </div>

                  {/* Operational status indicators */}
                  <div>
                    {syncState.status === "syncing" && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-mono uppercase font-bold tracking-widest flex items-center gap-1.5 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        Live Synchronizing
                      </span>
                    )}
                    {syncState.status === "paused" && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Sync Paused
                      </span>
                    )}
                    {syncState.status === "completed" && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 font-mono uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Up to Date
                      </span>
                    )}
                    {syncState.status === "idle" && (
                      <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-3 py-1 font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-500" />
                        Idle Ready
                      </span>
                    )}
                    {syncState.status === "error" && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Engine Fault
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar and metrics stream */}
                <div className="bg-[#0A0C10] border border-[#1E232D] p-4 rounded-none space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                    <div>
                      <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold mb-1">
                        Timeline Starting Point
                      </span>
                      <span className="font-mono text-xs text-slate-300 font-bold">2015-01-01</span>
                    </div>

                    <div>
                      <span className="block text-[9px] uppercase font-mono tracking-widest text-[#3B82F6] font-bold mb-1">
                        Current Processing At
                      </span>
                      <span className="font-mono text-xs text-white font-black bg-[#151921] px-2.5 py-1 border border-[#1E232D]">
                        {syncState.currentDate || "2015-01-01"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold mb-1">
                        Sync Termination Target
                      </span>
                      <span className="font-mono text-xs text-slate-300 font-bold">
                        {syncState.endDate || "till date"}
                      </span>
                    </div>
                  </div>

                  {/* Real-time bar percentage */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                      <span>Sync Completion Scope</span>
                      <span className="text-blue-450 font-bold">{getSyncPercentage()}%</span>
                    </div>
                    
                    <div className="w-full h-2 bg-[#151921] border border-[#1E232D] rounded-none overflow-hidden">
                      <div
                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out"
                        style={{ width: `${getSyncPercentage()}%` }}
                      />
                    </div>
                  </div>

                  {/* Counters */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#1E232D]/40">
                    <div>
                      Total Ingested Events: <span className="text-[#3B82F6] font-bold">{syncState.totalProcessed} items</span>
                    </div>
                    <div>
                      Resumable Pointer: <span className="text-slate-300 font-semibold">{syncState.lastCompletedDate || "2015-01-01"}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-note and button cluster */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono">
                  <div className="text-[10px] text-slate-500 uppercase leading-relaxed max-w-lg">
                    {syncState.status === "syncing" ? (
                      <span className="text-blue-400 animate-pulse">⚙️ Accessing Forex Factory archives. News items are compiling into database indexes chronologically...</span>
                    ) : syncState.status === "paused" ? (
                      <span>Paused safely. Re-clicking the update button will preserve the pointer and continue from <span className="text-amber-400 font-bold">{syncState.lastCompletedDate}</span>.</span>
                    ) : syncState.status === "completed" ? (
                      <span className="text-emerald-450 font-bold">🟢 Ingestion index fully synced till date! New macroeconomic triggers have successfully consolidated.</span>
                    ) : (
                      <span>Engine idle. Trigger the chronological loop to pull high-priority economic impact indices starting from 2015.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleWipeAllNews}
                      disabled={isWipingAllNews}
                      className={`px-3 py-2 disabled:opacity-40 text-xs font-bold uppercase cursor-pointer select-none transition-all rounded-none border ${
                        confirmWipeAllNews
                          ? "bg-red-950/40 text-red-450 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse"
                          : "bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border-red-905/40 hover:border-red-500"
                      }`}
                      title="Completely wipe all financial news articles from the Supabase database table and reset sync status."
                    >
                      {isWipingAllNews ? "Wiping..." : confirmWipeAllNews ? "CONFIRM FULL DELETE?" : "DELETE ALL NEWS"}
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerSyncAction("reset")}
                      disabled={isSyncActionLoading || syncState.status === "idle"}
                      className="px-3 py-2 bg-[#0A0C10] hover:bg-[#151921] disabled:opacity-40 text-slate-400 hover:text-white border border-[#1E232D] hover:border-slate-705 text-xs font-bold uppercase cursor-pointer select-none transition-all rounded-none"
                      title="Reset pointer to 2015-01-01"
                    >
                      Reset State
                    </button>

                    {syncState.status === "syncing" ? (
                      <button
                        type="button"
                        onClick={() => triggerSyncAction("pause")}
                        disabled={isSyncActionLoading}
                        className="px-5 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-[#0A0C10] text-amber-405 font-bold text-xs uppercase cursor-pointer select-none border border-amber-500/20 hover:border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)] transition-all rounded-none"
                      >
                        Pause Ingest
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerSyncAction("start")}
                        disabled={isSyncActionLoading || syncState.status === "completed"}
                        className="px-5 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs uppercase cursor-pointer select-none shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all rounded-none"
                      >
                        {syncState.status === "paused" ? "Continue Syncing" : "Update Forex News"}
                      </button>
                    )}
                  </div>
                </div>

                {syncState.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 font-mono text-[11px] text-red-400 rounded-none leading-relaxed uppercase tracking-wider">
                    Error reported by cluster thread: {syncState.error}
                  </div>
                )}
              </div>

              {/* Search and filter bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0F1218] border border-[#1E232D] p-4 rounded-none">
                {/* Keyword search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Title or Content..."
                    value={newsSearch}
                    onChange={(e) => setNewsSearch(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1E232D] rounded-none pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                {/* Ticker Search input */}
                <div>
                  <input
                    type="text"
                    placeholder="Filter by Ticker (e.g. BTC, SPY)"
                    value={newsTickerFilter}
                    onChange={(e) => setNewsTickerFilter(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1E232D] rounded-none px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                {/* Sentiment dropdown select */}
                <div>
                  <select
                    value={newsSentimentFilter}
                    onChange={(e) => setNewsSentimentFilter(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1E232D] rounded-none px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="">All Sentiments</option>
                    <option value="bullish">🟢 Bullish</option>
                    <option value="bearish">🔴 Bearish</option>
                    <option value="neutral">⚪ Neutral</option>
                  </select>
                </div>

                {/* Impact Level dropdown select */}
                <div>
                  <select
                    value={newsImpactFilter}
                    onChange={(e) => setNewsImpactFilter(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1E232D] rounded-none px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="">All Impact Levels</option>
                    <option value="high">🔴 High Impact Only</option>
                    <option value="medium">🟠 Medium Impact Only</option>
                    <option value="low">🟡 Low Impact Only</option>
                    <option value="none">⚪ General / Non-Economic</option>
                  </select>
                </div>
              </div>



              {/* News Rows Display Stream */}
              <div className="space-y-4">
                {isLoadingNews ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-[#0F1218] border border-[#1E232D] rounded-none">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Loading articles from timeline cache...</p>
                  </div>
                ) : news.length === 0 ? (
                  <div className="text-center p-12 bg-[#0F1218] border border-[#1E232D] rounded-none space-y-3">
                    <AlertTriangle className="h-6 w-6 mx-auto text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-300">No Articles Found</p>
                      <p className="text-xs text-slate-500 mt-1">Try resetting your search query or configure your real Supabase token parameters.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {news.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="bg-[#0F1218] border border-[#1E232D] hover:border-[#3B82F6]/50 p-5 rounded-none relative transition-all duration-150 flex flex-col justify-between"
                      >
                        {/* Title & Metadata Top Row */}
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-mono text-slate-550 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              {new Date(item.published_at).toLocaleString()}
                            </span>
                            
                            <div className="flex items-center space-x-2">
                              {/* Sentiment status tag */}
                              <span className={`px-2.5 py-0.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold ${
                                item.sentiment === "bullish" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]" 
                                  : item.sentiment === "bearish"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                  : "bg-slate-500/10 text-slate-300 border border-slate-500/20"
                              }`}>
                                {item.sentiment}
                              </span>

                              {/* Impact Badge */}
                              {(() => {
                                const imp = getImpact(item);
                                if (imp === "high") {
                                  return (
                                    <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                      Category: High
                                    </span>
                                  );
                                }
                                if (imp === "medium") {
                                  return (
                                    <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      Category: Medium
                                    </span>
                                  );
                                }
                                if (imp === "low") {
                                  return (
                                    <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                      Category: Low
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold bg-slate-500/10 text-slate-450 border border-slate-500/20">
                                    Category: General
                                  </span>
                                );
                              })()}
                              
                              <span className="text-[11px] font-mono text-slate-400 font-bold bg-[#151921] border border-[#1E232D] px-2 py-0.5 rounded-none">
                                {item.source}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors duration-150">
                            {item.title}
                          </h4>

                          <p className="text-xs text-slate-350 mt-2.5 leading-relaxed">
                            {item.content}
                          </p>
                        </div>

                        {/* Associated Tickers Array Bottom Row */}
                        <div className="border-t border-[#1E232D] mt-4 pt-3.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <Tag className="h-3 w-3 text-slate-500 mr-1" />
                            {item.tickers.length === 0 ? (
                              <span className="text-[10px] text-slate-500 font-mono">None</span>
                            ) : (
                              item.tickers.map(ticker => (
                                <span 
                                  key={ticker}
                                  onClick={() => setNewsTickerFilter(ticker)} 
                                  className="text-[10px] font-mono select-none cursor-pointer bg-[#151921] px-2 py-0.5 border border-[#1E232D] hover:border-[#3B82F6] hover:text-white rounded-none text-slate-400 transition-colors"
                                >
                                  ${ticker}
                                </span>
                              ))
                            )}
                          </div>

                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] font-mono text-slate-400 hover:text-[#3B82F6] flex items-center space-x-0.5 transition-colors"
                            >
                              <span>Original Outlet</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRICE INTERVAL CHARTS (COCKROACHDB) */}
          {activeTab === "charts" && (
            <div className="space-y-6 bg-[#0A0C10]">
              
              {/* Settings selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                    Multi-Interval Candlestick Database (pair_candles)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">
                    Active Storage Source: <span className="text-blue-400 font-semibold">{candlesSource === "cockroach" ? "CONNECTED COCKROACH ENGINE" : "SANDBOX MEMORY CACHE"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={fetchCandles}
                    disabled={isLoadingCandles}
                    className="p-2 bg-[#151921] hover:bg-[#1E232D] rounded-none border border-[#1E232D] text-slate-400 hover:text-white transition-colors duration-150 cursor-pointer"
                    title="Reload candlesticks"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingCandles ? "animate-spin text-blue-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Selector filter bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0F1218] border border-[#1E232D] p-4 rounded-none">
                {/* pair select */}
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">Asset Trading Pair</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const gathered: string[] = [];
                      if (dbStatus.cockroachInstances && Array.isArray(dbStatus.cockroachInstances)) {
                        dbStatus.cockroachInstances.forEach((inst: any) => {
                          if (inst.instance?.pairs && Array.isArray(inst.instance.pairs)) {
                            inst.instance.pairs.forEach((p: string) => {
                              const up = p.trim().toUpperCase();
                              if (up && !gathered.includes(up)) {
                                gathered.push(up);
                              }
                            });
                          }
                        });
                      }
                      const finalPairs = gathered.length > 0 ? gathered : ["BTCUSD", "ETHUSD", "EURUSD", "AAPL"];
                      
                      return finalPairs.map((pair) => (
                        <button
                          key={pair}
                          onClick={() => setSelectedPair(pair)}
                          className={`px-3 py-1.5 rounded-none font-mono text-xs font-bold cursor-pointer border transition-all ${
                            selectedPair.toUpperCase() === pair.toUpperCase()
                              ? "bg-[#151921] text-white border-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                              : "bg-[#0A0C10] border-[#1E232D] text-slate-450 hover:border-[#3B82F6] hover:text-white"
                          }`}
                        >
                          {pair}
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Interval select */}
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">Data Interval (Timeframe/Compaction)</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "1m", "3m", "5m", "15m", "30m", "45m",
                      "1h", "2h", "4h", "6h", "8h", "12h",
                      "1d", "1w", "1M"
                    ].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedInterval(key as MarketInterval)}
                        className={`px-2 py-1.5 min-w-[36px] text-center rounded-none font-mono text-[10px] sm:text-[11px] font-bold cursor-pointer border transition-all ${
                          selectedInterval === key
                            ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            : "bg-[#0A0C10] border-[#1E232D] text-slate-400 hover:border-[#3B82F6] hover:text-white"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visualizer Feed Source select */}
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">Visualizer Feed Source</label>
                  <div className="flex gap-1.5">
                    {(["exness", "dukascopy"] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setSelectedChartSource(src)}
                        className={`flex-1 px-3 py-1.5 rounded-none font-mono text-xs font-bold uppercase cursor-pointer border transition-all ${
                          selectedChartSource === src
                            ? "bg-[#151921] text-white border-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                            : "bg-[#0A0C10] border-[#1E232D] text-slate-400 hover:border-[#3B82F6] hover:text-white"
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
              </div>



              {/* Date/Time Range Filter Bar & Presets */}
              <div className="bg-[#0F1218] border border-[#1E232D] border-t-0 -mt-6 p-4 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mr-1.5">Timeline:</span>
                  {[
                    { label: "1 Week", days: 7 },
                    { label: "1 Month (Default)", days: 30 },
                    { label: "3 Months", days: 90 },
                    { label: "All Historical", days: 0 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (preset.days === 0) {
                          setChartStartDate("");
                          setChartEndDate("");
                          return;
                        }
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - preset.days);
                        setChartStartDate(start.toISOString().split("T")[0]);
                        setChartEndDate(end.toISOString().split("T")[0]);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer rounded-none ${
                        (preset.days === 30 && chartStartDate && !chartEndDate) || 
                        (preset.days === 30 && chartStartDate && chartEndDate && Math.round((new Date(chartEndDate).getTime() - new Date(chartStartDate).getTime()) / (1000*3600*24)) === 30)
                          ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                          : "border-[#1E232D] bg-[#0A0C10] hover:bg-[#151921] text-slate-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">From</span>
                    <input
                      type="date"
                      value={chartStartDate}
                      onChange={(e) => setChartStartDate(e.target.value)}
                      className="bg-[#0A0C10] border border-[#1E232D] rounded-none px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">To</span>
                    <input
                      type="date"
                      value={chartEndDate}
                      onChange={(e) => setChartEndDate(e.target.value)}
                      className="bg-[#0A0C10] border border-[#1E232D] rounded-none px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                      <span>{selectedPair}</span>
                      <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-none uppercase">{selectedInterval} timeframe</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Interactive TradingView charting interface inside sandboxed timeline parameters.</p>
                  </div>
                  
                  {candles.length > 0 && (
                    <div className="text-right">
                      <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Compacted Price</span>
                      <span className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                        ${candles[candles.length - 1]?.close}
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-96 border border-[#1E232D]/45 bg-[#06080B] overflow-hidden">
                  <TradingViewStyleChart
                    data={candles}
                    pairName={selectedPair}
                    timeframe={selectedInterval}
                    isLoading={isLoadingCandles}
                  />
                </div>
              </div>

              {/* Collapsible News Section for the Specific Date Range */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none overflow-hidden animate-fade-in">
                <div 
                  onClick={() => setIsChartNewsExpanded(!isChartNewsExpanded)}
                  className="p-4 border-b border-[#1E232D] bg-[#151921] flex items-center justify-between cursor-pointer hover:bg-[#1E242E] transition-colors select-none"
                >
                  <div className="flex items-center space-x-2">
                    {isChartNewsExpanded ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    <span className="text-xs font-bold text-[#E0E6ED] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Newspaper className="h-4 w-4 text-emerald-500" />
                      Collapsible News Feed: {selectedPair} ({chartStartDate || "Beginning"} to {chartEndDate || "Present"})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {(() => {
                        const newsMap = new Map();
                        candles.forEach(c => {
                          if (c.news && Array.isArray(c.news)) {
                            c.news.forEach(n => {
                              if (n && n.id) newsMap.set(n.id, n);
                            });
                          }
                        });
                        return newsMap.size;
                      })()} articles loaded in timeframe
                    </span>
                    <span className="text-[10px] bg-[#1E232D] text-slate-400 px-1.5 py-0.5 rounded-none font-mono uppercase font-bold">
                      {isChartNewsExpanded ? "Hide" : "Expand"}
                    </span>
                  </div>
                </div>

                {isChartNewsExpanded && (
                  <div className="p-4 max-h-80 overflow-y-auto space-y-3 bg-[#0A0C10] scrollbar-thin">
                    {(() => {
                      const newsMap = new Map();
                      candles.forEach(c => {
                        if (c.news && Array.isArray(c.news)) {
                          c.news.forEach(n => {
                            if (n && n.id) newsMap.set(n.id, n);
                          });
                        }
                      });
                      const uniqueNews = Array.from(newsMap.values()).sort(
                        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
                      );

                      if (uniqueNews.length === 0) {
                        return (
                          <div className="text-center py-6 text-xs font-mono text-slate-550 uppercase">
                            No news articles archived for {selectedPair} matching the selected timeline.
                          </div>
                        );
                      }

                      return uniqueNews.map((item: any, idx: number) => {
                        const isBullish = item.sentiment === "bullish";
                        const isBearish = item.sentiment === "bearish";
                        const badgeColor = isBullish 
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" 
                          : isBearish 
                            ? "border-rose-500/30 text-rose-450 bg-rose-500/10" 
                            : "border-slate-500/30 text-slate-450 bg-slate-500/10";
                        
                        const impactColor = item.impact === "high"
                          ? "text-red-400 border-red-500/20 bg-red-950/20"
                          : item.impact === "medium"
                            ? "text-amber-400 border-amber-500/20 bg-amber-950/20"
                            : "text-slate-400 border-slate-750/20 bg-slate-900/10";

                        return (
                          <div 
                            key={item.id || idx} 
                            className="p-3 border border-[#1E232D] bg-[#0F1218] flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] uppercase font-mono tracking-wider font-bold border px-1.5 py-0.5 ${badgeColor}`}>
                                  {item.sentiment}
                                </span>
                                {item.impact && item.impact !== "none" && (
                                  <span className={`text-[9px] uppercase font-mono tracking-wider font-bold border px-1.5 py-0.5 ${impactColor}`}>
                                    Category: {item.impact}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(item.published_at).toUTCString()}
                                </span>
                                <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/5 px-2.5">
                                  {item.source}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-200">{item.title}</h5>
                              <p className="text-slate-400 leading-relaxed text-[11px] font-sans">{item.content}</p>
                            </div>
                            
                            {item.tickers && Array.isArray(item.tickers) && item.tickers.length > 0 && (
                              <div className="flex flex-wrap md:flex-col gap-1 items-end pt-1">
                                {item.tickers.map((term: string) => (
                                  <span 
                                    key={term} 
                                    className="px-1.5 py-0.5 bg-[#171B24] border border-[#232A37] text-[9px] font-mono text-slate-500 hover:bg-[#1E232D] transition-colors cursor-pointer uppercase font-bold"
                                  >
                                    #{term}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Data Table of metrics in timeframe */}
              <div className="bg-[#0F1218] border border-[#1E232D] rounded-none overflow-hidden animate-fade-in">
                <div 
                  onClick={() => setShowHistoricalLogs(!showHistoricalLogs)}
                  className="p-4 border-b border-[#1E232D] bg-[#151921] flex items-center justify-between cursor-pointer hover:bg-[#1E242E] transition-colors select-none"
                >
                  <div className="flex items-center space-x-2">
                    {showHistoricalLogs ? <ChevronUp className="h-4 w-4 text-blue-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    <span className="text-xs font-bold text-[#E0E6ED] uppercase font-mono tracking-wider">Historical Logs ({selectedPair})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{candles.length} periods active</span>
                    <span className="text-[10px] bg-[#1E232D] text-slate-400 px-1.5 py-0.5 rounded-none font-mono uppercase font-bold">
                      {showHistoricalLogs ? "Hide" : "Expand"}
                    </span>
                  </div>
                </div>
                
                {showHistoricalLogs && (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px] sm:text-xs font-mono">
                      <thead className="bg-[#0A0C10] text-slate-400 border-b border-[#1E232D] sticky top-0">
                        <tr>
                          <th className="p-2 sm:p-3 uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">Sequence Time (UTC)</th>
                          <th className="p-2 sm:p-3 uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">Open</th>
                          <th className="p-2 sm:p-3 uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">High</th>
                          <th className="p-2 sm:p-3 uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">Low</th>
                          <th className="p-2 sm:p-3 uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">Close</th>
                          <th className="p-2 sm:p-3 text-right uppercase tracking-wider text-[9px] sm:text-[10px] whitespace-nowrap">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1D23] text-slate-350">
                        {candles.map((c, i) => {
                          const openVal = c.bid_open !== undefined ? c.bid_open : (c.open ?? 0);
                          const highVal = c.bid_high !== undefined ? c.bid_high : (c.high ?? 0);
                          const lowVal = c.bid_low !== undefined ? c.bid_low : (c.low ?? 0);
                          const closeVal = c.bid_close !== undefined ? c.bid_close : (c.close ?? 0);
                          return (
                            <tr key={c.id || i} className="hover:bg-[#151921]/55 transition-colors">
                              <td className="p-2 sm:p-3 text-slate-405 whitespace-nowrap">{new Date(c.timestamp).toLocaleString()}</td>
                              <td className="p-2 sm:p-3 whitespace-nowrap">${openVal.toFixed(selectedPair.toUpperCase().includes("JPY") ? 3 : 5)}</td>
                              <td className="p-2 sm:p-3 text-emerald-500/90 whitespace-nowrap">${highVal.toFixed(selectedPair.toUpperCase().includes("JPY") ? 3 : 5)}</td>
                              <td className="p-2 sm:p-3 text-rose-500/90 whitespace-nowrap">${lowVal.toFixed(selectedPair.toUpperCase().includes("JPY") ? 3 : 5)}</td>
                              <td className="p-2 sm:p-3 font-semibold text-slate-300 whitespace-nowrap">${closeVal.toFixed(selectedPair.toUpperCase().includes("JPY") ? 3 : 5)}</td>
                              <td className="p-2 sm:p-3 text-right text-slate-400 whitespace-nowrap">{c.volume.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION: 03.01. WAREHOUSE SOURCE API TESTING PLAYGROUND */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 sm:p-6 rounded-none space-y-6 relative overflow-hidden animate-fade-in mt-6">
                <div className="absolute right-0 top-0 h-32 w-32 bg-blue-500/5 blur-2xl pointer-events-none" />
                
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Terminal className="h-4.5 w-4.5 text-blue-400" />
                    <span>03.01. WAREHOUSE SOURCE API TESTING SANDBOX & SIMULATOR</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest leading-normal">
                    Securely test responses from the remote core analytics database (https://datawarehouse-vi6d.onrender.com).
                  </p>
                </div>

                <form onSubmit={handleTestApi} className="bg-[#0A0C10] border border-[#1E232D] p-4 space-y-4 rounded-none">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">Symbol</label>
                      <select
                        value={apiSymbol}
                        onChange={(e) => setApiSymbol(e.target.value)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono uppercase cursor-pointer"
                      >
                        {(() => {
                          const gathered: string[] = [];
                          if (dbStatus.cockroachInstances && Array.isArray(dbStatus.cockroachInstances)) {
                            dbStatus.cockroachInstances.forEach((inst: any) => {
                              if (inst.instance?.pairs && Array.isArray(inst.instance.pairs)) {
                                inst.instance.pairs.forEach((p: string) => {
                                  const up = p.trim().toUpperCase();
                                  if (up && !gathered.includes(up)) {
                                    gathered.push(up);
                                  }
                                });
                              }
                            });
                          }
                          const finalPairs = gathered.length > 0 ? gathered : ["BTCUSD", "ETHUSD", "EURUSD", "AAPL"];
                          return finalPairs.map((pair) => (
                            <option key={pair} value={pair}>{pair}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">Source</label>
                      <select
                        value={apiSource}
                        onChange={(e) => setApiSource(e.target.value)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="exness">Exness Feed</option>
                        <option value="dukascopy">Dukascopy Feed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">Timeframe</label>
                      <select
                        value={apiTimeframe}
                        onChange={(e) => setApiTimeframe(e.target.value)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono"
                      >
                        {["1m", "3m", "5m", "15m", "30m", "45m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "1w", "1M"].map((tf) => (
                          <option key={tf} value={tf}>{tf}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">Query Limit</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={apiLimit}
                        onChange={(e) => setApiLimit(parseInt(e.target.value) || 200)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={apiStartTime}
                        onChange={(e) => setApiStartTime(e.target.value)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={apiEndTime}
                        onChange={(e) => setApiEndTime(e.target.value)}
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-white p-2 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-slate-405 mb-1.5">X-API-Secret Key</label>
                      <input
                        type="text"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Secret Token"
                        className="w-full bg-[#151921] border border-[#1E232D] text-xs text-amber-400 p-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-650"
                      />
                    </div>
                  </div>

                  <div className="flex border-t border-[#1E232D] pt-3 justify-between items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                      ⚡ Action proxies query through server node to append administrative security signatures.
                    </span>
                    <button
                      type="submit"
                      disabled={isTestingApi}
                      className="px-5 py-2 hover:opacity-90 active:scale-[0.99] font-mono uppercase text-xs font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center gap-2 cursor-pointer transition-all rounded-none"
                    >
                      {isTestingApi ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Executing Stream Fetch...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="h-3.5 w-3.5" />
                          <span>FETCH TARGET WAREHOUSE API</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* API Output Visual Frame */}
                {apiResultError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 font-mono text-xs text-rose-450 space-y-2 uppercase">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                      API Query Execution Failure
                    </p>
                    <pre className="text-[11px] whitespace-pre-wrap lowercase">{apiResultError}</pre>
                  </div>
                )}

                {apiTestingResult && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Live Query Terminal Header */}
                    <div className="bg-[#0A0C10] border border-[#1E232D] p-3.5 font-mono text-[11px] text-slate-400 leading-snug space-y-1">
                      <div className="flex items-center text-emerald-400 font-bold uppercase gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>HTTP REQUEST DISPATCHED SUCCESSFULLY</span>
                      </div>
                      <p>
                        <span className="text-blue-400 font-bold">GET</span>{" "}
                        <span className="text-slate-100 font-semibold break-all">
                          /api/warehouse-candles?symbol={apiSymbol.toUpperCase()}&source={apiSource.toLowerCase()}&timeframe={apiTimeframe.toLowerCase()}{apiLimit ? `&limit=${apiLimit}` : ""}{apiStartTime ? `&startTime=${apiStartTime}` : ""}{apiEndTime ? `&endTime=${apiEndTime}` : ""}
                        </span>
                      </p>
                      <div className="flex justify-between items-center gap-4 flex-wrap pt-1 border-t border-[#1E232D]/45 mt-1">
                        <span>Headers: <span className="text-amber-400 font-semibold">X-API-Secret: {apiSecret ? "*".repeat(Math.min(10, apiSecret.length)) : "none"}</span></span>
                        <span>Response weight: <span className="text-slate-100 font-bold">{(apiTestingResult.data || apiTestingResult).length || 0} Periods</span></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Deployed Candles visual Chart */}
                      <div className="bg-[#0F1218] border border-[#1E232D] rounded-none overflow-hidden flex flex-col h-[400px]">
                        <div className="p-3 border-b border-[#1E232D] bg-[#151921] flex justify-between items-center">
                          <span className="text-xs font-bold text-[#E0E6ED] uppercase font-mono tracking-wider flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-blue-400" />
                            TRADINGVIEW API RENDER CHART
                          </span>
                          <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Active JSON Stream</span>
                        </div>
                        <div className="flex-1 min-h-0 bg-[#06080B]">
                          <TradingViewStyleChart
                            data={apiTestingResult.data || apiTestingResult || []}
                            pairName={apiSymbol.toUpperCase()}
                            timeframe={apiTimeframe}
                          />
                        </div>
                      </div>

                      {/* Right: Indented JSON terminal readout */}
                      <div className="bg-[#0F1218] border border-[#1E232D] rounded-none overflow-hidden flex flex-col h-[400px]">
                        <div className="p-3 border-b border-[#1E232D] bg-[#151921] flex justify-between items-center">
                          <span className="text-xs font-bold text-[#E0E6ED] uppercase font-mono tracking-wider">
                            API JSON RESPONSE PAYLOAD (PRE-RAW)
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (rawJsonOutput) {
                                  navigator.clipboard.writeText(rawJsonOutput);
                                  setCopiedPlaygroundText(true);
                                  setTimeout(() => setCopiedPlaygroundText(false), 2000);
                                }
                              }}
                              className="px-2 py-1 bg-[#1E232D] hover:bg-[#2A313E] rounded-none text-[10px] font-mono text-slate-300 font-bold border border-[#2D3543] cursor-pointer transition-colors"
                            >
                              {copiedPlaygroundText ? "✓ COPIED" : "🗏 COPY RAW"}
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-[#030406] p-4 text-xs font-mono text-emerald-400 leading-normal scrollbar-thin">
                          {rawJsonOutput ? (
                            <pre className="whitespace-pre">{rawJsonOutput}</pre>
                          ) : (
                            <span className="italic text-slate-550 font-mono uppercase">Decoding stream rows...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scrollable news matching this API call */}
                    <div className="bg-[#0F1218] border border-[#1E232D] rounded-none overflow-hidden flex flex-col mt-4">
                      <div className="p-3 border-b border-[#1E232D] bg-[#151921] flex justify-between items-center">
                        <span className="text-xs font-bold text-[#E0E6ED] uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <Newspaper className="h-4 w-4 text-blue-400" />
                          Scrollable News Feed Falling Within This API Call Timeline
                        </span>
                        <div className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-none font-mono font-bold uppercase">
                          {(() => {
                            const newsMap = new Map();
                            const rawArr = apiTestingResult.data || apiTestingResult || [];
                            if (Array.isArray(rawArr)) {
                              rawArr.forEach((c: any) => {
                                if (c.news && Array.isArray(c.news)) {
                                  c.news.forEach((n: any) => {
                                    if (n && n.id) newsMap.set(n.id, n);
                                  });
                                }
                              });
                            }
                            return newsMap.size;
                          })()} Matches Located
                        </div>
                      </div>
                      <div className="p-4 bg-[#0A0C10] h-64 overflow-y-auto space-y-3.5 scrollbar-thin">
                        {(() => {
                          const newsMap = new Map();
                          const rawArr = apiTestingResult.data || apiTestingResult || [];
                          if (Array.isArray(rawArr)) {
                            rawArr.forEach((c: any) => {
                              if (c.news && Array.isArray(c.news)) {
                                c.news.forEach((n: any) => {
                                  if (n && n.id) newsMap.set(n.id, n);
                                });
                              }
                            });
                          }
                          const uniqueNews = Array.from(newsMap.values()).sort(
                            (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
                          );

                          if (uniqueNews.length === 0) {
                            return (
                              <div className="text-center py-10 text-xs font-mono text-slate-550 uppercase">
                                No historical news articles matched the timestamp periods of candles returned in this JSON payload.
                              </div>
                            );
                          }

                          return uniqueNews.map((item: any, idx: number) => {
                            const isBullish = item.sentiment === "bullish";
                            const isBearish = item.sentiment === "bearish";
                            const badgeColor = isBullish 
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" 
                              : isBearish 
                                ? "border-rose-500/30 text-rose-450 bg-rose-500/10" 
                                : "border-slate-500/30 text-slate-450 bg-slate-500/10";
                            
                            const impactColor = item.impact === "high"
                              ? "text-red-400 border-red-500/20 bg-red-950/20"
                              : item.impact === "medium"
                                ? "text-amber-400 border-amber-500/20 bg-amber-950/20"
                                : "text-slate-400 border-slate-750/20 bg-slate-900/10";

                            return (
                              <div 
                                key={item.id || idx} 
                                className="p-3 border border-[#1E232D] bg-[#0F1218] flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                              >
                                <div className="space-y-1.5 flex-1 pr-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[9px] uppercase font-mono tracking-wider font-bold border px-1.5 py-0.5 ${badgeColor}`}>
                                      {item.sentiment}
                                    </span>
                                    {item.impact && item.impact !== "none" && (
                                      <span className={`text-[9px] uppercase font-mono tracking-wider font-bold border px-1.5 py-0.5 ${impactColor}`}>
                                        Category: {item.impact}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {new Date(item.published_at).toUTCString()}
                                    </span>
                                    <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/5 px-2.5">
                                      {item.source}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-slate-200">{item.title}</h5>
                                  <p className="text-slate-400 leading-relaxed text-[11px] font-sans">{item.content}</p>
                                </div>
                                
                                {item.tickers && Array.isArray(item.tickers) && item.tickers.length > 0 && (
                                  <div className="flex flex-wrap md:flex-col gap-1 items-end pt-1">
                                    {item.tickers.map((term: string) => (
                                      <span 
                                        key={term} 
                                        className="px-1.5 py-0.5 bg-[#171B24] border border-[#232A37] text-[9px] font-mono text-slate-500 hover:bg-[#1E232D] transition-colors cursor-pointer uppercase font-bold"
                                      >
                                        #{term}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: CONNECTION WORKFLOW PANELS */}
          {activeTab === "connection" && (
            <div className="space-y-6">
              
              {/* CockroachDB Instances Controller Panel */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 sm:p-6 rounded-none space-y-6 relative overflow-hidden animate-fadeIn">
                <div className="absolute right-0 top-0 h-40 w-40 bg-blue-500/5 blur-3xl rounded-none pointer-events-none" />
                
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <DatabaseZap className="h-5 w-5 text-blue-400" />
                    COCKROACHDB MULTI-INSTANCE CLUSTERS
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest leading-relaxed">
                    Configure multiple databases. Dynamically assign up to 10 unique asset pairs per instance.
                  </p>
                </div>

                {/* Environment Configuration Banner */}
                <div 
                  className="bg-[#0A0C10] border border-[#1E232D] p-4 flex justify-between items-center select-none"
                >
                  <span className="text-xs font-mono font-bold text-[#3B82F6] uppercase tracking-wider flex items-center space-x-2">
                    <span>🌐 ENVIRONMENT CONFIGURATION DRIVEN</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 italic uppercase">
                    Read-Only Mode
                  </span>
                </div>

                {/* Auto-Ingest Master Configuration Widget */}
                <div className="bg-[#0D1016]/85 border border-[#1E232D] p-5 space-y-4 animate-fadeIn relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                    <DatabaseZap className="h-20 w-20 text-blue-500" />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[8.5px] uppercase font-mono font-bold tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        ⚡ Background Service
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2 mt-1">
                        Automated Live Feed Ingestion Engine
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xl">
                        When enabled, newly added assets, as well as missing timelines, are automatically synced and ingested in the background without needing your local user session to remain active.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAutoIngest(!autoIngestConfig.enabled)}
                        disabled={isSavingAutoIngest}
                        className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all duration-200 border cursor-pointer ${
                          autoIngestConfig.enabled
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/35"
                            : "bg-slate-500/5 hover:bg-slate-500/10 text-slate-400 border-slate-700/60"
                        }`}
                      >
                        {isSavingAutoIngest ? (
                          <span className="flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Syncing...
                          </span>
                        ) : autoIngestConfig.enabled ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            ● Active (Enabled)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            ○ Inactive (Disabled)
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1E232D]/40 mt-3 font-mono">
                    <div className="flex flex-col justify-center space-y-1">
                      <span className="text-[9px] uppercase text-slate-500">Auto Ingestion Feed Source:</span>
                      <span className="text-[10px] text-slate-300 uppercase font-bold">
                        Using {autoIngestConfig.source || "exness"} data provider
                      </span>
                    </div>

                    <div className="flex items-center gap-2 justify-start sm:justify-end">
                      <button
                        onClick={() => handleUpdateAutoIngestSource("exness")}
                        disabled={isSavingAutoIngest || autoIngestConfig.source === "exness"}
                        className={`px-2.5 py-1 text-[8.5px] font-bold uppercase border transition-all cursor-pointer ${
                          autoIngestConfig.source === "exness"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-[#0A0C10] hover:bg-[#121620] text-slate-400 border-slate-800"
                        }`}
                      >
                        Exness Client
                      </button>
                      <button
                        onClick={() => handleUpdateAutoIngestSource("dukascopy")}
                        disabled={isSavingAutoIngest || autoIngestConfig.source === "dukascopy"}
                        className={`px-2.5 py-1 text-[8.5px] font-bold uppercase border transition-all cursor-pointer ${
                          autoIngestConfig.source === "dukascopy"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-[#0A0C10] hover:bg-[#121620] text-slate-400 border-slate-800"
                        }`}
                      >
                        Dukascopy Client
                      </button>
                    </div>
                  </div>
                </div>

                {/* Displaying Cockroach instances list */}
                <div className="space-y-4 mt-6">
                  <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 border-b border-[#1E232D] pb-1.5 flex justify-between">
                    <span>Active Clusters</span>
                    <span>Total: {dbStatus.cockroachInstances?.length || 0}</span>
                  </div>

                  {(!dbStatus.cockroachInstances || dbStatus.cockroachInstances.length === 0) ? (
                    <div className="text-center p-8 bg-[#0A0C10] border border-[#1E232D] text-xs text-slate-500 font-mono uppercase tracking-widest">
                      No CockroachDB Clusters provisioned yet. Using sandboxed memory engine.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {dbStatus.cockroachInstances.map((instInfo: any) => {
                        const { instance, connected, diagnostics, error } = instInfo;
                        const isWipeConfirming = confirmWipeInstId === instance.id;

                        return (
                          <div
                            key={instance.id}
                            className="bg-[#0A0C10] border border-[#1E232D] p-4 flex flex-col md:flex-row justify-between gap-4 rounded-none transition-all hover:border-[#1E232D]/90"
                          >
                            <div className="space-y-2.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" : "bg-amber-400"}`} />
                                <h4 className="text-xs font-bold text-slate-100 font-mono uppercase">
                                  {instance.name}
                                </h4>
                                <span className={`text-[9px] px-1.5 py-0.5 font-mono uppercase font-bold ${connected ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/15 text-amber-300 border border-amber-500/20"}`}>
                                  {connected ? "Live Connected" : "Sandbox Mode"}
                                </span>
                              </div>

                              {error && (
                                <div className="mt-2 bg-rose-500/5 border border-rose-500/15 rounded-none p-2.5 text-[9.5px] font-mono text-rose-300 leading-normal flex items-start gap-2 animate-fadeIn">
                                  <ShieldAlert className="h-4 w-4 text-rose-450 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <span className="font-bold uppercase text-rose-400">Database Connection Log:</span>
                                    <p className="break-all text-slate-300">{error}</p>
                                  </div>
                                </div>
                              )}

                              {/* Configured pairs tags */}
                              <div className="space-y-3.5 border-t border-[#1E232D]/40 pt-2.5">
                                {(() => {
                                  const selectedSource = selectedSources[instance.id] || "exness";
                                  return (
                                    <>
                                      {/* Source selector tabs at the top */}
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#0E121A] border border-[#1E232D]/85 p-2">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">Historical Dataset Feed</span>
                                          <span className="text-[8px] font-mono uppercase text-slate-500">Inject pairs to CockroachDB</span>
                                        </div>
                                        <div className="flex bg-[#07090D] border border-[#1E232D] p-0.5 space-x-0.5 self-start sm:self-auto">
                                          {(["exness", "dukascopy"] as const).map((src) => (
                                            <button
                                              key={src}
                                              type="button"
                                              onClick={() => setSelectedSources((prev) => ({ ...prev, [instance.id]: src }))}
                                              className={`px-3 py-1 text-[9px] font-mono uppercase font-bold transition-all rounded-none cursor-pointer ${
                                                selectedSource === src
                                                  ? "bg-blue-500 text-white font-mono shadow-sm"
                                                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1E232D]/30"
                                              }`}
                                            >
                                              {src}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Source Feed Schema Reference Card */}
                                      <div className="bg-[#0A0D14]/90 border border-[#1E232D] p-3 space-y-2 rounded-none">
                                        <div className="flex items-center justify-between border-b border-[#1E232D]/65 pb-1.5">
                                          <div className="flex items-center space-x-2">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-mono uppercase font-bold text-slate-200">
                                              {selectedSource.toUpperCase()} Schema Blueprint
                                            </span>
                                          </div>
                                          <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 uppercase font-medium">
                                            Auto-Resampled to 1m, 1h, 1w
                                          </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px] font-mono leading-relaxed">
                                          <div className="space-y-1.5">
                                            <div className="text-slate-400 font-bold uppercase text-[8px]">Raw Source File Header & Format:</div>
                                            {selectedSource === "exness" && (
                                              <div className="bg-[#05070A] p-2 border border-[#1E232D]/40 rounded-none text-slate-300">
                                                <div className="text-blue-400 font-bold text-[8px]"># Columns (Tick-by-Tick ZIP):</div>
                                                <div className="text-[8px] text-emerald-400 select-all border border-emerald-500/10 bg-emerald-500/5 px-1 py-0.5 font-sans mt-0.5 mb-1.5">Symbol, Date, Time (ms/offset), Bid, Ask</div>
                                                <div className="text-[7.5px] text-slate-500 font-bold uppercase">Example Row:</div>
                                                <div className="text-[8px] text-slate-400 select-all font-sans">EURUSD,2015-08-10,00:01:00.123,1.09624,1.09631</div>
                                              </div>
                                            )}
                                            {selectedSource === "dukascopy" && (
                                              <div className="bg-[#05070A] p-2 border border-[#1E232D]/40 rounded-none text-slate-300">
                                                <div className="text-blue-400 font-bold text-[8px]"># Binary BI5 (Decompressed Ticks):</div>
                                                <div className="text-[8px] text-emerald-400 select-all border border-emerald-500/10 bg-emerald-500/5 px-1 py-0.5 font-sans mt-0.5 mb-1.5">Time Offset (ms), Ask (x100k), Bid (x100k), AskVol, BidVol</div>
                                                <div className="text-[7.5px] text-slate-500 font-bold uppercase">Parsed Representation:</div>
                                                <div className="text-[8px] text-slate-400 select-all font-sans">Offset: 2500ms, Bid: 1.09620, Ask: 1.09628, Vol: 1.50</div>
                                              </div>
                                            )}
                                          </div>

                                          <div className="space-y-1.5">
                                            <div className="text-slate-400 font-bold uppercase text-[8px]">CockroachDB Physical Storage:</div>
                                            <div className="bg-[#05070A] p-2 border border-[#1E232D]/40 rounded-none text-slate-300 space-y-1">
                                              <div className="text-blue-400 font-bold text-[8px]"># Table: <span className="text-slate-200 uppercase font-mono">public.pair_candles</span></div>
                                              <div className="text-[8px] text-amber-500/90 font-bold uppercase">
                                                PrimaryKey UNIQUE (pair, interval, source, timestamp DESC)
                                              </div>
                                              <div className="text-[8px] text-slate-400 leading-normal">
                                                Unlike raw feed storage which saves redundant millisecond ticks, all tick streams are aggregated directly in-memory to target intervals before ingestion.
                                              </div>
                                              <div className="text-[8.5px] text-emerald-500 font-bold">
                                                ✓ Guaranteed 100% Unique, No Duplicates, High Compression
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
                                        <span className="text-[10px] font-mono uppercase font-bold text-slate-300">
                                          Asset Pair Ingestions ({selectedSource.toUpperCase()}):
                                        </span>
                                        <label className="inline-flex items-center space-x-2.5 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={enableTerminalConsoleLogs}
                                            onChange={(e) => setEnableTerminalConsoleLogs(e.target.checked)}
                                            className="form-checkbox h-3.5 w-3.5 rounded-none border-[#1E232D] bg-[#07090D] text-blue-500 font-mono focus:ring-0 cursor-pointer"
                                          />
                                          <span className="text-[9px] font-mono uppercase text-slate-400 font-bold hover:text-slate-200 transition-colors">
                                            Enable terminal stdout log stream
                                          </span>
                                        </label>
                                      </div>

                                      {/* Add Custom Pair Form */}
                                      <div className="bg-[#0A0D14] p-3 border border-[#1E232D] space-y-2 mb-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] font-mono uppercase text-blue-400 font-bold">Add Custom Asset / Pair Symbol</span>
                                          <span className="text-[8px] font-mono text-slate-500 uppercase">E.G. GBPUSD, BTCUSD, AAPL</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            placeholder="ENTER SYMBOL (e.g. GBPAUD)"
                                            id={`add-pair-input-${instance.id}`}
                                            className="flex-1 bg-[#05070A] border border-[#1E232D] text-[10px] font-mono uppercase px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500/80 rounded-none placeholder-slate-600"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                const val = e.currentTarget.value;
                                                handleAddCustomPair(instance.id, val);
                                                e.currentTarget.value = "";
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const inputEl = document.getElementById(`add-pair-input-${instance.id}`) as HTMLInputElement;
                                              if (inputEl) {
                                                handleAddCustomPair(instance.id, inputEl.value);
                                                inputEl.value = "";
                                              }
                                            }}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-[9px] font-mono uppercase font-bold transition-all rounded-none cursor-pointer"
                                          >
                                            Add Asset
                                          </button>
                                        </div>
                                      </div>

                                      {instance.pairs && instance.pairs.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {instance.pairs.map((p: string) => {
                                            const pUpper = p.trim().toUpperCase();
                                            const stateKey = `${instance.id}:${pUpper}:${selectedSource}`;
                                            const ingestJob = ingestStates[stateKey];
                                            const isRunning = ingestJob?.status === "running";
                                            const isCompleted = ingestJob?.status === "completed";
                                            const isError = ingestJob?.status === "error";

                                            return (
                                              <div key={p} className="flex flex-col bg-[#0F1218] border border-[#1E232D]/80 p-2 space-y-2 rounded-none">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-mono font-bold text-slate-200 uppercase">{p}</span>
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      disabled={isRunning}
                                                      onClick={() => handleTriggerPairIngest(instance.id, p, selectedSource)}
                                                      className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded-none cursor-pointer transition-all border shrink-0 ${
                                                        isRunning
                                                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                          : "bg-blue-500 hover:bg-blue-600 border-blue-400 text-white"
                                                      }`}
                                                    >
                                                      {isRunning ? "Ingesting..." : isCompleted ? "Update Feed" : "Ingest Data"}
                                                    </button>
                                                    {(() => {
                                                      const statsForPair = instInfo.pairSourceStats?.filter((s: any) => 
                                                        s.pair.toLowerCase() === p.trim().toLowerCase()
                                                      );
                                                      const hasData = !!(statsForPair && statsForPair.some((s: any) => (s.count ?? 0) > 0));
                                                      if (hasData) return null;
                                                      return (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRemoveCustomPair(instance.id, p)}
                                                          className="p-1 hover:bg-rose-950/40 text-rose-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all rounded-none cursor-pointer shrink-0"
                                                          title={`Remove ${p} config`}
                                                        >
                                                          <X className="h-3.5 w-3.5" />
                                                        </button>
                                                      );
                                                    })()}
                                                  </div>
                                                </div>

                                                {/* Database Local Feed Analytics */}
                                                {(() => {
                                                  const statsObj = instInfo.pairSourceStats?.find((s: any) => 
                                                    s.pair.toLowerCase() === p.trim().toLowerCase() && 
                                                    s.source.toLowerCase() === selectedSource.toLowerCase()
                                                  );
                                                  return (
                                                    <div className="bg-[#07090D] p-1.5 border border-[#1E232D]/40 text-[9px] font-mono space-y-1">
                                                      <div className="flex justify-between text-slate-400">
                                                        <span>WEEK RANGE:</span>
                                                        <span className="font-bold text-blue-400">
                                                          {statsObj ? `${statsObj.startWeek} - ${statsObj.endWeek}` : "N/A"}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between text-slate-400">
                                                        <span>STORAGE SIZE:</span>
                                                        <span className="font-bold text-slate-200">
                                                          {statsObj ? `${statsObj.totalSize}` : "0 B"}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between text-slate-500 text-[8px]">
                                                        <span>TOTAL CANDLES (ALL TIME):</span>
                                                        <span>{statsObj ? statsObj.count.toLocaleString() : "0"} records</span>
                                                      </div>

                                                      <div className="border-t border-[#1E232D]/35 pt-1.5 mt-1.5 space-y-0.5">
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 1-MINUTE ROWS (1m):</span>
                                                          <span className="font-bold text-blue-400 font-mono">
                                                            {statsObj ? (statsObj.count_1m ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 5-MINUTE ROWS (5m):</span>
                                                          <span className="font-bold text-teal-400 font-mono">
                                                            {statsObj ? (statsObj.count_5m ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 15-MINUTE ROWS (15m):</span>
                                                          <span className="font-bold text-cyan-400 font-mono">
                                                            {statsObj ? (statsObj.count_15m ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 1-HOUR ROWS (1h):</span>
                                                          <span className="font-bold text-indigo-400 font-mono">
                                                            {statsObj ? (statsObj.count_1h ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 4-HOUR ROWS (4h):</span>
                                                          <span className="font-bold text-violet-400 font-mono">
                                                            {statsObj ? (statsObj.count_4h ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>├─ 1-DAY ROWS (1d):</span>
                                                          <span className="font-bold text-pink-400 font-mono">
                                                            {statsObj ? (statsObj.count_1d ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400 text-[8px]">
                                                          <span>└─ 1-WEEK ROWS (1w):</span>
                                                          <span className="font-bold text-purple-400 font-mono">
                                                            {statsObj ? (statsObj.count_1w ?? 0).toLocaleString() : "0"}
                                                          </span>
                                                        </div>
                                                      </div>

                                                      {statsObj && (
                                                        <div className="border-t border-[#1E232D]/40 pt-1.5 mt-1.5 space-y-1">
                                                          <div className="flex justify-between text-slate-400 text-[8px]">
                                                            <span>FEED GAPS:</span>
                                                            <span className={`font-bold ${statsObj.gapsCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                                              {statsObj.gapsCount} missing rows
                                                            </span>
                                                          </div>
                                                          
                                                          {statsObj.repairedCount > 0 && (
                                                            <div className="flex justify-between text-slate-400 text-[8px]">
                                                              <span>REPAIRED PORTION:</span>
                                                              <span className="font-bold text-emerald-450 uppercase">{statsObj.repairedCount} filled</span>
                                                            </div>
                                                          )}

                                                          {/* Buttons to Fill / Unfill gaps */}
                                                          <div className="flex gap-1 pt-1">
                                                            {selectedSource.toLowerCase() !== 'dukascopy' && (
                                                              <button
                                                                type="button"
                                                                disabled={isRepairing[p]}
                                                                onClick={() => handleRepairGaps(instance.id, p, selectedSource)}
                                                                className={`flex-1 px-1.5 py-1 text-[8px] font-mono uppercase font-bold text-center border shrink-0 transition-all ${
                                                                  statsObj.gapsCount > 0
                                                                    ? "bg-amber-500 hover:bg-amber-600 border-amber-400 text-black cursor-pointer"
                                                                    : "bg-[#0A0C10] text-slate-500 border-[#1E232D]/30 cursor-not-allowed"
                                                                }`}
                                                              >
                                                                {isRepairing[p] ? "Repairing..." : "Repair Feed Gaps"}
                                                              </button>
                                                            )}

                                                            {statsObj.repairedCount > 0 && (
                                                              <button
                                                                type="button"
                                                                disabled={isUnrepairing[p]}
                                                                onClick={() => handleUnfillGaps(instance.id, p, selectedSource)}
                                                                className="px-1.5 py-1 text-[8px] font-mono uppercase font-bold text-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 cursor-pointer shrink-0 transition-all font-bold"
                                                              >
                                                                {isUnrepairing[p] ? "Clearing..." : "Unfill"}
                                                              </button>
                                                            )}
                                                          </div>

                                                          {/* Individual Pair-Source Series Deletion */}
                                                          <div className="pt-1.5 border-t border-[#1E232D]/35 mt-1.5 flex justify-between items-center">
                                                            <span className="text-[8px] uppercase text-slate-500">Source Specific Action:</span>
                                                            <button
                                                              type="button"
                                                              disabled={isDeletingPair[`${instance.id}:${p}:${selectedSource}`]}
                                                              onClick={() => handleDeletePairSource(instance.id, p, selectedSource)}
                                                              className={`px-2 py-0.5 text-[8px] font-mono uppercase font-bold text-center border cursor-pointer transition-all flex items-center gap-1 ${
                                                                confirmDeletePairKey === `${instance.id}:${p}:${selectedSource}`
                                                                  ? "bg-red-600 hover:bg-red-700 border-red-500 text-white animate-pulse"
                                                                  : "bg-red-500/10 hover:bg-red-500/25 border-red-500/30 text-rose-400"
                                                              }`}
                                                            >
                                                              <Trash2 className="h-2.5 w-2.5" />
                                                              {isDeletingPair[`${instance.id}:${p}:${selectedSource}`]
                                                                ? "Deleting..."
                                                                : confirmDeletePairKey === `${instance.id}:${p}:${selectedSource}`
                                                                ? "CONFIRM DELETE?"
                                                                : `Delete ${selectedSource.toUpperCase()} Data`}
                                                            </button>
                                                          </div>

                                                          {/* Gaps dropdown list */}
                                                          {statsObj.gapsCount > 0 && (
                                                            <div className="text-[8px] font-mono pt-1">
                                                              <button
                                                                type="button"
                                                                onClick={() => toggleGapsDropdown(p)}
                                                                className="w-full flex items-center justify-between text-slate-500 hover:text-slate-300 py-0.5 border-t border-[#1E232D]/20 mt-1 cursor-pointer"
                                                              >
                                                                <span>{expandedGaps[p] ? "▴ Hide" : "▾ Show"} {statsObj.gaps.length} precise gap regions</span>
                                                                <span className="text-[7px]">({statsObj.gapsCount} total)</span>
                                                              </button>
                                                              {expandedGaps[p] && (
                                                                <div className="max-h-24 overflow-y-auto bg-[#040609] p-1 border border-[#1E232D]/30 space-y-1 mt-0.5 custom-scrollbar">
                                                                  {statsObj.gaps.map((item: any, gIdx: number) => {
                                                                    const startFmt = new Date(item.start).toUTCString().replace(" GMT", "");
                                                                    const endFmt = new Date(item.end).toUTCString().replace(" GMT", "");
                                                                    return (
                                                                      <div key={gIdx} className="border-b border-[#1E232D]/20 pb-0.5 last:border-0 text-slate-400 leading-normal text-left">
                                                                        <span className="text-amber-500 font-bold">● Gap #{gIdx + 1}:</span> {item.missingCount} records missing
                                                                        <div className="text-slate-500">From: {startFmt}</div>
                                                                        <div className="text-slate-500">To: {endFmt}</div>
                                                                      </div>
                                                                    );
                                                                  })}
                                                                </div>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })()}

                                                {/* Ingestion Indicators */}
                                                {ingestJob && (
                                                  <div className="space-y-1.5 bg-[#0A0C10] p-1.5 border border-[#1E232D]/40 text-[9px] font-mono">
                                                    <div className="flex justify-between items-center text-slate-400">
                                                      <span>STATUS:</span>
                                                      <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase border ${
                                                        isRunning 
                                                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse" 
                                                          : ingestJob.status === "cancelled"
                                                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                          : isCompleted 
                                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                                          : isError 
                                                          ? "bg-red-500/10 text-rose-450 border-red-500/30" 
                                                          : "bg-slate-500/10 text-slate-400 border-slate-300/20"
                                                      }`}>
                                                        {ingestJob.status}
                                                      </span>
                                                    </div>
                                                    
                                                    <div className="text-slate-500 leading-normal line-clamp-2 text-[8px]">
                                                      <span className="text-slate-600 font-bold">Progress: </span>{ingestJob.progress}
                                                    </div>

                                                    {(isCompleted || isRunning || ingestJob.status === 'cancelled') && (
                                                      <div className="flex justify-between text-slate-500 border-t border-[#1E232D]/20 pt-1 mt-1 font-mono text-[8px]">
                                                        <span>M1: {ingestJob.totalParsed_1m || 0} | M5: {ingestJob.totalParsed_5m || 0} | M15: {ingestJob.totalParsed_15m || 0} | H1: {ingestJob.totalParsed_1h || 0} | H4: {ingestJob.totalParsed_4h || 0} | D1: {ingestJob.totalParsed_1d || 0} | W1: {ingestJob.totalParsed_1w || 0}</span>
                                                        <span>Saved: {ingestJob.totalSaved || 0}</span>
                                                      </div>
                                                    )}
                                                    {isError && (
                                                      <div className="text-rose-455 font-medium text-[8px] bg-rose-500/5 p-1 border border-rose-500/10 break-all leading-normal">
                                                        Error: {ingestJob.error}
                                                      </div>
                                                    )}

                                                    {(enableTerminalConsoleLogs || isRunning) && (
                                                      <div className="flex gap-1.5 pt-1.5 border-t border-[#1E232D]/15 mt-1">
                                                        {enableTerminalConsoleLogs && (
                                                          <button
                                                            type="button"
                                                            onClick={() => setSelectedLogJobKey(stateKey)}
                                                            className="flex-1 px-1.5 py-1 text-[8px] font-mono uppercase bg-[#181d27] border border-[#2d3647] hover:bg-[#202735] hover:border-blue-500/40 text-blue-400 font-bold text-center cursor-pointer transition-all"
                                                          >
                                                            Console Logs
                                                          </button>
                                                        )}

                                                        {isRunning && (
                                                          <button
                                                            type="button"
                                                            onClick={() => handleCancelIngestion(instance.id, p, selectedSource)}
                                                            className="px-1.5 py-1 text-[8px] font-mono uppercase bg-rose-550 hover:bg-rose-600 border border-rose-500 text-white font-bold text-center cursor-pointer transition-all shrink-0"
                                                          >
                                                            Cancel
                                                          </button>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-mono text-slate-500 italic">None Configured</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Connections detail */}
                              <div className="text-[10px] font-mono text-slate-550 break-all select-all font-mono leading-normal bg-[#0F1218] p-2 border border-[#1E232D]/80 rounded-none">
                                <span className="text-slate-600">Host URL: </span>
                                {instance.url ? (instance.url.split("@")[1] || instance.url) : "sandbox-internal"}
                              </div>

                              {/* diagnostics numbers */}
                              {connected && diagnostics && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 text-[9px] uppercase font-mono text-slate-400 border-t border-[#1E232D]/40">
                                  <div>
                                    <span className="text-slate-600">Total size:</span> <span className="text-white font-bold">{diagnostics.totalSize || "16KB"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Table size:</span> <span className="text-white font-bold">{diagnostics.tableSize || "8KB"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Index size:</span> <span className="text-white font-bold">{diagnostics.indexSize || "8KB"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-605">Rows:</span> <span className="text-blue-400 font-bold">{diagnostics.rowCount || 0}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* CRUD & WIPE controls column */}
                            <div className="flex flex-row md:flex-col items-center justify-center gap-1.5 shrink-0 w-full md:w-36 font-mono text-[10px]">
                              <span className="text-[9px] text-slate-500 uppercase font-bold text-center border border-[#1E232D]/40 p-2 bg-[#0E121A] w-full select-none">
                                Environment Managed
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Supabase Configuration Card */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 sm:p-6 rounded-none space-y-6 relative overflow-hidden animate-fadeIn">
                <div className="absolute right-0 top-0 h-40 w-40 bg-[#0284c7]/5 blur-3xl rounded-none pointer-events-none" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <DatabaseZap className="h-5 w-5 text-sky-400" />
                    SUPABASE CLUSTER CONFIGURATION
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest leading-relaxed">
                    Set up your single Supabase instance. Configured via standard environment variables.
                  </p>
                </div>

                <div className="bg-[#0A0C10] border border-[#1E232D] p-5 space-y-4 rounded-none font-mono text-xs">
                  <div className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider pb-2 border-b border-[#1E232D] flex justify-between items-center">
                    <span>⚙️ SUPABASE CONNECTION STATUS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Project Endpoint URL:</span>
                      <div className="bg-[#0F1218] border border-[#1E232D] px-3 py-2 text-slate-300 break-all select-all font-mono">
                        {supabaseConfigUrl || "Unconfigured (Missing SUPABASE_URL environment variable)"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Anon Access Key:</span>
                      <div className="bg-[#0F1218] border border-[#1E232D] px-3 py-2 text-slate-300 break-all select-all font-mono">
                        {supabaseConfigAnonKey ? "•••••••••••••••• (Configured via SUPABASE_ANON_KEY)" : "Unconfigured (Missing SUPABASE_ANON_KEY environment variable)"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Direct Pool DB string:</span>
                    <div className="bg-[#0F1218] border border-[#1E232D] px-3 py-2 text-slate-400 break-all select-all font-mono text-[11px]">
                      {supabaseConfigDbUrl ? (supabaseConfigDbUrl.split("@")[1] || "• (Configured via SUPABASE_DB_URL)") : "Unconfigured (Missing SUPABASE_DB_URL environment variable)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Supabase diagnostic container */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 sm:p-6 rounded-none space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1E232D] pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      dbStatus.supabase?.connected === true 
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" 
                        : dbStatus.supabase?.connected === null && dbStatus.supabase?.configured
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"
                        : "bg-rose-500"
                    }`} />
                    <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">SUPABASE TIME RANGE LEDGER</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 font-mono uppercase font-bold">
                    {dbStatus.supabase?.diagnostics?.engine || "REST PostgREST Gate"}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-[#0A0C10] p-4 border border-[#1E232D] font-mono text-xs text-slate-400 space-y-2">
                    <div className="text-xs uppercase font-bold text-slate-300 mb-1 border-b border-[#1E232D]/40 pb-1">Cluster Stats</div>
                    <div className="flex justify-between">
                      <span>Live status:</span>
                      <span className={
                        dbStatus.supabase?.connected === true 
                          ? "text-emerald-400 font-bold" 
                          : dbStatus.supabase?.connected === null && dbStatus.supabase?.configured
                          ? "text-amber-400 font-bold animate-pulse"
                          : "text-rose-500 font-bold"
                      }>
                        {dbStatus.supabase?.connected === true 
                          ? "CONNECTED (ENV)" 
                          : dbStatus.supabase?.connected === null && dbStatus.supabase?.configured
                          ? "ESTABLISHING HANDSHAKE..." 
                          : "OFFLINE / CONNECTION ERROR"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Allocation:</span>
                      <span className="text-slate-200">{dbStatus.supabase?.diagnostics?.totalSize || "16 KB"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Historical Logs count:</span>
                      <span className="text-blue-400 font-bold">{dbStatus.supabase?.diagnostics?.rowCount || 0} rows</span>
                    </div>
                  </div>

                  <div className="bg-[#0A0C10] p-4 border border-[#1E232D] font-sans text-[11px] text-slate-400 leading-relaxed flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-white block uppercase tracking-wider font-mono mb-1">Index layout</span>
                      Supabase holds our articles journal. Fully indexed via standard inverted indexing for rapid multiple-referenced global lookup.
                    </div>
                  </div>
                </div>

                {dbStatus.supabase?.error && (
                  <div className="bg-rose-500/5 border border-rose-500/15 p-3 text-[11px] font-mono text-rose-300 leading-relaxed flex items-start gap-2.5 animate-fadeIn">
                    <ShieldAlert className="h-4 w-4 text-rose-450 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold uppercase text-rose-400 block">Supabase Connection Log / Handshake Diagnostic:</span>
                      <p className="normal-case text-slate-300 break-all">{dbStatus.supabase.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Dynamic Pop-up Cancelable Live Logs Console Terminal */}
      {selectedLogJobKey && (() => {
        const job = ingestStates[selectedLogJobKey];
        const textParts = selectedLogJobKey.split(":");
        const instId = textParts[0];
        const pairName = textParts[1];
        const sourceName = textParts[2];
        const isJobRunning = job?.status === "running";
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-[#0b0f17] border-2 border-[#1E232D] w-full max-w-2xl flex flex-col shadow-2xl relative animate-fadeIn max-h-[85vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between bg-[#0e1420] border-b border-[#1E232D] p-3 sm:p-4">
                <div className="flex items-center space-x-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${isJobRunning ? "bg-amber-400 animate-ping" : "bg-blue-500"}`} />
                  <span className="text-white text-xs sm:text-sm font-bold font-mono tracking-wider uppercase">
                    {sourceName.toUpperCase()} {pairName} INGESTION STREAM CONSOLE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLogJobKey(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs uppercase cursor-pointer pointer-events-auto bg-slate-800 hover:bg-slate-700 px-2 py-1"
                >
                  [✕ close]
                </button>
              </div>

              {/* Status / Overview panel */}
              <div className="bg-[#070b12] p-3 border-b border-[#1E232D]/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <div className="bg-[#121824] p-1.5 border border-[#1E232D]/30">
                  <span className="text-slate-500 block text-[8px] uppercase">Asset Pair:</span>
                  <span className="text-white font-bold">{pairName}</span>
                </div>
                <div className="bg-[#121824] p-1.5 border border-[#1E232D]/30">
                  <span className="text-slate-500 block text-[8px] uppercase">State Hook:</span>
                  <span className={`font-bold uppercase ${isJobRunning ? "text-amber-400 animate-pulse" : job?.status === "completed" ? "text-emerald-400" : "text-slate-400"}`}>
                    {job?.status || "IDLE"}
                  </span>
                </div>
                <div className="bg-[#121824] p-1.5 border border-[#1E232D]/30">
                  <span className="text-slate-500 block text-[8px] uppercase">M1 / M5 / M15 Parsed:</span>
                  <span className="text-blue-450 font-bold">
                    {job?.totalParsed_1m || 0} / {job?.totalParsed_5m || 0} / {job?.totalParsed_15m || 0}
                  </span>
                </div>
                <div className="bg-[#121824] p-1.5 border border-[#1E232D]/30">
                  <span className="text-slate-500 block text-[8px] uppercase">H1 / H4 / D1 / W1 Parsed:</span>
                  <span className="text-cyan-400 font-bold">
                    {job?.totalParsed_1h || 0} / {job?.totalParsed_4h || 0} / {job?.totalParsed_1d || 0} / {job?.totalParsed_1w || 0}
                  </span>
                </div>
                <div className="bg-[#121824] p-1.5 border border-[#1E232D]/30 col-span-2 sm:col-span-4">
                  <span className="text-slate-500 block text-[8px] uppercase">Total Partition Rows Saved:</span>
                  <span className="text-emerald-450 font-bold">{job?.totalSaved || 0} rows</span>
                </div>
              </div>

              {/* Console Logs Terminal */}
              <div className="p-4 bg-black flex-1 flex flex-col min-h-0">
                <span className="text-slate-500 text-[9px] font-mono uppercase font-bold tracking-wider mb-2 block">
                  Console Output (LATEST PROGRESS LINES IN MEMORY):
                </span>
                
                <div className="flex-1 overflow-y-auto bg-[#030508] border border-[#1E232D]/60 p-3 font-mono text-[10px] space-y-1 select-text custom-scrollbar max-h-[350px]">
                  {job?.logs && job.logs.length > 0 ? (
                    job.logs.map((logLine: string, idx: number) => {
                      let colorClass = "text-slate-300";
                      if (logLine.toLowerCase().includes("error")) {
                        colorClass = "text-rose-450 font-bold";
                      } else if (logLine.toLowerCase().includes("saving") || logLine.toLowerCase().includes("commit") || logLine.toLowerCase().includes("write")) {
                        colorClass = "text-teal-400";
                      } else if (logLine.toLowerCase().includes("completed") || logLine.toLowerCase().includes("success")) {
                        colorClass = "text-emerald-400 font-semibold";
                      } else if (logLine.toLowerCase().includes("downloading") || logLine.toLowerCase().includes("scanning")) {
                        colorClass = "text-blue-400";
                      } else if (logLine.toLowerCase().includes("cancel")) {
                        colorClass = "text-amber-500 font-bold";
                      }
                      
                      return (
                        <div key={idx} className={`leading-relaxed break-all text-left whitespace-pre-wrap ${colorClass}`}>
                          {logLine}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-600 italic text-left">
                      [Waiting for first log line from background node...]
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls Footer */}
              <div className="flex items-center justify-between bg-[#0e1420] border-t border-[#1E232D] p-3 sm:p-4 gap-2">
                <div className="text-[10px] text-slate-500 font-mono">
                  {isJobRunning ? "🔴 Active Stream Ingestion pipeline running..." : "⚪ Pipeline offline."}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isJobRunning && (
                    <button
                      type="button"
                      onClick={() => handleCancelIngestion(instId, pairName, sourceName)}
                      className="px-3.5 py-1.5 text-xs font-mono uppercase bg-red-650 hover:bg-red-700 border border-red-500 text-white font-bold transition-all cursor-pointer rounded-none"
                    >
                      Cancel Ingestion
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLogJobKey(null)}
                    className="px-3.5 py-1.5 text-xs font-mono uppercase bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition-all cursor-pointer rounded-none"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 🔒 DB SYSTEM SECURITY CLEARANCE REQUIRED MODAL */}
      {showWipeSecurityModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
          <div className="bg-[#0b0f17] border-2 border-red-500/50 w-full max-w-md flex flex-col shadow-[0_0_30px_rgba(239,68,68,0.25)] relative rounded-none p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center space-x-2.5 border-b border-[#1E232D] pb-3 text-red-500">
              <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
              <span className="text-white text-xs sm:text-sm font-bold font-mono tracking-wider uppercase">
                SYSTEM SECURITY AUTHORIZATION REQUIRED
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-400 font-mono leading-relaxed text-left">
              <p className="font-bold text-slate-300">
                ⚠️ WARNING: You are attempting to trigger a destructive database delete/wipe operation.
              </p>
              <p className="text-[11px] leading-normal uppercase text-left">
                Wiping targets: <span className="text-amber-400 font-bold font-mono">
                  {wipeActionType === "supabase" && "Supabase News Articles Table"}
                  {wipeActionType === "cockroach_all" && "All CockroachDB Candles Tables"}
                  {wipeActionType === "cockroach_instance" && `CockroachDB Instance [${wipeInstanceId}] Candles`}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 leading-normal text-left">
                To authorized and commit this transaction, please enter the software administrative Database Wipe Secret Key.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-[9px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Database Wipe Secret Key
              </label>
              <input
                type="password"
                required
                placeholder="Enter DB administrative secret"
                value={enteredWipeSecret}
                onChange={(e) => setEnteredWipeSecret(e.target.value)}
                className="w-full bg-[#030508] border border-red-500/30 rounded-none px-3 py-2 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-red-500 font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && enteredWipeSecret) {
                    executeSecureWipe(enteredWipeSecret);
                  }
                }}
              />
            </div>

            {wipeSecurityError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 font-mono text-[10px] text-rose-450 font-bold uppercase tracking-wider leading-relaxed text-left">
                🚨 TRANSACTION REFUSED: {wipeSecurityError}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={isWipingSupabase || isWipingCockroach}
                onClick={() => executeSecureWipe(enteredWipeSecret)}
                className="flex-1 py-2 text-xs font-mono uppercase bg-red-600 hover:bg-red-750 border border-red-500 hover:border-red-400 text-white font-bold transition-all cursor-pointer rounded-none disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600"
              >
                {isWipingSupabase || isWipingCockroach ? "Authorizing..." : "CONFIRM CLEAR TRANSACTION"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWipeSecurityModal(false);
                  setEnteredWipeSecret("");
                  setWipeSecurityError(null);
                }}
                className="px-4 py-2 text-xs font-mono uppercase bg-slate-805 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition-all cursor-pointer rounded-none"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer credits layer */}
      <footer className="border-t border-[#1d273a] bg-[#070b12] py-4 text-center text-[10px] font-mono text-slate-500">
        <p>Financial Market Dataset Consolidation Pipeline — Powered by Sandbox Aggregation Nodes & Standard SQL Engine</p>
      </footer>
    </div>
  );
}
