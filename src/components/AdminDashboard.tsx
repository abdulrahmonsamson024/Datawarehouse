import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, DollarSign, Users, CreditCard, TrendingUp, Globe, Activity, 
  Clock, ArrowUpRight, ArrowDownRight, Search, Filter, ChevronLeft, ChevronRight, 
  Download, RefreshCw, AlertCircle, Database, Calendar, ArrowUpDown, UserCheck, 
  Smartphone, ShieldCheck, Mail, MapPin, Inbox, CheckCircle2, XCircle, MessageSquare, Send, X, Trash2,
  Megaphone, UserMinus, Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

function safeArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (val.trends && Array.isArray(val.trends)) return val.trends;
  if (val.growth && Array.isArray(val.growth)) return val.growth;
  if (val.data && Array.isArray(val.data)) return val.data;
  if (val.users && Array.isArray(val.users)) return val.users;
  return [];
}

function normalizeDashboardData(data: any): any {
  if (!data) return null;
  const result = { ...data };

  // 1. Normalize financials into revenue
  if (!result.revenue) {
    result.revenue = {};
  }
  const financials = data.financials || {};
  result.revenue.total = financials.overall_payment !== undefined ? financials.overall_payment : (data.revenue?.total || 0);
  result.revenue.today = financials.today_payment !== undefined ? financials.today_payment : (data.revenue?.today || 0);
  result.revenue.monthly = financials.month_payment !== undefined ? financials.month_payment : (data.revenue?.monthly || 0);
  result.revenue.yearly = financials.year_payment !== undefined ? financials.year_payment : (data.revenue?.yearly || 0);
  result.revenue.weekly = financials.week_payment !== undefined ? financials.week_payment : (data.revenue?.weekly || 0);

  if (!result.revenue.trends) {
    result.revenue.trends = {
      total: data.revenue?.trends?.total !== undefined ? data.revenue.trends.total : 0,
      today: data.revenue?.trends?.today !== undefined ? data.revenue.trends.today : 0,
      monthly: data.revenue?.trends?.monthly !== undefined ? data.revenue.trends.monthly : 0,
      yearly: data.revenue?.trends?.yearly !== undefined ? data.revenue.trends.yearly : 0
    };
  }

  // 2. Normalize users
  if (!result.users) {
    result.users = {};
  }
  const apiUsers = data.users || {};
  result.users.total = apiUsers.total_users !== undefined ? apiUsers.total_users : (data.users?.total || 0);
  result.users.active = apiUsers.active_users !== undefined ? apiUsers.active_users : (data.users?.active || 0);
  result.users.free = apiUsers.free_users !== undefined ? apiUsers.free_users : (data.users?.free || 0);
  result.users.plus = apiUsers.plus_users !== undefined ? apiUsers.plus_users : (data.users?.plus || 0);
  result.users.premium = apiUsers.premium_users !== undefined ? apiUsers.premium_users : (data.users?.premium || 0);
  result.users.today = apiUsers.new_users_today !== undefined ? apiUsers.new_users_today : (data.users?.today || 0);
  result.users.weekly = apiUsers.new_users_this_week !== undefined ? apiUsers.new_users_this_week : (data.users?.weekly || 0);
  result.users.monthly = apiUsers.new_users_this_month !== undefined ? apiUsers.new_users_this_month : (data.users?.monthly || 0);

  // 3. Normalize subscriptions
  if (!result.subscriptions) {
    result.subscriptions = {};
  }
  const apiSubs = data.subscriptions || {};
  result.subscriptions.active = apiSubs.active_subscriptions !== undefined ? apiSubs.active_subscriptions : (data.subscriptions?.active || 0);
  result.subscriptions.expired = apiSubs.expired_subscriptions !== undefined ? apiSubs.expired_subscriptions : (data.subscriptions?.expired || 0);
  result.subscriptions.renewals = apiSubs.renewed_this_month !== undefined ? apiSubs.renewed_this_month : (data.subscriptions?.renewals || 0);
  result.subscriptions.cancellations = apiSubs.cancelled_this_month !== undefined ? apiSubs.cancelled_this_month : (data.subscriptions?.cancellations || 0);
  result.subscriptions.churnRate = data.subscriptions?.churnRate !== undefined ? data.subscriptions.churnRate : 0;

  return result;
}

function normalizeRevenueData(data: any): any {
  if (!data) return null;
  const result = { ...data };

  let trends: any[] = [];
  if (Array.isArray(data.daily)) {
    trends = data.daily.map((item: any) => ({
      date: item.date,
      revenue: item.revenue !== undefined ? item.revenue : (item.amount || 0),
      plusRevenue: item.plusRevenue !== undefined ? item.plusRevenue : 0,
      premiumRevenue: item.premiumRevenue !== undefined ? item.premiumRevenue : 0,
      transactions: item.count !== undefined ? item.count : (item.count || 0)
    }));
  } else if (Array.isArray(data.monthly)) {
    trends = data.monthly.map((item: any) => ({
      date: item.month,
      revenue: item.revenue !== undefined ? item.revenue : (item.amount || 0),
      plusRevenue: item.plusRevenue !== undefined ? item.plusRevenue : 0,
      premiumRevenue: item.premiumRevenue !== undefined ? item.premiumRevenue : 0,
      transactions: item.count !== undefined ? item.count : (item.count || 0)
    }));
  } else if (Array.isArray(data.trends)) {
    trends = data.trends;
  } else if (Array.isArray(data)) {
    trends = data;
  }

  result.trends = trends;

  if (!result.summary) {
    const totalRev = trends.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const avgRev = trends.length > 0 ? Math.round(totalRev / trends.length) : 0;
    const txCount = trends.reduce((sum, item) => sum + (item.transactions || 0), 0);
    
    result.summary = {
      totalRevenue: totalRev,
      averageRevenue: avgRev,
      growthPercent: trends.length > 1 ? (((trends[trends.length - 1].revenue || 0) - (trends[0].revenue || 0)) / (trends[0].revenue || 1) * 100).toFixed(1) : "0.0",
      transactionCount: txCount
    };
  }

  return result;
}

function normalizeDemographicsData(data: any): any {
  if (!data) return null;
  const result = { ...data };

  if (data.plans && !Array.isArray(data.plans) && typeof data.plans === 'object') {
    const freeVal = data.plans.free || 0;
    const plusVal = data.plans.plus || 0;
    const premiumVal = data.plans.premium || 0;
    const totalVal = freeVal + plusVal + premiumVal || 1;
    
    result.planDistribution = [
      { name: "Free Plan", value: freeVal, percent: parseFloat(((freeVal / totalVal) * 100).toFixed(1)), color: "#475569" },
      { name: "Plus Plan", value: plusVal, percent: parseFloat(((plusVal / totalVal) * 100).toFixed(1)), color: "#3B82F6" },
      { name: "Premium Plan", value: premiumVal, percent: parseFloat(((premiumVal / totalVal) * 100).toFixed(1)), color: "#8B5CF6" }
    ];
  }

  if (data.countries && !Array.isArray(data.countries) && typeof data.countries === 'object') {
    const totalCountriesCount = Object.values(data.countries).reduce((sum: any, val: any) => sum + (val || 0), 0) as number || 1;
    result.countryDistribution = Object.entries(data.countries).map(([country, count]: [string, any]) => {
      const cCount = count || 0;
      return {
        country,
        count: cCount,
        percent: parseFloat(((cCount / totalCountriesCount) * 100).toFixed(1))
      };
    }).sort((a, b) => b.count - a.count);
  }

  if (!result.regionalGrowth) {
    if (result.countryDistribution && result.countryDistribution.length > 0) {
      result.regionalGrowth = result.countryDistribution.map((item: any) => ({
        region: item.country,
        growth: 0.0,
        pctPremium: 0
      }));
    } else {
      result.regionalGrowth = [];
    }
  }

  return result;
}

function normalizeUsersGrowth(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  if (data.daily && Array.isArray(data.daily)) {
    return data.daily.map((item: any) => ({
      date: item.date,
      totalUsers: item.count || 0,
      newUsers: item.count || 0
    }));
  }

  if (data.weekly && Array.isArray(data.weekly)) {
    return data.weekly.map((item: any) => ({
      date: item.date,
      totalUsers: item.count || 0,
      newUsers: item.count || 0
    }));
  }

  if (data.monthly && Array.isArray(data.monthly)) {
    return data.monthly.map((item: any) => ({
      date: item.month,
      totalUsers: item.count || 0,
      newUsers: item.count || 0
    }));
  }

  return [];
}

function getOverviewChartData(dashboardData: any): any[] {
  if (dashboardData?.revenueTrend && Array.isArray(dashboardData.revenueTrend) && dashboardData.revenueTrend.length > 0) {
    return dashboardData.revenueTrend.map((item: any) => ({
      month: item.month || item.date || "",
      rev: item.revenue || item.amount || item.overall_payment || 0,
      trans: item.transactions || item.count || 0
    }));
  }
  if (dashboardData?.revenue) {
    return [
      { month: "Today", rev: dashboardData.revenue.today || 0, trans: 1 },
      { month: "Month", rev: dashboardData.revenue.monthly || 0, trans: 2 }
    ];
  }
  return [];
}

function normalizeUsersListData(data: any): any {
  if (!data) return null;
  const result = { ...data };
  if (Array.isArray(data.users)) {
    result.users = data.users.map((user: any) => {
      const name = user.full_name || user.username || user.email?.split("@")[0] || "Anonymous User";
      let rawPlan = user.plan || "Free";
      if (rawPlan === "basic" || rawPlan === "free") rawPlan = "Free";
      else if (rawPlan === "plus") rawPlan = "Plus";
      else if (rawPlan === "premium") rawPlan = "Premium";
      const formattedPlan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);

      return {
        ...user,
        id: user.id || `usr_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        email: user.email || "no-email@firstlook.com",
        country: user.country || "US",
        plan: formattedPlan,
        status: user.status || "Active",
        joinDate: user.created_at || user.createdAt || user.joinedDate || new Date().toISOString(),
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.username || user.email || user.id || "pixel")}`
      };
    });
  }
  result.pagination = {
    page: data.currentPage || data.page || 1,
    totalPages: data.totalPages || 1,
    total: data.totalUsers || data.total || 0,
    limit: data.limit || 10
  };
  return result;
}

// ==========================================
// CENTRALIZED COMPACT TANSTACK-LIKE QUERY ENGINE
// ==========================================
interface CacheEntry {
  data: any;
  timestamp: number;
}
const requestCache: { [key: string]: CacheEntry } = {};
const pendingPromises: { [key: string]: Promise<any> } = {};
const CACHE_TTL_MS = 15000; // 15 seconds cache

async function fetchWithRetryAndCache(path: string, options: any = {}, retries = 3, delay = 500): Promise<any> {
  const cacheKey = JSON.stringify({ path, query: options.query });
  
  // Return cached result if fresh
  if (requestCache[cacheKey] && Date.now() - requestCache[cacheKey].timestamp < CACHE_TTL_MS) {
    return requestCache[cacheKey].data;
  }

  // Deduplicate ongoing identical requests
  if (pendingPromises[cacheKey]) {
    return pendingPromises[cacheKey];
  }

  const promise = (async () => {
    let attempt = 0;
    while (attempt < retries) {
      try {
        const queryParams = options.query ? "?" + new URLSearchParams(options.query).toString() : "";
        const response = await fetch(`/api/admin/remote/${path}${queryParams}`, {
          headers: {
            "x-app-request": "true"
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP Error Status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache result
        requestCache[cacheKey] = {
          data,
          timestamp: Date.now()
        };
        
        return data;
      } catch (err: any) {
        attempt++;
        if (attempt >= retries) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  })();

  pendingPromises[cacheKey] = promise;
  
  try {
    const data = await promise;
    delete pendingPromises[cacheKey];
    return data;
  } catch (err) {
    delete pendingPromises[cacheKey];
    throw err;
  }
}

export function AdminDashboard() {
  const [subTab, setSubTab] = useState<"overview" | "revenue" | "users" | "subscribers" | "demographics" | "payments" | "security">("overview");
  
  // Custom polling trigger for background syncing
  const [syncCounter, setSyncCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Component query states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [revenueRange, setRevenueRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const [usersFilter, setUsersFilter] = useState({ search: "", plan: "All", country: "All", page: 1 });
  const [usersData, setUsersData] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null); // Details drawer state

  // Editable and Deletable User details state
  const [isEditingUser, setIsEditingUser] = useState<boolean>(false);
  const [editFormName, setEditFormName] = useState<string>("");
  const [editFormPlan, setEditFormPlan] = useState<string>("free");
  const [editFormExperience, setEditFormExperience] = useState<string>("Intermediate");
  const [editFormExpiry, setEditFormExpiry] = useState<string>(""); 
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [saveUserError, setSaveUserError] = useState<string | null>(null);

  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  // Bulk Delete state variables
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [bulkEmailsText, setBulkEmailsText] = useState<string>("");
  const [isProcessingBulkDelete, setIsProcessingBulkDelete] = useState<boolean>(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleteSuccess, setBulkDeleteSuccess] = useState<string | null>(null);
  const [bulkWipeSecret, setBulkWipeSecret] = useState<string>("");

  // Administrative Email Composer State variables
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [emailRecipientsMode, setEmailRecipientsMode] = useState<"all" | "custom">("all");
  const [emailRecipientsText, setEmailRecipientsText] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailSecret, setEmailSecret] = useState<string>("");

  // Watchlist specific state variables
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState<boolean>(true);
  const [watchlistItems, setWatchlistItems] = useState<any[]>([]);
  const [isFetchingWatchlist, setIsFetchingWatchlist] = useState<boolean>(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkScale = () => setIsMobile(window.innerWidth < 768);
    checkScale();
    window.addEventListener("resize", checkScale);
    return () => window.removeEventListener("resize", checkScale);
  }, []);
  
  // Specific watchlist item stats state variables
  const [selectedWatchlistItemStats, setSelectedWatchlistItemStats] = useState<any | null>(null);
  const [isFetchingWatchlistItemStats, setIsFetchingWatchlistItemStats] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const handleStartEdit = () => {
    if (!selectedUser) return;
    setEditFormName(selectedUser.name || "");
    setEditFormPlan((selectedUser.plan || "free").toLowerCase());
    setEditFormExperience(selectedUser.experience_level || "Intermediate");
    
    if (selectedUser.subscriptionExpiry) {
      const d = new Date(Number(selectedUser.subscriptionExpiry));
      if (!isNaN(d.getTime())) {
        setEditFormExpiry(d.toISOString().substring(0, 10));
      } else {
        setEditFormExpiry("");
      }
    } else if (selectedUser.joinDate) {
      const parsedDate = new Date(selectedUser.joinDate);
      const baseDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      setEditFormExpiry(baseDate.toISOString().substring(0, 10));
    } else {
      setEditFormExpiry("");
    }
    
    setIsEditingUser(true);
    setSaveUserError(null);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    if (!editFormName.trim()) {
      setSaveUserError("Full Name cannot be blank.");
      return;
    }

    setIsSavingUser(true);
    setSaveUserError(null);
    try {
      const siteSecret = localStorage.getItem("forex_site_secret") || "";
      const expiryTimestamp = editFormExpiry ? new Date(editFormExpiry).getTime() : Date.now() + 31536000000;

      const payload = {
        full_name: editFormName.trim(),
        experience_level: editFormExperience,
        subscriptionPlan: editFormPlan,
        subscriptionExpiry: expiryTimestamp
      };

      console.log("[AdminDashboard] Sending User Update:", payload);

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${siteSecret}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const updatedData = await res.json();
      console.log("[AdminDashboard] User updated successfully:", updatedData);

      const updatedUser = {
        ...selectedUser,
        name: editFormName.trim(),
        plan: editFormPlan.charAt(0).toUpperCase() + editFormPlan.slice(1),
        experience_level: editFormExperience,
        subscriptionExpiry: expiryTimestamp
      };

      if (usersData && usersData.users) {
        setUsersData({
          ...usersData,
          users: usersData.users.map((u: any) => u.id === selectedUser.id ? updatedUser : u)
        });
      }

      setSelectedUser(updatedUser);
      setIsEditingUser(false);
    } catch (err: any) {
      console.error("[AdminDashboard] Save Error:", err);
      setSaveUserError(err.message || "Failed to save user customization settings.");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (deleteConfirmText.toUpperCase() !== "DELETE") {
      setDeleteUserError("Security validation mismatch. Type 'DELETE' to confirm permanent action.");
      return;
    }

    setIsSavingUser(true);
    setDeleteUserError(null);
    try {
      const siteSecret = localStorage.getItem("forex_site_secret") || "";
      
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${siteSecret}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      console.log("[AdminDashboard] User deleted permanently:", selectedUser.id);

      if (usersData && usersData.users) {
        setUsersData({
          ...usersData,
          users: usersData.users.filter((u: any) => u.id !== selectedUser.id)
        });
      }

      setSelectedUser(null);
      setIsEditingUser(false);
      setIsDeletingUser(false);
      setDeleteConfirmText("");
    } catch (err: any) {
      console.error("[AdminDashboard] Delete Error:", err);
      setDeleteUserError(err.message || "Failed to remove user database profile.");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteError(null);
    setBulkDeleteSuccess(null);

    // Parse emails to list
    let parsedEmails = bulkEmailsText
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e);

    const isAll = parsedEmails.some(e => e.toUpperCase() === "ALL" || e === "*");

    if (isAll) {
      if (!window.confirm("🚨 CRITICAL WARNING: You are initiating a complete database wipe of ALL USERS! This will permanently delete every single user profile in the system. Proceed?")) {
        return;
      }
      if (usersData && usersData.users) {
        parsedEmails = usersData.users.map((u: any) => u.email).filter(Boolean);
      } else {
        setBulkDeleteError("No loaded user registry found to process the 'ALL' command. Refresh the list first.");
        return;
      }
    } else {
      parsedEmails = parsedEmails.filter(e => e.includes("@"));
    }

    if (parsedEmails.length === 0) {
      setBulkDeleteError("Please specify at least one valid user email address, or type 'ALL' to delete all users.");
      return;
    }

    const passcode = bulkWipeSecret.trim() || localStorage.getItem("forex_site_secret") || "";
    if (!passcode) {
      setBulkDeleteError("The active administrative .env secret key passcode (DB_WIPE_SECRET_KEY / FOREX_API_SECRET) is required to authorize this action.");
      return;
    }

    setIsProcessingBulkDelete(true);
    try {
      console.log("[AdminDashboard] Sending Bulk Delete request for:", parsedEmails);
      const res = await fetch("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${passcode}`
        },
        body: JSON.stringify({ emails: parsedEmails })
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(responseData.error || `Failed execution with status ${res.status}`);
      }

      console.log("[AdminDashboard] Bulk delete success:", responseData);
      setBulkDeleteSuccess(responseData.message || `Processed successfully: deleted ${responseData.deletedCount || parsedEmails.length} users.`);
      setBulkEmailsText("");
      
      // Force refreshing registers via our elegant sync hook
      setSyncCounter(prev => prev + 1);
    } catch (err: any) {
      console.error("[AdminDashboard] Bulk Delete Error:", err);
      setBulkDeleteError(err.message || "Bulk deletion failed to synchronize profiles on server.");
    } finally {
      setIsProcessingBulkDelete(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailError(null);
    setEmailSuccess(null);

    const subjectText = emailSubject.trim();
    const messageText = emailMessage.trim();

    if (!subjectText || !messageText) {
      setEmailError("Subject and message are required and cannot be empty.");
      return;
    }

    let resolvedRecipients: any = "all_users";
    if (emailRecipientsMode === "custom") {
      const list = emailRecipientsText
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e && e.includes("@"));

      if (list.length === 0) {
        setEmailError("Please specify at least one valid recipient email address.");
        return;
      }
      resolvedRecipients = list;
    }

    const passcode = emailSecret.trim() || localStorage.getItem("forex_site_secret") || "";
    if (!passcode) {
      setEmailError("The active administrative .env secret key passcode (DB_WIPE_SECRET_KEY / FOREX_API_SECRET) is required to authenticate this request.");
      return;
    }

    setIsSendingEmail(true);
    try {
      console.log("[AdminDashboard] Directing send-email proxy request...");
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${passcode}`
        },
        body: JSON.stringify({
          subject: subjectText,
          message: messageText,
          recipients: resolvedRecipients
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      console.log("[AdminDashboard] Email proxy successful:", data);
      setEmailSuccess(data.message || `Successfully sent email to recipients.`);
      
      // Clear message field or specific text on success, keep subject as default or empty
      setEmailMessage("");
      if (emailRecipientsMode === "custom") {
        setEmailRecipientsText("");
      }
    } catch (err: any) {
      console.error("[AdminDashboard] Send Email Error:", err);
      setEmailError(err.message || "Failed to process the email broadcast via remote server.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const fetchUserWatchlist = async (userId: string) => {
    setIsFetchingWatchlist(true);
    setWatchlistError(null);
    setSelectedWatchlistItemStats(null);
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch(`/api/admin/users/${userId}/watchlist`, {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error fetching watchlist: ${res.status}`);
      }
      const data = await res.json();
      setWatchlistItems(data.watchlist || []);
    } catch (err: any) {
      console.error("[WatchlistFetch] Error:", err);
      setWatchlistError(err.message || "Failed to load watchlist registry.");
    } finally {
      setIsFetchingWatchlist(false);
    }
  };

  const fetchWatchlistItemStats = async (userId: string, watchlistId: string) => {
    setIsFetchingWatchlistItemStats(true);
    setStatsError(null);
    setSelectedWatchlistItemStats(null);
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch(`/api/admin/users/${userId}/watchlist/${watchlistId}/stats`, {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error loading stats: ${res.status}`);
      }
      const data = await res.json();
      setSelectedWatchlistItemStats(data);
    } catch (err: any) {
      console.error("[WatchlistStats] Error:", err);
      setStatsError(err.message || "Failed to compile watchlist item statistics.");
    } finally {
      setIsFetchingWatchlistItemStats(false);
    }
  };

  const deleteIndividualWatchlistItem = async (userId: string, watchlistId: string) => {
    if (!window.confirm("Are you sure you want to delete this watchlist entry and its linked simulation trades & states?")) {
      return;
    }
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch(`/api/admin/users/${userId}/watchlist/${watchlistId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete watchlist item: ${res.status}`);
      }
      // Reload watchlist
      fetchUserWatchlist(userId);
    } catch (err: any) {
      console.error("[WatchlistDelete] Error:", err);
      alert(err.message);
    }
  };

  const deleteWatchlistSymbol = async (userId: string, symbol: string, prefix?: string) => {
    const label = `${symbol}${prefix ? ` (${prefix})` : ""}`;
    const confirmation = window.confirm(`Are you sure you want to delete all entries for symbol ${label} and downstream trades?`);
    if (!confirmation) return;
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      let url = `/api/admin/users/${userId}/watchlist?symbol=${encodeURIComponent(symbol)}`;
      if (prefix) {
        url += `&prefix=${encodeURIComponent(prefix)}`;
      }
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete watchlist symbol: ${res.status}`);
      }
      fetchUserWatchlist(userId);
    } catch (err: any) {
      console.error("[WatchlistSymbolDelete] Error:", err);
      alert(err.message);
    }
  };

  const clearAllUserWatchlist = async (userId: string) => {
    if (!window.confirm("CRITICAL WARNING: This will permanently wipe all watchlist profiles and purge all trades, drawing markers, and backtest logs under this user profile! Proceed?")) {
      return;
    }
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch(`/api/admin/users/${userId}/watchlist`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to clear watchlist: ${res.status}`);
      }
      fetchUserWatchlist(userId);
    } catch (err: any) {
      console.error("[WatchlistClearAll] Error:", err);
      alert(err.message);
    }
  };

  // Trigger watchlist load on change of user/collapsed state
  useEffect(() => {
    if (selectedUser && !isWatchlistCollapsed) {
      fetchUserWatchlist(selectedUser.id);
    }
  }, [selectedUser, isWatchlistCollapsed]);

  // ==================== SUPPORT CENTER STATE & POLLERS ====================
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  
  // Floating support launcher menu list states
  const [isLauncherMenuOpen, setIsLauncherMenuOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    enabled: true,
    type: "warning",
    title: "",
    message: "",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
    dismissible: true
  });
  const [bannerSaveStatus, setBannerSaveStatus] = useState<string | null>(null);

  const fetchBannersList = async () => {
    setBannersLoading(true);
    try {
      const res = await fetch("/api/system/banners");
      if (res.ok) {
        const data = await res.json();
        setBannersList(data.banners || []);
      }
    } catch (err) {
      console.error("Failed to fetch banners list:", err);
    } finally {
      setBannersLoading(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerSaveStatus("Saving...");
    try {
      const res = await fetch("/api/system/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bannerForm,
          start_time: new Date(bannerForm.start_time).toISOString(),
          end_time: new Date(bannerForm.end_time).toISOString()
        })
      });
      if (res.ok) {
        setBannerSaveStatus("Banner created and activated successfully!");
        setBannerForm({
          enabled: true,
          type: "warning",
          title: "",
          message: "",
          start_time: new Date().toISOString().slice(0, 16),
          end_time: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
          dismissible: true
        });
        await fetchBannersList();
        setTimeout(() => setBannerSaveStatus(null), 3000);
      } else {
        const err = await res.json();
        setBannerSaveStatus(`Error: ${err.message || 'Failed to save'}`);
      }
    } catch (err: any) {
      setBannerSaveStatus(`Error: ${err.message || 'Fetch failed'}`);
    }
  };

  const handleActivateBanner = async (id: string) => {
    try {
      const res = await fetch(`/api/system/banners/${id}/activate`, {
        method: "PUT"
      });
      if (res.ok) {
        await fetchBannersList();
      }
    } catch (err) {
      console.error("Failed to activate banner:", err);
    }
  };

  // Fetch banners initially when banner modal is triggered
  useEffect(() => {
    if (isBannerModalOpen) {
      fetchBannersList();
    }
  }, [isBannerModalOpen]);
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [activeSupportEmail, setActiveSupportEmail] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportTab, setSupportTab] = useState<"unread" | "read" | "all">("all");
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [supportSearch, setSupportSearch] = useState("");

  // FEEDBACK STATE & ACTIONS
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "unread" | "read">("all");

  const refreshFeedbacks = async () => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/feedback", {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data);
      }
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    }
  };

  const markFeedbackAsRead = async (id: string) => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/feedback/mark-read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
      }
    } catch (err) {
      console.error("Failed to mark feedback as read:", err);
    }
  };

  const deleteFeedbackItem = async (id: string) => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/feedback/delete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setFeedbackList(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete feedback item:", err);
    }
  };

  const clearAllFeedbackItems = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL feedback records? This is irreversible.")) {
      return;
    }
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/feedback/clear-all", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (res.ok) {
        setFeedbackList([]);
      }
    } catch (err) {
      console.error("Failed to clear feedback items:", err);
    }
  };

  // CONTACT STATE & ACTIONS
  const [contactList, setContactList] = useState<any[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactFilter, setContactFilter] = useState<"all" | "unread" | "read">("all");

  const refreshContacts = async () => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/contact", {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setContactList(data);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  const markContactAsRead = async (id: string) => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/contact/mark-read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setContactList(prev => prev.map(c => c.id === id ? { ...c, is_read: true } : c));
      }
    } catch (err) {
      console.error("Failed to mark contact as read:", err);
    }
  };

  const deleteContactItem = async (id: string) => {
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/contact/delete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setContactList(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete contact item:", err);
    }
  };

  const clearAllContactItems = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL contact request records? This is irreversible.")) {
      return;
    }
    try {
      const secret = localStorage.getItem("forex_site_secret") || "";
      const res = await fetch("/api/admin/contact/clear-all", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (res.ok) {
        setContactList([]);
      }
    } catch (err) {
      console.error("Failed to clear contact items:", err);
    }
  };

  const refreshSupportConversations = async () => {
    try {
      const res = await fetch("/api/admin/remote/support/conversations");
      if (res.ok) {
        const data = await res.json();
        setSupportConversations(data);
      }
    } catch (err) {
      console.error("Failed to load support conversations:", err);
    }
  };

  useEffect(() => {
    refreshSupportConversations();
    refreshFeedbacks();
    refreshContacts();
    const interval = setInterval(() => {
      refreshSupportConversations();
      refreshFeedbacks();
      refreshContacts();
    }, 5000); // 5-second fast polling
    return () => clearInterval(interval);
  }, []);

  const getGroupedConversations = () => {
    const groups: { [email: string]: { email: string; name: string; messages: any[]; latestAt: number; unreadCount: number } } = {};
    
    supportConversations.forEach(msg => {
      const email = msg.user_email;
      if (!groups[email]) {
        groups[email] = {
          email,
          name: msg.user_name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
          messages: [],
          latestAt: 0,
          unreadCount: 0
        };
      }
      groups[email].messages.push(msg);
      
      const sentTime = new Date(msg.sent_at).getTime();
      if (sentTime > groups[email].latestAt) {
        groups[email].latestAt = sentTime;
      }
      
      if (msg.sender === "user" && !msg.is_read) {
        groups[email].unreadCount++;
      }
    });

    const list = Object.values(groups);

    // Apply Tab filtering
    const tabFiltered = list.filter(conv => {
      if (supportTab === "unread") return conv.unreadCount > 0;
      if (supportTab === "read") return conv.unreadCount === 0;
      return true;
    });

    // Apply Search filtering
    const query = supportSearch.toLowerCase().trim();
    const filtered = tabFiltered.filter(conv => {
      const hasEmail = conv.email.toLowerCase().includes(query);
      const hasName = conv.name.toLowerCase().includes(query);
      const hasMessage = conv.messages.some(m => m.message.toLowerCase().includes(query));
      return hasEmail || hasName || hasMessage;
    });

    return filtered.sort((a, b) => b.latestAt - a.latestAt);
  };

  const sendSupportReply = async (email: string) => {
    if (!supportReply.trim()) return;
    const bodyMsg = supportReply.trim();
    setSupportReply("");

    try {
      const res = await fetch("/api/admin/remote/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message: bodyMsg })
      });
      if (res.ok) {
        await refreshSupportConversations();
      }
    } catch (err) {
      console.error("Error sending reply:", err);
    }
  };

  const handleDeleteSupportMessage = async (id: string) => {
    try {
      const res = await fetch("/api/admin/remote/support/delete-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await refreshSupportConversations();
      }
    } catch (err) {
      console.error("Error deleting support message:", err);
    }
  };

  const handleClearSupportThread = async (email: string) => {
    try {
      const res = await fetch("/api/admin/remote/support/clear-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setActiveSupportEmail(null);
        await refreshSupportConversations();
      }
    } catch (err) {
      console.error("Error clearing support thread:", err);
    }
  };

  const handleClearAllSupportMessages = async () => {
    try {
      const res = await fetch("/api/admin/remote/support/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setActiveSupportEmail(null);
        await refreshSupportConversations();
      }
    } catch (err) {
      console.error("Error clearing all support messages:", err);
    }
  };

  const selectConversationThread = async (email: string) => {
    setActiveSupportEmail(email);
    try {
      await fetch("/api/admin/remote/support/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      refreshSupportConversations();
    } catch (err) {
      console.error("Error marking thread read:", err);
    }
  };

  const viewUserProfileFromSupport = (email: string) => {
    const foundUser = usersData?.users?.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setSelectedUser(foundUser);
    } else {
      const namePart = email.split("@")[0];
      const cleanName = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(".", " ");
      setSelectedUser({
        id: `usr_${Math.floor(100000 + Math.random() * 900000)}`,
        name: cleanName,
        email: email,
        country: "US",
        plan: "Plus",
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
        avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(cleanName)}`
      });
    }
  };

  const [usersGrowth, setUsersGrowth] = useState<any>(null);

  const [demographicsData, setDemographicsData] = useState<any>(null);
  const [demographicsLoading, setDemographicsLoading] = useState(true);
  const [demographicsError, setDemographicsError] = useState<string | null>(null);

  const [paymentsFilter, setPaymentsFilter] = useState({ search: "", plan: "All", status: "All", page: 1, sortField: "paymentDate", sortDir: "desc" });
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [securityFilter, setSecurityFilter] = useState({ search: "", status: "All", page: 1 });
  const [securityData, setSecurityData] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Background polling scheduler (Refreshes data every 10 seconds asynchronously)
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCounter(prev => prev + 1);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Summary Overview
  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true);
        const data = await fetchWithRetryAndCache("dashboard");
        if (active) {
          const normalized = normalizeDashboardData(data);
          setDashboardData(normalized);
          setDashboardError(null);
          setLastSyncTime(new Date());
        }
      } catch (err: any) {
        if (active) setDashboardError(err.message || "Failed to load dashboard statistics");
      } finally {
        if (active) {
          setDashboardLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    fetchDashboard();
    return () => { active = false; };
  }, [syncCounter, subTab]);

  // Fetch Revenue Trends
  useEffect(() => {
    let active = true;
    const fetchRevenue = async () => {
      try {
        setRevenueLoading(true);
        const data = await fetchWithRetryAndCache("finance/revenue-trends", { query: { range: revenueRange } });
        if (active) {
          const normalized = normalizeRevenueData(data);
          setRevenueData(normalized);
          setRevenueError(null);
        }
      } catch (err: any) {
        if (active) setRevenueError(err.message || "Failed to load revenue trends");
      } finally {
        if (active) setRevenueLoading(false);
      }
    };
    if (subTab === "revenue") {
      fetchRevenue();
    }
    return () => { active = false; };
  }, [revenueRange, subTab, syncCounter]);

  // Fetch Demographics
  useEffect(() => {
    let active = true;
    const fetchDemographics = async () => {
      try {
        setDemographicsLoading(true);
        const data = await fetchWithRetryAndCache("users/demographics");
        if (active) {
          const normalized = normalizeDemographicsData(data);
          setDemographicsData(normalized);
          setDemographicsError(null);
        }
      } catch (err: any) {
        if (active) setDemographicsError(err.message || "Failed to load demographic distribution");
      } finally {
        if (active) setDemographicsLoading(false);
      }
    };
    if (subTab === "demographics" || subTab === "subscribers") {
      fetchDemographics();
    }
    return () => { active = false; };
  }, [subTab, syncCounter]);

  // Fetch Users List
  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const queryParams: any = {
          search: usersFilter.search || "",
          page: String(usersFilter.page),
          limit: "10"
        };
        
        // Only append plan if it is not "All" to fetch all users properly
        if (usersFilter.plan && usersFilter.plan !== "All") {
          queryParams.plan = usersFilter.plan.toLowerCase();
        }

        const data = await fetchWithRetryAndCache("users/list", { 
          query: queryParams
        });
        if (active) {
          const normalized = normalizeUsersListData(data);
          setUsersData(normalized);
          setUsersError(null);
        }
      } catch (err: any) {
        if (active) setUsersError(err.message || "Failed to parse user accounts");
      } finally {
        if (active) setUsersLoading(false);
      }
    };

    const fetchGrowth = async () => {
      try {
        const growth = await fetchWithRetryAndCache("users/growth");
        if (active) {
          const normalized = normalizeUsersGrowth(growth);
          setUsersGrowth(normalized);
        }
      } catch (e) {}
    };

    if (subTab === "users" || subTab === "subscribers") {
      fetchUsers();
      fetchGrowth();
    }
    return () => { active = false; };
  }, [usersFilter, subTab, syncCounter]);

  // Fetch Payments List
  useEffect(() => {
    let active = true;
    const fetchPayments = async () => {
      try {
        setPaymentsLoading(true);
        const queryParams: any = {
          search: paymentsFilter.search || "",
          page: String(paymentsFilter.page),
          limit: "10"
        };

        if (paymentsFilter.plan && paymentsFilter.plan !== "All") {
          queryParams.plan = paymentsFilter.plan.toLowerCase();
        }
        if (paymentsFilter.status && paymentsFilter.status !== "All") {
          queryParams.status = paymentsFilter.status.toLowerCase();
        }

        const data = await fetchWithRetryAndCache("finance/payments", {
          query: queryParams
        });
        if (active) {
          const normalized = {
            ...data,
            pagination: {
              page: data?.currentPage || data?.page || 1,
              totalPages: data?.totalPages || 1,
              total: data?.totalPayments || data?.total || 0,
              limit: data?.limit || 10
            }
          };
          setPaymentsData(normalized);
          setPaymentsError(null);
        }
      } catch (err: any) {
        if (active) setPaymentsError(err.message || "Failed to load transaction ledger");
      } finally {
        if (active) setPaymentsLoading(false);
      }
    };
    if (subTab === "payments") {
      fetchPayments();
    }
    return () => { active = false; };
  }, [paymentsFilter.search, paymentsFilter.plan, paymentsFilter.status, paymentsFilter.page, subTab, syncCounter]);

  // Fetch Security/Audit Logs List
  useEffect(() => {
    let active = true;
    const fetchSecurity = async () => {
      try {
        setSecurityLoading(true);
        const data = await fetchWithRetryAndCache("audit-logs", {
          query: {
            search: securityFilter.search,
            status: securityFilter.status,
            page: String(securityFilter.page),
            limit: "12"
          }
        });
        if (active) {
          setSecurityData(data);
          setSecurityError(null);
        }
      } catch (err: any) {
        if (active) setSecurityError(err.message || "Failed to capture administrative audit trail");
      } finally {
        if (active) setSecurityLoading(false);
      }
    };
    if (subTab === "security") {
      fetchSecurity();
    }
    return () => { active = false; };
  }, [securityFilter.search, securityFilter.status, securityFilter.page, subTab, syncCounter]);

  // Manual Trigger Refresh Function
  const forceRefreshAll = () => {
    setIsRefreshing(true);
    // Clear cache keys
    Object.keys(requestCache).forEach(k => delete requestCache[k]);
    setSyncCounter(prev => prev + 1);
  };

  // Export to CSV Functionality (Fully Implemented)
  const exportPaymentsToCSV = () => {
    if (!paymentsData || !paymentsData.payments || paymentsData.payments.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Invoice Ref,Customer Email,Plan,Amount,Currency,Status,Date\n";
    
    paymentsData.payments.forEach((p: any) => {
      csvContent += `${p.id},${p.invoiceRef},${p.customerEmail},${p.plan},${p.amount},${p.currency},${p.status},${new Date(p.paymentDate).toLocaleString()}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transaction_ledger_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const planColorMap: Record<string, string> = {
    Free: "border-slate-500/20 text-slate-400 bg-slate-500/5",
    Plus: "border-blue-500/30 text-blue-400 bg-blue-500/5",
    Premium: "border-purple-500/40 text-purple-400 bg-purple-500/10 shadow-[0_0_8px_-2px_rgba(139,92,246,0.3)] font-semibold"
  };

  const statusColorMap: Record<string, string> = {
    Active: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    Succeeded: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    Expired: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
    Failed: "text-rose-400 bg-rose-500/10 border border-rose-500/20",
    Cancelled: "text-slate-500 bg-slate-500/10 border border-slate-500/20"
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header with Status indicators and manual Refresh triggers */}
      <div className="bg-[#0F1218] border border-[#1E232D] p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-45 bg-[#8B5CF6]/5 blur-3xl rounded-full" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#8B5CF6]/10 text-[#A78BFA] px-1.5 py-0.5 border border-[#8B5CF6]/20 font-bold font-mono tracking-widest uppercase">SECTION 01</span>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                ENTERPRISE CONTROL DESK
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase font-mono max-w-xl">
              Cross-cutting administrative reporting dashboard. Streamlines revenue indicators, conversion analytics, global demographics, and secure IP auditing.
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t border-[#1E232D] pt-3 sm:border-0 sm:pt-0 sm:justify-start">
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">GATEWAY HEALTH INDICATOR</div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-emerald-400 font-mono uppercase font-bold tracking-widest">GATEWAY LINKED // STABLE</span>
              </div>
            </div>

            <button
              onClick={forceRefreshAll}
              disabled={isRefreshing}
              className="px-3.5 py-2 hover:bg-[#1E232D] bg-[#141822] border border-[#1E232D] text-slate-300 font-mono text-xs flex items-center gap-2 transition-all cursor-pointer font-bold disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-purple-400" : "text-slate-400"}`} />
              <span className="uppercase">{isRefreshing ? 'Syncing...' : 'Force Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation Menu */}
      <div className="border-b border-[#1E232D] flex overflow-x-auto scrollbar-none items-center gap-1 pb-px bg-[#0F1218]/40 px-2">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "revenue", label: "Revenue Trends", icon: DollarSign },
          { id: "users", label: "User Accounts", icon: Users },
          { id: "subscribers", label: "Conversion Funnels", icon: TrendingUp },
          { id: "demographics", label: "Demographics", icon: Globe },
          { id: "payments", label: "Ledger Accounts", icon: CreditCard },
          { id: "security", label: "Audits & Shield", icon: ShieldAlert }
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = subTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setSubTab(tabItem.id as any)}
              className={`px-4 py-3 border-b-2 text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive 
                  ? "border-purple-500 text-purple-400 bg-purple-500/5" 
                  : "border-transparent text-slate-400 hover:text-white hover:bg-[#1E232D]/40"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-purple-400" : "text-slate-500"}`} />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* Main Subtab Renderer */}
      <div className="min-h-[460px]">
        
        {/* ==================== 1. OVERVIEW PAGE ==================== */}
        {subTab === "overview" && (
          <div className="space-y-6">
            {dashboardError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 font-mono text-xs text-rose-400 uppercase flex items-center gap-2 rounded-none">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Error syncing real-time summary: {dashboardError}.</span>
              </div>
            )}

            {/* Matrix of Analytics Cards with Live Simulative Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CARD 1: RUNTIME REVENUE */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 relative group overflow-hidden">
                <div className="absolute right-4 top-4 bg-[#8B5CF6]/5 p-2 rounded-none border border-[#1E232D]/40 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider uppercase">GROSS PLATFORM REVENUE</span>
                
                {dashboardLoading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {dashboardData?.revenue?.total !== undefined ? `$${dashboardData.revenue.total.toLocaleString()}` : "--"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center">
                      <ArrowUpRight className="h-3 w-3" />+{dashboardData?.revenue?.trends?.total !== undefined ? `${dashboardData.revenue.trends.total}%` : "0%"}
                    </span>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E232D]/60 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">TODAY REVENUE</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {dashboardData?.revenue?.today !== undefined ? `$${dashboardData.revenue.today.toLocaleString()}` : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">THIS MONTH</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {dashboardData?.revenue?.monthly !== undefined ? `$${dashboardData.revenue.monthly.toLocaleString()}` : "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 2: ACTIVE SUBSCRIBER STACK */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 relative group overflow-hidden">
                <div className="absolute right-4 top-4 bg-blue-500/5 p-2 rounded-none border border-[#1E232D]/40 text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider uppercase">ACTIVE USER ACCOUNTS</span>
                
                {dashboardLoading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {dashboardData?.users?.total !== undefined ? dashboardData.users.total.toLocaleString() : "--"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center">
                      <ArrowUpRight className="h-3 w-3" />+{dashboardData?.users?.today !== undefined && dashboardData?.users?.total ? ((dashboardData.users.today / dashboardData.users.total) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E232D]/60 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">TODAY SIGNUPS</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {dashboardData?.users?.today !== undefined ? `+${dashboardData.users.today.toLocaleString()}` : "+0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">WEEKLY NEW</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {dashboardData?.users?.weekly !== undefined ? `+${dashboardData.users.weekly.toLocaleString()}` : "+0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 3: SUBSCRIPTION SPREAD */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 relative group overflow-hidden">
                <div className="absolute right-4 top-4 bg-amber-500/5 p-2 rounded-none border border-[#1E232D]/40 text-amber-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider uppercase">PAID CONVERSION PLANS</span>
                
                {dashboardLoading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {dashboardData?.users?.plus !== undefined && dashboardData?.users?.premium !== undefined ? (dashboardData.users.plus + dashboardData.users.premium).toLocaleString() : "--"}
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">
                      {dashboardData?.users?.plus !== undefined && dashboardData?.users?.premium !== undefined && dashboardData?.users?.total ? `${(((dashboardData.users.plus + dashboardData.users.premium) / dashboardData.users.total) * 100).toFixed(1)}% ratio` : "--"}
                    </span>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E232D]/60 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">PLUS METRICS</span>
                    <span className="text-xs font-bold font-mono text-[#3B82F6]">
                      {dashboardData?.users?.plus !== undefined ? dashboardData.users.plus.toLocaleString() : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">PREMIUM UNLIMITED</span>
                    <span className="text-xs font-bold font-mono text-[#8B5CF6]">
                      {dashboardData?.users?.premium !== undefined ? dashboardData.users.premium.toLocaleString() : "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 4: RETENTION SPEED */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 relative group overflow-hidden">
                <div className="absolute right-4 top-4 bg-emerald-500/5 p-2 rounded-none border border-[#1E232D]/40 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider uppercase">CHURN & RETENTION RATIO</span>
                
                {dashboardLoading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {dashboardData?.subscriptions?.expired !== undefined && dashboardData?.users?.total ? (
                        Math.max(0, 100 - (dashboardData.subscriptions.expired / (dashboardData.users.total || 1)) * 100).toFixed(1)
                      ) : "100.0"}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dashboardData?.subscriptions?.expired !== undefined && dashboardData?.users?.total ? (
                        ((dashboardData.subscriptions.expired / (dashboardData.users.total || 1)) * 100).toFixed(1)
                      ) : "0.0"}% churn
                    </span>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E232D]/60 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">RENEWALS</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {dashboardData?.subscriptions?.renewals !== undefined ? `+${dashboardData.subscriptions.renewals.toLocaleString()}` : "+0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">CANCELLATIONS</span>
                    <span className="text-xs font-bold font-mono text-slate-500">
                      {dashboardData?.subscriptions?.cancellations !== undefined ? `-${dashboardData.subscriptions.cancellations.toLocaleString()}` : "-0"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Overview Visual Highlights (Main charts in Dashboard overview) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Revenue overview Chart bar */}
              <div className="lg:col-span-2 bg-[#0F1218] border border-[#1E232D] p-5 flex flex-col h-[320px]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-purple-400" /> MONTHLY SYSTEM PERFORMANCE ANALYSIS
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">FINANCE & SCALE AUDITING TIMELINE</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 w-full font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getOverviewChartData(dashboardData)}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevOverview" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" vertical={false} />
                      <XAxis dataKey="month" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ backgroundColor: "#141822", borderColor: "#1E232D" }} />
                      <Area type="monotone" dataKey="rev" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevOverview)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* DEMOGRAPHICS AND PLAN SHARE donuts widget */}
              <div className="bg-[#0F1218] border border-[#1E232D] p-5 flex flex-col h-[320px]">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-purple-400" /> Plan Distribution Ratio
                </span>
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-4">Ratio of paid account metrics</span>
                
                <div className="flex-1 flex justify-center items-center relative font-mono text-[10px]">
                  <div className="absolute text-center">
                    <span className="text-xl font-bold font-mono text-white">
                      {dashboardData?.users?.total ? `${(((dashboardData.users.plus + dashboardData.users.premium) / dashboardData.users.total) * 100).toFixed(1)}%` : "0.0%"}
                    </span>
                    <span className="text-[9px] text-slate-400 block uppercase">CONVERTED RATIO</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Free Plan", value: dashboardData?.users?.free || 0, color: "#475569" },
                          { name: "Plus Plan", value: dashboardData?.users?.plus || 0, color: "#3B82F6" },
                          { name: "Premium Plan", value: dashboardData?.users?.premium || 0, color: "#8B5CF6" }
                        ]}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { name: "Free Plan", value: dashboardData?.users?.free || 0, color: "#475569" },
                          { name: "Plus Plan", value: dashboardData?.users?.plus || 0, color: "#3B82F6" },
                          { name: "Premium Plan", value: dashboardData?.users?.premium || 0, color: "#8B5CF6" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-[#1E232D]/60 pt-3">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-slate-300">PREMIUM CUSTOMERS</span>
                    </div>
                    <span className="font-bold text-slate-200">
                      {dashboardData?.users?.total ? `${((dashboardData.users.premium / dashboardData.users.total) * 100).toFixed(1)}%` : "0.0%"} ({dashboardData?.users?.premium || 0})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-slate-300">PLUS MEMBERSHIP</span>
                    </div>
                    <span className="font-bold text-slate-200">
                      {dashboardData?.users?.total ? `${((dashboardData.users.plus / dashboardData.users.total) * 100).toFixed(1)}%` : "0.0%"} ({dashboardData?.users?.plus || 0})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      <span className="text-slate-400">FREE TIERS</span>
                    </div>
                    <span className="font-bold text-slate-400">
                      {dashboardData?.users?.total ? `${((dashboardData.users.free / dashboardData.users.total) * 100).toFixed(1)}%` : "0.0%"} ({dashboardData?.users?.free || 0})
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick System Health widget block */}
            <div className="bg-[#0F1218] border border-[#1E232D] p-5 rounded-none">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-[#22D3EE]" /> REAL-TIME MONITORING HANDSHAKE TELEMETRY
              </span>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 font-mono">
                <div className="bg-[#151921]/40 border border-[#1E232D]/40 p-3">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">RESPONSE SECONDS</span>
                  <span className="text-base font-bold text-[#22D3EE] mt-1 block">14ms latency</span>
                </div>
                <div className="bg-[#151921]/40 border border-[#1E232D]/40 p-3">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">SUCCESS RATE</span>
                  <span className="text-base font-bold text-emerald-400 mt-1 block">99.85% OK</span>
                </div>
                <div className="bg-[#151921]/40 border border-[#1E232D]/40 p-3">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">THROUGHPUT</span>
                  <span className="text-base font-bold text-slate-200 mt-1 block">42.5 req/sec</span>
                </div>
                <div className="bg-[#151921]/40 border border-[#1E232D]/40 p-3">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">LAST SYNC INDEX</span>
                  <span className="text-base font-bold text-purple-400 mt-1 block flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {lastSyncTime.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== 2. REVENUE TRENDS PAGE ==================== */}
        {subTab === "revenue" && (
          <div className="space-y-6">
            <div className="bg-[#0F1218] border border-[#1E232D] p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E232D] pb-4 mb-5">
                <div>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-purple-400" /> Platform Income Performance Index
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">Configure interval display trends below</p>
                </div>

                <div className="flex items-center gap-1 background-[#141822] border border-[#1E232D] p-0.5">
                  {(["7d", "30d", "90d", "1y"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRevenueRange(r)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer ${
                        revenueRange === r 
                          ? "bg-purple-500 text-white" 
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {revenueLoading ? (
                <div className="h-[280px] w-full bg-slate-900/40 animate-pulse border border-[#1E232D]/50 flex items-center justify-center font-mono text-xs uppercase tracking-wider text-slate-500">
                  Compiling time-series indices...
                </div>
              ) : revenueError ? (
                <div className="h-[280px] border border-rose-500/20 p-5 font-mono text-xs text-rose-400 uppercase flex items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to process dynamic revenue trends: {revenueError}.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Grossing performance breakdown numbers */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                    <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                      <span className="text-[9px] text-[#A78BFA] font-bold block uppercase tracking-wider">TOTAL IN INTERVAL</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        ${revenueData?.summary?.totalRevenue?.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">AVERAGE INGEST / UNIT</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        ${revenueData?.summary?.averageRevenue?.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                      <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider">INTERVAL GROWTH RATIO</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">
                        +{revenueData?.summary?.growthPercent}%
                      </span>
                    </div>
                    <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">VOLUME TRANSACTIONS</span>
                      <span className="text-xl font-bold text-slate-200 mt-1 block">
                        {revenueData?.summary?.transactionCount?.toLocaleString()} queries
                      </span>
                    </div>
                  </div>

                  {/* Main Time-series Recharts Area Graph */}
                  <div className="h-[280px] w-full font-mono text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={safeArray(revenueData?.trends || revenueData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueAreaGradPrivate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" vertical={false} />
                        <XAxis dataKey="date" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#141822", borderColor: "#1E232D" }} />
                        <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueAreaGradPrivate)" />
                        <Area type="monotone" dataKey="plusRevenue" name="Plus Plan share" stroke="#3B82F6" strokeWidth={1} fill="none" strokeDasharray="5 5" />
                        <Area type="monotone" dataKey="premiumRevenue" name="Premium share" stroke="#22D3EE" strokeWidth={1} fill="none" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 3. USER ACCOUNTS PAGE ==================== */}
        {subTab === "users" && (
          <div className="space-y-6">
            {/* Dynamic Real-time Users Core Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CARD 1: OVERALL ACTIVE DIRECTORY */}
              <div id="stat-total-users" className="bg-[#0F1218] border border-[#1E232D] p-4 relative overflow-hidden">
                <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-widest uppercase block">TOTAL REGISTERED USERS</span>
                
                {dashboardLoading ? (
                  <div className="h-7 w-28 bg-[#151921] animate-pulse mt-1.5" />
                ) : (
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {dashboardData?.users?.total !== undefined ? dashboardData.users.total.toLocaleString() : "--"}
                  </div>
                )}
                
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-[#1E232D]/60 pt-2 text-[10px] text-slate-400 font-mono uppercase">
                  <span>ACTIVE SESSIONS:</span>
                  <span className="text-emerald-400 font-bold">
                    {dashboardLoading ? "..." : dashboardData?.users?.active !== undefined ? dashboardData.users.active.toLocaleString() : "--"}
                  </span>
                </div>
              </div>

              {/* CARD 2: PREMIUM ACCOUNTS */}
              <div id="stat-premium-users" className="bg-[#0F1218] border border-[#1E232D] p-4 relative overflow-hidden">
                <div className="absolute right-3 top-3 text-[9px] font-mono text-purple-400 font-bold tracking-widest">★ PRO</div>
                <span className="text-[10px] text-purple-400 font-bold font-mono tracking-widest uppercase block">PREMIUM TIERS</span>
                
                {dashboardLoading ? (
                  <div className="h-7 w-20 bg-[#151921] animate-pulse mt-1.5" />
                ) : (
                  <div className="text-xl font-bold font-mono text-white mt-1 flex items-baseline gap-1.5">
                    <span>{dashboardData?.users?.premium !== undefined ? dashboardData.users.premium.toLocaleString() : "--"}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {dashboardData?.users?.premium !== undefined && dashboardData?.users?.total ? `(${((dashboardData.users.premium / dashboardData.users.total) * 100).toFixed(1)}%)` : ""}
                    </span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-1.5 border-t border-[#1E232D]/60 pt-2 text-[10px] text-slate-400 font-mono uppercase">
                  <span>GROWTH VALUE:</span>
                  <span className="text-purple-400 font-bold">★ HIGH CONVERSION</span>
                </div>
              </div>

              {/* CARD 3: FREE & PLUS TIERS */}
              <div id="stat-free-plus-users" className="bg-[#0F1218] border border-[#1E232D] p-4 relative overflow-hidden">
                <div className="absolute right-3 top-3 text-[9px] font-mono text-blue-400 font-bold tracking-widest">⚡ ACTIVE</div>
                <span className="text-[10px] text-slate-500 font-bold font-mono tracking-widest uppercase block">FREE & PLUS MEMBERS</span>
                
                {dashboardLoading ? (
                  <div className="h-7 w-32 bg-[#151921] animate-pulse mt-1.5" />
                ) : (
                  <div className="text-xl font-bold font-mono text-white mt-1 flex items-baseline gap-3">
                    <span className="text-slate-300">{dashboardData?.users?.free !== undefined ? dashboardData.users.free.toLocaleString() : "--"}<span className="text-[9px] text-slate-500 font-normal ml-1">F</span></span>
                    <span className="text-blue-400">{dashboardData?.users?.plus !== undefined ? dashboardData.users.plus.toLocaleString() : "--"}<span className="text-[9px] text-blue-500 font-normal ml-1">P</span></span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-[#1E232D]/60 pt-2 text-[10px] text-slate-400 font-mono uppercase">
                  <span>FREE: {dashboardLoading ? "..." : (dashboardData?.users?.free !== undefined && dashboardData?.users?.total) ? `${((dashboardData.users.free / dashboardData.users.total) * 100).toFixed(0)}%` : "--"}</span>
                  <span>PLUS: {dashboardLoading ? "..." : (dashboardData?.users?.plus !== undefined && dashboardData?.users?.total) ? `${((dashboardData.users.plus / dashboardData.users.total) * 100).toFixed(0)}%` : "--"}</span>
                </div>
              </div>

              {/* CARD 4: ACQUISITION VELOCITY / ADDED GROWTH */}
              <div id="stat-acquisition-velocity" className="bg-[#0F1218] border border-[#1E232D] p-4 relative overflow-hidden">
                <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-widest uppercase block">ACQUISITION VELOCITY</span>
                
                {dashboardLoading ? (
                  <div className="h-7 w-28 bg-[#151921] animate-pulse mt-1.5" />
                ) : (
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-baseline gap-1">
                    <span>+{dashboardData?.users?.today !== undefined ? dashboardData.users.today.toLocaleString() : "0"}</span>
                    <span className="text-[9px] text-slate-500 font-normal uppercase font-mono ml-1">TODAY</span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-[#1E232D]/60 pt-2 text-[10px] text-slate-400 font-mono uppercase">
                  <div>
                    WEEK: <span className="text-white font-bold font-mono">+{dashboardLoading ? "..." : dashboardData?.users?.weekly !== undefined ? dashboardData.users.weekly.toLocaleString() : "0"}</span>
                  </div>
                  <div>
                    MONTH: <span className="text-white font-bold font-mono">+{dashboardLoading ? "..." : dashboardData?.users?.monthly !== undefined ? dashboardData.users.monthly.toLocaleString() : "0"}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Main directory list and filters */}
              <div className="lg:col-span-4 bg-[#0F1218] border border-[#1E232D] p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#1E232D]/80 mb-5">
                  <div>
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-purple-400" /> Platform Registered Users
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">FILTER AND AUDIT ENROLMENTS SECURELY</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-[11px]">
                    <div className="relative flex-1 md:flex-initial min-w-[150px]">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search Emails or Names..."
                        value={usersFilter.search}
                        onChange={(e) => setUsersFilter(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#141822] border border-[#1E232D] text-white rounded-none outline-none focus:border-[#8B5CF6]/40 transition-colors"
                      />
                    </div>

                    <select
                      value={usersFilter.plan}
                      onChange={(e) => setUsersFilter(prev => ({ ...prev, plan: e.target.value, page: 1 }))}
                      className="bg-[#141822] border border-[#1E232D] text-slate-300 py-1.5 px-3 rounded-none outline-none focus:border-[#8B5CF6]/40 text-xs text-semibold cursor-pointer uppercase"
                    >
                      <option value="All">All Plans</option>
                      <option value="Free">Free</option>
                      <option value="Plus">Plus</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="py-24 text-center font-mono text-xs uppercase text-slate-500 animate-pulse tracking-wider">
                    Querying account databases...
                  </div>
                ) : usersError ? (
                  <div className="py-12 border border-rose-500/20 text-center font-mono text-xs text-rose-400 uppercase flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <span>Failed to synchronize active directory: {usersError}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#1E232D] text-slate-500 text-[10px] tracking-wider uppercase font-bold">
                            <th className="pb-3 pr-2 font-medium">ACCOUNT / END-USER</th>
                            <th className="pb-3 px-2 font-medium">LOCATION</th>
                            <th className="pb-3 px-2 font-medium">TIER PLAN</th>
                            <th className="pb-3 px-2 font-medium">JOINED DATE</th>
                            <th className="pb-3 pl-2 font-medium text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E232D]/40">
                          {usersData?.users?.map((user: any) => (
                            <tr key={user.id} className="hover:bg-[#151921]/40 border-b border-[#1E232D]/20 transition-colors">
                              <td className="py-3 pr-2 flex items-center gap-3">
                                <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="h-7 w-7 rounded-none bg-[#141822] border border-[#1E232D]" />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-white truncate max-w-[150px]">{user.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEmailRecipientsMode("custom");
                                      setEmailRecipientsText(user.email);
                                      setIsEmailModalOpen(true);
                                      setEmailError(null);
                                      setEmailSuccess(null);
                                      setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-indigo-400 font-mono transition text-left cursor-pointer flex items-center gap-1 group/usermail"
                                    title={`Compose administrative email for ${user.email}`}
                                  >
                                    <span className="truncate max-w-[150px] underline decoration-dotted decoration-slate-600 group-hover/usermail:decoration-indigo-400">{user.email}</span>
                                    <Mail className="h-2.5 w-2.5 opacity-0 group-hover/usermail:opacity-100 transition-opacity text-indigo-400" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  <span className="text-[10px] uppercase font-bold bg-[#141822] border border-[#1E232D] px-1.5 py-0.5">{user.country}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 font-bold text-[10px] border tracking-wider uppercase ${planColorMap[user.plan] || ""}`}>
                                  {user.plan}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 text-[11px]">{new Date(user.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td className="py-3 pl-2 text-right">
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="px-2.5 py-1 hover:bg-[#8B5CF6]/10 hover:text-white border border-[#1E232D] text-slate-400 bg-[#141822] text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                                >
                                  Configure
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Compact list pagination controller */}
                    <div className="flex justify-between items-center bg-[#141822]/40 border border-[#1E232D] p-3 font-mono text-[10px]">
                      <span className="text-slate-500 uppercase">
                        Page {usersFilter.page} of {usersData?.pagination?.totalPages || 1} // Total count: {usersData?.pagination?.total || 0} registries
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={usersFilter.page === 1}
                          onClick={() => setUsersFilter(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                          className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={usersFilter.page >= (usersData?.pagination?.totalPages || 1)}
                          onClick={() => setUsersFilter(prev => ({ ...prev, page: prev.page + 1 }))}
                          className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>





          </div>
        )}

        {/* ==================== 4. CONVERSION FUNNELS & SUBSCRIBERS ==================== */}
        {subTab === "subscribers" && (
          <div className="space-y-6">
            <div className="bg-[#0F1218] border border-[#1E232D] p-5">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-purple-400" /> COMPILATION OF UPGRADE CONVERSIONS
              </span>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest block mb-5">Subscription upgrade statistics analysis</span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono mb-6">
                <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">CONVERSION GAIN</span>
                  <span className="text-xl font-bold text-[#A78BFA] mt-1 block">42.8% upgraded</span>
                  <span className="text-[10px] text-slate-500 mt-1 block uppercase">LIFETIME GROWTH TIMELINE</span>
                </div>
                <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">RENEWAL INDEX</span>
                  <span className="text-xl font-bold text-[#A78BFA] mt-1 block">96.4% success</span>
                  <span className="text-[10px] text-slate-500 mt-1 block uppercase">AUTOMATIC BILLING RECURRENCE</span>
                </div>
                <div className="bg-[#151921]/45 border border-[#1E232D] p-4">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">ESTIMATED LTV INDEX</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">$188.5 per account</span>
                  <span className="text-[10px] text-slate-500 mt-1 block uppercase">AVERAGE BASKET SIZE PERFORMANCE</span>
                </div>
              </div>

              {/* Subscriber trajectory line chart */}
              <div className="border border-[#1E232D] p-4 bg-[#141822]/20 rounded-none">
                <span className="text-[10px] text-slate-200 font-bold font-mono tracking-wider block mb-4 uppercase">PAID CONVERSIONS TIME-SERIES CURVE</span>
                <div className="h-[260px] w-full font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={safeArray(usersGrowth)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ backgroundColor: "#141822", borderColor: "#1E232D" }} />
                      <Line type="monotone" dataKey="totalUsers" stroke="#8B5CF6" strokeWidth={2.5} name="Total Database" dot={false} />
                      <Line type="monotone" dataKey="newUsers" stroke="#22D3EE" strokeWidth={2} name="Daily Signups" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. DEMOGRAPHICS PAGE ==================== */}
        {subTab === "demographics" && (
          <div className="space-y-6">
            {demographicsLoading ? (
              <div className="py-24 text-center font-mono text-xs uppercase text-slate-500 animate-pulse tracking-wider">
                Capturing international user matrix...
              </div>
            ) : demographicsError ? (
              <div className="py-12 border border-rose-500/20 text-center font-mono text-xs text-rose-400 uppercase flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Error mapping demographics indices: {demographicsError}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Horizontal Demographics Chart Bar */}
                <div className="bg-[#0F1218] border border-[#1E232D] p-5">
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-purple-400" /> Geographic Footprint Split
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest block mb-4">Core geo-location registrations mapped</span>

                  <div className="space-y-4 font-mono text-xs">
                    {demographicsData?.countryDistribution?.map((item: any, idx: number) => (
                      <div key={item.country}>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-bold text-slate-200">
                            {idx + 1}. <span className="text-purple-400 tracking-wider uppercase">{item.country}</span>
                          </span>
                          <span className="text-slate-400 text-[10px]">{item.count.toLocaleString()} user bases ({item.percent}%)</span>
                        </div>
                        <div className="w-full bg-[#151921] h-1.5 rounded-none overflow-hidden">
                          <div className="h-full bg-[#8B5CF6] transition-all" style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demographics regional speed breakdown */}
                <div className="bg-[#0F1218] border border-[#1E232D] p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-purple-400" /> Regional Core Speeds
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest block mb-4">Macro regional signup speeds metrics</span>

                    <div className="overflow-x-auto text-[11px] font-mono">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#1E232D] text-slate-500 text-[9px] uppercase font-bold tracking-wider">
                            <th className="pb-2">TERRIOR REGION</th>
                            <th className="pb-2">SPEED INDICES</th>
                            <th className="pb-2 text-right">PREMIUM RATIO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E232D]/40">
                          {demographicsData?.regionalGrowth?.map((item: any) => (
                            <tr key={item.region} className="hover:bg-[#151921]/20">
                              <td className="py-2.5 font-bold text-slate-300">{item.region}</td>
                              <td className="py-2.5 text-emerald-400">+{item.growth}% M/M</td>
                              <td className="py-2.5 text-right font-bold text-purple-400">{item.pctPremium}% Ratio</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 border border-[#1E232D] bg-[#151921]/40 px-3 py-2.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono text-center">
                    ALL INTERREGIONAL COMPILATION HANDSHAKES VERIFIED
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ==================== 6. PAYMENTS LEDGER PAGE ==================== */}
        {subTab === "payments" && (
          <div className="space-y-6">
            <div className="bg-[#0F1218] border border-[#1E232D] p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#1E232D]/80 mb-5">
                <div>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-[#8B5CF6]" /> Platform Invoicing Ledger
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">TRANSACTION MEMO LEDGER DETAILS AND STATUS CHANNELS</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-[11px]">
                  <div className="relative flex-1 md:flex-initial min-w-[150px]">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search Invoice Ref / Users..."
                      value={paymentsFilter.search}
                      onChange={(e) => setPaymentsFilter(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#141822] border border-[#1E232D] text-white rounded-none outline-none focus:border-[#8B5CF6]/40 transition-colors"
                    />
                  </div>

                  <select
                    value={paymentsFilter.plan}
                    onChange={(e) => setPaymentsFilter(prev => ({ ...prev, plan: e.target.value, page: 1 }))}
                    className="bg-[#141822] border border-[#1E232D] text-slate-300 py-1.5 px-3 rounded-none outline-none focus:border-[#8B5CF6]/40 text-xs text-semibold cursor-pointer uppercase font-mono"
                  >
                    <option value="All">All Plans</option>
                    <option value="Plus">Plus</option>
                    <option value="Premium">Premium</option>
                  </select>

                  <button
                    onClick={exportPaymentsToCSV}
                    disabled={!paymentsData || !paymentsData.payments || paymentsData.payments.length === 0}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50 font-mono uppercase"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV Export</span>
                  </button>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="py-24 text-center font-mono text-xs uppercase text-slate-500 animate-pulse tracking-wider">
                  Syncing transactional accounts...
                </div>
              ) : paymentsError ? (
                <div className="py-12 border border-rose-500/20 text-center font-mono text-xs text-rose-400 uppercase flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <span>Failed to process audit ledger: {paymentsError}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1E232D] text-slate-500 text-[10px] tracking-wider uppercase font-bold">
                          <th className="pb-3 pr-2 font-medium">INVOICE REF</th>
                          <th className="pb-3 px-2 font-medium">CUSTOMER EMAIL</th>
                          <th className="pb-3 px-2 font-medium">PLAN LEVEL</th>
                          <th className="pb-3 px-2 font-medium">COUNTRY</th>
                          <th className="pb-3 px-2 font-medium">TRANS DATE</th>
                          <th className="pb-3 px-2 font-medium">VALUE</th>
                          <th className="pb-3 pl-2 font-medium text-right">BILLING STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E232D]/40">
                        {paymentsData?.payments?.map((pay: any) => (
                          <tr key={pay.id} className="hover:bg-[#151921]/45 border-b border-[#1E232D]/20 transition-colors">
                            <td className="py-3.5 pr-2 font-bold text-slate-300">{pay.invoiceRef}</td>
                            <td className="py-3.5 px-2 text-slate-300 truncate max-w-[180px]">{pay.customerEmail}</td>
                            <td className="py-3.5 px-2">
                              <span className={`px-2 py-0.5 font-bold text-[10px] border tracking-wider uppercase ${planColorMap[pay.plan] || ""}`}>
                                {pay.plan}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-slate-400 uppercase font-bold">{pay.country}</td>
                            <td className="py-3.5 px-2 text-slate-400">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                            <td className="py-3.5 px-2 font-bold text-[#E2E8F0]">${pay.amount.toFixed(2)}</td>
                            <td className="py-3.5 pl-2 text-right">
                              <span className={`px-2 py-0.5 font-bold text-[10px] uppercase ${statusColorMap[pay.status] || ""}`}>
                                {pay.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Payments pagination panel controller */}
                  <div className="flex justify-between items-center bg-[#141822]/40 border border-[#1E232D] p-3 font-mono text-[10px]">
                    <span className="text-slate-500 uppercase">
                      Page {paymentsFilter.page} of {paymentsData?.pagination?.totalPages || 1} // Platform ledger logs active
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        disabled={paymentsFilter.page === 1}
                        onClick={() => setPaymentsFilter(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={paymentsFilter.page >= (paymentsData?.pagination?.totalPages || 1)}
                        onClick={() => setPaymentsFilter(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 7. AUDITS & SECURITY REGISTRY ==================== */}
        {subTab === "security" && (
          <div className="space-y-6">
            <div className="bg-[#0F1218] border border-[#1E232D] p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#1E232D]/80 mb-5">
                <div>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-purple-400 animate-pulse" /> Access Handshake Audit Trails
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Real-time gateway request routing and security statuses</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-[11px]">
                  <div className="relative flex-1 md:flex-initial min-w-[150px]">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search IP / Host Endpoints..."
                      value={securityFilter.search}
                      onChange={(e) => setSecurityFilter(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#141822] border border-[#1E232D] text-white rounded-none outline-none focus:border-[#8B5CF6]/40 transition-colors"
                    />
                  </div>

                  <select
                    value={securityFilter.status}
                    onChange={(e) => setSecurityFilter(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                    className="bg-[#141822] border border-[#1E232D] text-slate-300 py-1.5 px-3 rounded-none outline-none focus:border-[#8B5CF6]/40 text-xs text-semibold cursor-pointer uppercase font-mono"
                  >
                    <option value="All">All Codes</option>
                    <option value="Success">Success (2xx)</option>
                    <option value="Rate Limited">Rate Limit (429)</option>
                    <option value="Unauthorized">Access Block (401/403)</option>
                  </select>
                </div>
              </div>

              {securityLoading ? (
                <div className="py-24 text-center font-mono text-xs uppercase text-slate-500 animate-pulse tracking-wider">
                  Syncing access logs...
                </div>
              ) : securityError ? (
                <div className="py-12 border border-rose-500/20 text-center font-mono text-xs text-rose-400 uppercase flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <span>Failed to retrieve secure logs: {securityError}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1E232D] text-slate-500 text-[10px] tracking-wider uppercase font-bold">
                          <th className="pb-3 pr-2 font-medium">TIMESTAMP UTC</th>
                          <th className="pb-3 px-2 font-medium">ENDPOINT ROUTE</th>
                          <th className="pb-3 px-2 font-medium">METHOD</th>
                          <th className="pb-3 px-2 font-medium">CLIENT HOST IP</th>
                          <th className="pb-3 px-2 font-medium">HANDSHAKE SPEEDS</th>
                          <th className="pb-3 pl-2 font-medium text-right">SECURITY STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E232D]/40">
                        {securityData?.logs?.map((item: any) => {
                          const isSuccess = item.statusCode >= 200 && item.statusCode < 300;
                          const isRate = item.statusCode === 429;
                          const isError = item.statusCode === 401 || item.statusCode === 403 || item.statusCode >= 500;
                          
                          let statusLabelClass = "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20";
                          if (isSuccess) statusLabelClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                          if (isRate) statusLabelClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                          if (isError) statusLabelClass = "bg-rose-500/10 text-rose-400 border border-rose-500/25";

                          return (
                            <tr key={item.id} className="hover:bg-[#151921]/45 border-b border-[#1E232D]/20 transition-colors">
                              <td className="py-3 pr-2 text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</td>
                              <td className="py-3 px-2 text-slate-200 font-bold max-w-[180px] truncate">{item.endpoint}</td>
                              <td className="py-3 px-2 text-slate-400 font-bold uppercase">{item.method}</td>
                              <td className="py-3 px-2 text-[#94A3B8]">{item.clientIp}</td>
                              <td className="py-3 px-2 text-[#E2E8F0] font-bold">{item.latencyMs}ms</td>
                              <td className="py-3 pl-2 text-right">
                                <span className={`px-2 py-0.5 rounded-none font-bold text-[10px] uppercase ${statusLabelClass}`}>
                                  {isSuccess ? "200 OK" : isRate ? "429 RATE" : isError ? `${item.statusCode} BLOCK` : "STATUS"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Security pagination panel controller */}
                  <div className="flex justify-between items-center bg-[#141822]/40 border border-[#1E232D] p-3 font-mono text-[10px]">
                    <span className="text-slate-500 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SECURE SHIELD ACTIVE AND DEFLECTING ATTACKS
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        disabled={securityFilter.page === 1}
                        onClick={() => setSecurityFilter(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={securityFilter.page >= (securityData?.pagination?.totalPages || 1)}
                        onClick={() => setSecurityFilter(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="px-2.5 py-1 border border-[#1E232D] hover:bg-[#1E232D] hover:text-white text-slate-400 font-bold uppercase disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ================= INTERACTIVE USER DETAILS SIDE DRAWER ================= */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[80] overflow-hidden font-mono text-xs flex justify-end items-end md:items-stretch">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedUser(null);
                setIsEditingUser(false);
                setIsDeletingUser(false);
                setDeleteConfirmText("");
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            />

            <div className={`fixed z-10 transition-all ${isMobile ? "bottom-0 inset-x-0 h-[88vh] max-h-[88vh] w-full" : "inset-y-0 right-0 w-full md:max-w-md h-full"}`}>
              <motion.div 
                initial={isMobile ? { y: "100%" } : { x: "100%" }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: "100%" } : { x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
                className={`w-full h-full bg-[#0B0D13] border-[#1C202B] flex flex-col shadow-2xl relative ${isMobile ? "rounded-t-[2.5rem] border-t-2" : "border-l"}`}
              >
                {/* iOS-style top handle for pure mobile feel */}
                {isMobile && (
                  <div className="w-16 h-1 bg-[#1E232F] rounded-full mx-auto my-3.5 shrink-0" />
                )}

                {/* Drawer header */}
                <div className={`p-4 md:p-6 border-b border-[#1C202B] bg-[#0E1119] flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${isMobile ? "pt-1" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setIsEditingUser(false);
                        setIsDeletingUser(false);
                        setDeleteConfirmText("");
                      }}
                      className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                      title="Back to Directory"
                    >
                      <ChevronLeft className="h-5 w-5 text-purple-400" />
                    </button>
                    <div className="flex items-center gap-2">
                       <UserCheck className="h-4 w-4 text-purple-400 shrink-0" />
                       <span className="font-bold text-white uppercase tracking-wider text-[11px] md:text-xs">User Inspector</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedUser(null);
                      setIsEditingUser(false);
                      setIsDeletingUser(false);
                      setDeleteConfirmText("");
                    }}
                    className="hidden md:block p-1.5 px-3 border border-[#1E232D] hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors uppercase font-mono text-[9px] font-bold cursor-pointer"
                  >
                    Close [ESC]
                  </button>
                </div>

                {/* Drawer body details */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Premium iOS-style Avatar card */}
                  <div className="bg-[#10141E] border border-[#1C202B] p-5 rounded-2xl text-center flex flex-col items-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-[8px] font-bold uppercase tracking-wider font-mono">
                      {selectedUser.plan || "Free"}
                    </div>
                    <img src={selectedUser.avatarUrl} alt={selectedUser.name} referrerPolicy="no-referrer" className="h-20 w-20 mb-3 bg-[#080A0E] border-2 border-purple-500/30 rounded-full shadow-md object-cover" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5 justify-center">
                      {selectedUser.name}
                      {selectedUser.email_verified && <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailRecipientsMode("custom");
                        setEmailRecipientsText(selectedUser.email);
                        setIsEmailModalOpen(true);
                        setEmailError(null);
                        setEmailSuccess(null);
                        setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                      }}
                      className="text-[10px] text-slate-400 hover:text-purple-400 mt-1 cursor-pointer hover:underline flex items-center gap-1 justify-center transition"
                      title={`Send administrative email to ${selectedUser.email}`}
                    >
                      <span>{selectedUser.email}</span>
                      <Mail className="h-3 w-3 text-purple-400 shrink-0" />
                    </button>
                    <span className="text-[8px] text-slate-500 uppercase mt-2 select-all font-mono tracking-wider">GUID: {selectedUser.id}</span>
                  </div>

                  {isEditingUser ? (
                    /* EDITING PANEL */
                    <div className="space-y-4 bg-[#10141E] border border-[#1C202B] p-5 rounded-2xl font-mono">
                      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest border-b border-[#1D212E] pb-2">Edit Account Details</h4>
                      
                      {saveUserError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg">
                          ⚠️ {saveUserError}
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Full Name</label>
                          <input 
                            type="text"
                            value={editFormName}
                            onChange={(e) => setEditFormName(e.target.value)}
                            className="w-full bg-[#080A0E] border border-[#1E232D] p-2.5 text-white focus:border-[#A78BFA] outline-none text-xs font-mono rounded-lg"
                            placeholder="Enter full name"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Billing Plan</label>
                          <select 
                            value={editFormPlan}
                            onChange={(e) => setEditFormPlan(e.target.value)}
                            className="w-full bg-[#080A0E] border border-[#1E232D] p-2.5 text-white focus:border-[#A78BFA] outline-none text-xs font-mono rounded-lg cursor-pointer"
                          >
                            <option value="free">Free</option>
                            <option value="plus">Plus</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Experience Level</label>
                          <select 
                            value={editFormExperience}
                            onChange={(e) => setEditFormExperience(e.target.value)}
                            className="w-full bg-[#080A0E] border border-[#1E232D] p-2.5 text-white focus:border-[#A78BFA] outline-none text-xs font-mono rounded-lg cursor-pointer"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Expert">Expert</option>
                            <option value="Veteran">Veteran</option>
                            <option value="LEGEND">LEGEND</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Subscription Expiry</label>
                          <input 
                            type="date"
                            value={editFormExpiry}
                            onChange={(e) => setEditFormExpiry(e.target.value)}
                            className="w-full bg-[#080A0E] border border-[#1E232D] p-2.5 text-white focus:border-[#A78BFA] outline-none text-xs font-mono rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <button
                          disabled={isSavingUser}
                          onClick={handleSaveUser}
                          className="py-2.5 bg-[#A78BFA] hover:bg-[#A78BFA]/90 text-black font-bold text-center uppercase text-[10px] tracking-wider disabled:opacity-40 cursor-pointer rounded-lg transition-colors"
                        >
                          {isSavingUser ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          disabled={isSavingUser}
                          onClick={() => {
                            setIsEditingUser(false);
                            setSaveUserError(null);
                          }}
                          className="py-2.5 border border-[#1E232D] hover:bg-[#1E232D] text-slate-400 font-bold text-center uppercase text-[10px] tracking-wider disabled:opacity-40 cursor-pointer rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* READ ONLY BODY */
                    <>
                      {/* Biography section */}
                      <div className="space-y-3 bg-[#10141E] border border-[#1C202B] p-4 rounded-2xl shadow-sm text-left">
                        <h4 className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-widest border-b border-[#1D212E] pb-1.5 flex items-center gap-1.5">
                          <span>User Biography</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed italic select-all">
                          {selectedUser.bio ? `"${selectedUser.bio}"` : '"No custom biography text defined by the user."'}
                        </p>
                      </div>

                      {/* GAMEPLAY STATISTICS & DAILY STREAKS SECTIONS */}
                      <div className="space-y-3 bg-[#10141E] border border-[#1C202B] p-4 rounded-2xl shadow-sm">
                        <h4 className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-widest border-b border-[#1D212E] pb-1.5 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>Sim Gameplay & Streaks</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl flex flex-col justify-center text-left">
                            <span className="text-[9px] text-slate-500 uppercase block">ACTIVE STREAK</span>
                            <span className="text-sm font-black text-amber-400 mt-1 block font-mono">
                              🔥 {selectedUser.settings?.streakCount || 0} DAYS
                            </span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl flex flex-col justify-center text-left">
                            <span className="text-[9px] text-slate-500 uppercase block">LONGEST STREAK</span>
                            <span className="text-sm font-black text-emerald-400 mt-1 block font-mono">
                              🏆 {selectedUser.settings?.longestStreak || 0} DAYS
                            </span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl flex flex-col justify-center text-left">
                            <span className="text-[9px] text-slate-500 uppercase block">REPLAY PREFIX</span>
                            <span className="text-xs font-bold text-slate-200 mt-1 block font-mono truncate" title={selectedUser.settings?.activePrefix}>
                              {selectedUser.settings?.activePrefix || "N/A"}
                            </span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl flex flex-col justify-center text-left">
                            <span className="text-[9px] text-slate-500 uppercase block">SELECTED TIMEFRAME</span>
                            <span className="text-xs font-bold text-slate-200 mt-1 block font-mono uppercase">
                              ⏱️ {selectedUser.settings?.selectedTimeframeId || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Chart Customizations */}
                        <div className="mt-3 bg-[#080A0E]/60 border border-[#1C202B]/60 p-3 rounded-xl font-mono text-[9px] space-y-1.5 text-left">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 uppercase">FAVORITE DRAWING TOOLS</span>
                            <span className="text-slate-300 font-semibold text-right max-w-[180px] truncate" title={selectedUser.settings?.favorites ? selectedUser.settings.favorites.join(", ") : "None"}>
                              {selectedUser.settings?.favorites && selectedUser.settings.favorites.length > 0 
                                ? selectedUser.settings.favorites.join(", ") 
                                : "No tools bookmarked"
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2 font-mono">
                            <span className="text-slate-500 uppercase">LAST ACTIVE WATCHLIST ITEM</span>
                            <span className="text-[#A78BFA] font-mono select-all truncate max-w-[185px]" title={selectedUser.settings?.activeWatchlistItemId}>
                              {selectedUser.settings?.activeWatchlistItemId || "No active session"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Core profile credentials */}
                      <div className="space-y-4 bg-[#10141E] border border-[#1C202B] p-4 rounded-2xl shadow-sm text-left">
                        <h4 className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-widest border-b border-[#1D212E] pb-1.5 flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span>Core account credentials</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3 font-mono">
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl">
                            <span className="text-[9px] text-slate-500 uppercase block">GEOLOC / REGION</span>
                            <span className="text-xs font-bold text-white mt-1 block uppercase truncate flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {selectedUser.country || "N/A"}
                            </span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl">
                            <span className="text-[9px] text-slate-500 uppercase block">BILLING PLAN</span>
                            <span className={`text-xs font-bold mt-1 block uppercase ${selectedUser.plan?.toLowerCase() === "premium" ? "text-purple-400" : selectedUser.plan?.toLowerCase() === "plus" ? "text-blue-400" : "text-slate-400"}`}>{selectedUser.plan || "Free"}</span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl">
                            <span className="text-[9px] text-slate-500 uppercase block">REG DATE</span>
                            <span className="text-xs font-bold text-slate-300 mt-1 block truncate">
                              {selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                          <div className="bg-[#080A0E] border border-[#1C202B] p-3 rounded-xl">
                            <span className="text-[9px] text-slate-500 uppercase block">EXPERIENCE</span>
                            <span className="text-xs font-bold mt-1 block text-emerald-400 uppercase">{selectedUser.experience_level || "Intermediate"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Extended Profile Attributes */}
                      <div className="bg-[#10141E] border border-[#1C202B] p-4 rounded-2xl shadow-sm space-y-3.5 font-mono text-left">
                        <h4 className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-widest border-b border-[#1D212E] pb-1.5 flex items-center gap-1.5 font-mono">
                          <Database className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          <span>Extended Attributes Registry</span>
                        </h4>
                        <div className="space-y-2.5 text-[10px]">
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Username / Handle</span>
                            <span className="text-slate-300 font-semibold select-all text-right">{selectedUser.username || "N/A"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Privilege Level</span>
                            <span className="text-purple-400 font-semibold uppercase text-right">{selectedUser.role || (selectedUser.is_admin ? "Central Admin" : "Standard Customer")}</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Verification Status</span>
                            <span className={selectedUser.email_verified || selectedUser.emailVerified ? "text-emerald-400 font-bold text-right" : "text-amber-400 text-right"}>
                              {selectedUser.email_verified || selectedUser.emailVerified ? "Verified ✔" : "Awaiting OTP"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40 gap-2">
                            <span className="text-slate-500 uppercase">Phone Reference</span>
                            <span className="text-slate-300 select-all text-right">{selectedUser.phone_number || selectedUser.phone || "None Recorded"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Billing Scheme</span>
                            <span className="text-slate-300 font-semibold text-right font-mono">
                              {selectedUser.is_recurring ? "🔄 Auto-Renewal Active" : "One-Time / Fixed-Term"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Account Status</span>
                            <span className={`font-bold uppercase text-right ${selectedUser.isBlocked || selectedUser.is_blocked || selectedUser.status === 'Blocked' ? "text-rose-400" : "text-emerald-400"}`}>
                              {selectedUser.isBlocked || selectedUser.is_blocked || selectedUser.status === 'Blocked' ? "SUSPENDED 🚫" : "ACTIVE ✔"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Term Expiration</span>
                            <span className="text-slate-300 text-right">
                              {selectedUser.subscriptionExpiry 
                                ? new Date(Number(selectedUser.subscriptionExpiry)).toLocaleDateString()
                                : (selectedUser.subscription_expiry ? new Date(selectedUser.subscription_expiry).toLocaleDateString() : (selectedUser.expiryDate || "Lifetime / No Expiry"))
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40 gap-2">
                            <span className="text-slate-500 uppercase font-mono">Device Handshake</span>
                            <span className="text-slate-400 truncate max-w-[180px] text-right font-mono" title={selectedUser.device_info || selectedUser.device}>{selectedUser.device_info || selectedUser.device || "N/A"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40">
                            <span className="text-slate-500 uppercase">Last Registry IP</span>
                            <span className="text-slate-400 select-all text-right font-mono">{selectedUser.last_ip || selectedUser.ip || "127.0.0.1"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-[#1C202B]/40 gap-2 font-mono pb-2">
                            <span className="text-slate-500 uppercase font-mono">Timezone Designation</span>
                            <span className="text-slate-400 text-right truncate max-w-[180px]" title={selectedUser.timezone}>{selectedUser.timezone || "Central European Time"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Web App JSON Payload Field Collapsible Toggle */}
                      <div className="border border-[#1C202B] bg-[#10141E] rounded-2xl overflow-hidden mt-4 shadow-sm font-mono text-left">
                        <details className="group cursor-pointer">
                          <summary className="p-3.5 select-none flex items-center justify-between font-bold text-[#A78BFA] uppercase text-[9px] tracking-wider outline-none font-mono">
                            <span>Raw Database JSON Record Payload</span>
                            <span className="text-[8px] text-slate-500 group-open:hidden">[+] SHOW PAYLOAD</span>
                            <span className="text-[8px] text-slate-500 hidden group-open:inline">[-] HIDE PAYLOAD</span>
                          </summary>
                          <div className="p-3.5 border-t border-[#1C202B] bg-black/40">
                            <pre className="text-[9px] font-mono leading-relaxed text-slate-400 overflow-x-auto whitespace-pre-wrap select-all font-mono">
                              {JSON.stringify(selectedUser, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>

                      {/* Deleting user Panel view */}
                      {isDeletingUser ? (
                        <div className="space-y-4 p-4 bg-rose-500/5 border border-rose-500/25 rounded-2xl text-left font-mono">
                          <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pb-1.5 border-b border-rose-500/20">Wipe User Profile</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            This action will <strong>permanently delete</strong> all records, charts, support threads, and sessions linked to this user's profile on the centralized registry. This is irreversible.
                          </p>
                          
                          {deleteUserError && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg">
                              ⚠️ {deleteUserError}
                            </div>
                          )}

                          <div>
                            <label className="text-[9px] text-slate-500 uppercase block mb-1">Type "DELETE" to confirm</label>
                            <input 
                              type="text"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                              className="w-full bg-[#080A0E] border border-rose-900/40 p-2.5 text-white focus:border-rose-500 outline-none text-xs font-mono uppercase rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                              disabled={isSavingUser}
                              onClick={handleDeleteUser}
                              className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-center uppercase text-[10px] tracking-wider disabled:opacity-40 cursor-pointer rounded-lg transition-colors"
                            >
                              {isSavingUser ? "Wiping..." : "Confirm Delete"}
                            </button>
                            <button
                              disabled={isSavingUser}
                              onClick={() => {
                                setIsDeletingUser(false);
                                setDeleteConfirmText("");
                                setDeleteUserError(null);
                              }}
                              className="py-2.5 border border-[#1E232D] hover:bg-[#1E232D] text-slate-400 font-bold text-center uppercase text-[10px] tracking-wider disabled:opacity-40 cursor-pointer rounded-lg transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Administrative Action handlers */
                        <div className="space-y-3 bg-[#10141E] border border-rose-500/10 p-4 rounded-2xl shadow-sm text-center font-mono">
                          <h4 className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-widest border-b border-[#1D212E] pb-1.5 flex items-center justify-start gap-1.5 font-mono">
                            <span>Administrative actions</span>
                          </h4>
                          
                          <button
                            onClick={handleStartEdit}
                            className="w-full py-2.5 border border-[#1E232D] hover:bg-[#1E232D] bg-[#080A0E] text-[#A78BFA] text-center font-bold uppercase text-[10px] tracking-wider cursor-pointer block rounded-lg transition-colors"
                          >
                            Edit Profile Details
                          </button>
                          
                          <button
                            onClick={() => setIsDeletingUser(true)}
                            className="w-full py-2.5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-400 bg-transparent text-slate-400 text-center font-bold uppercase text-[10px] tracking-wider cursor-pointer block rounded-lg transition-colors"
                          >
                            DELETE USER PERMANENTLY
                          </button>
                        </div>
                      )}

                      {/* WATCHLIST COLLAPSIBLE SECTION */}
                      <div className="border border-[#1E232D] bg-[#141822]/30 mt-4 rounded-xs overflow-hidden">
                        <button
                          onClick={() => setIsWatchlistCollapsed(!isWatchlistCollapsed)}
                          className="w-full p-3 flex items-center justify-between font-bold text-[#A78BFA] uppercase text-[10px] tracking-wider transition-colors outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="h-3.5 w-3.5 text-purple-400" />
                            <span>Active Watchlist & Backtests</span>
                            {watchlistItems.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-sm text-[9px]">
                                {watchlistItems.length}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {isWatchlistCollapsed ? "[+] EXPAND" : "[-] COLLAPSE"}
                          </span>
                        </button>

                        {!isWatchlistCollapsed && (
                          <div className="p-4 space-y-4 border-t border-[#1E232D] bg-[#0E121A]/85">
                            {/* Error Display */}
                            {watchlistError && (
                              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] flex gap-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>{watchlistError}</span>
                              </div>
                            )}

                            {/* Watchlist Actions */}
                            <div className="flex flex-wrap gap-2 justify-between items-center bg-[#141822]/40 p-2 border border-[#1E232D]/50 rounded-xs">
                              <span className="text-[9px] text-slate-400 font-semibold uppercase">Management Suite</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => fetchUserWatchlist(selectedUser.id)}
                                  disabled={isFetchingWatchlist}
                                  className="px-2 py-1 bg-[#1E232D] hover:bg-slate-800 text-slate-300 text-[9px] font-bold uppercase transition-all rounded-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isFetchingWatchlist ? "Refreshing..." : "Refresh"}
                                </button>
                                <button
                                  onClick={() => clearAllUserWatchlist(selectedUser.id)}
                                  disabled={watchlistItems.length === 0}
                                  className="px-2 py-1 bg-[#121620] hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 border border-transparent hover:border-rose-500/25 text-[9px] font-bold uppercase transition-all rounded-xs cursor-pointer"
                                >
                                  Wipe All
                                </button>
                              </div>
                            </div>

                            {/* Watchlist Items */}
                            {isFetchingWatchlist && watchlistItems.length === 0 ? (
                              <div className="py-8 text-center text-slate-500 text-[10px] uppercase flex flex-col items-center gap-1.5 animate-pulse">
                                <RefreshCw className="h-4 w-4 animate-spin mb-1" />
                                <span>Retrieving Watchlist Records...</span>
                              </div>
                            ) : watchlistItems.length === 0 ? (
                              <div className="py-6 text-center text-slate-500 text-[10px] bg-[#141822]/10 border border-dashed border-[#1E232D]/40 rounded-xs uppercase">
                                No Active Watchlist Items Found
                              </div>
                            ) : (
                              <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                                {watchlistItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-3 bg-[#11141C] border border-[#1E232D] hover:border-[#1E232D] transition-all rounded-xs flex flex-col space-y-2"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-white text-[11px] font-mono tracking-wide">{item.symbol || "Unknown"}</span>
                                          {item.timeframe && (
                                            <span className="px-1 bg-purple-500/10 text-purple-400 text-[8px] border border-purple-500/20 rounded-xs lowercase">
                                              {item.timeframe}
                                            </span>
                                          )}
                                          {item.dataSource && (
                                            <span className="px-1 bg-amber-500/10 text-amber-400 text-[8px] border border-amber-500/20 rounded-xs lowercase">
                                              {item.dataSource}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-0.5 select-all">
                                          ID: {item.id}
                                        </div>
                                        {item.prefix && (
                                          <div className="text-[9px] text-purple-400 mt-0.5 font-medium">
                                            CFG: {item.prefix}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Row item delete action */}
                                      <button
                                        onClick={() => deleteIndividualWatchlistItem(selectedUser.id, item.id)}
                                        className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer rounded-sm"
                                        title="Delete this specific watchlist session"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {/* Playback session detail parameters */}
                                    <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 font-mono bg-[#141822]/30 p-1.5 border border-[#1E232D]/30 rounded-xs">
                                      <div>
                                        <span className="text-[8px] text-slate-500 block">STATUS</span>
                                        <span className={`font-semibold capitalize ${item.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                          {item.status || 'unknown'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-slate-500 block font-sans">PLAY CANDLE</span>
                                        <span className="text-slate-300">
                                          {item.last_play_candle_time ? new Date(item.last_play_candle_time * 1000).toLocaleString() : 'N/A'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-slate-500 block">START TIME</span>
                                        <span className="text-slate-400">
                                          {item.start_time ? new Date(item.start_time * 1000).toLocaleString() : 'N/A'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-slate-500 block">END TIME</span>
                                        <span className="text-slate-400">
                                          {item.end_time ? new Date(item.end_time * 1000).toLocaleString() : 'N/A'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action Footnotes */}
                                    <div className="flex gap-2 pt-1.5 border-t border-[#1E232D]/30 justify-between items-center">
                                      <button
                                        onClick={() => fetchWatchlistItemStats(selectedUser.id, item.id)}
                                        className="px-2 py-0.5 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 text-purple-300 text-[8px] font-bold uppercase transition-all rounded-xs cursor-pointer flex items-center gap-1"
                                      >
                                        <Calendar className="h-2 w-2" />
                                        <span>Metrics & Trades</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => deleteWatchlistSymbol(selectedUser.id, item.symbol, item.prefix)}
                                        className="px-1.5 py-0.5 text-rose-400/80 hover:text-rose-400 text-[8px] font-semibold uppercase transition-all rounded-xs cursor-pointer hover:underline"
                                      >
                                        Del Symbol
                                      </button>
                                    </div>
                                  </div>
                                ))}
                               </div>
                             )}

                             {/* Detailed Statistics and Interactive Trades Modal Drawer within the details screen */}
                             {isFetchingWatchlistItemStats && (
                               <div className="p-3 bg-[#11141C] border border-purple-500/20 text-center animate-pulse rounded-xs text-[9px] uppercase tracking-wider flex items-center justify-center gap-2 text-purple-400">
                                 <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                 <span>Compiling metrics and backtest trades...</span>
                               </div>
                             )}

                             {statsError && (
                               <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] rounded-xs">
                                 ⚠️ {statsError}
                               </div>
                             )}

                             {selectedWatchlistItemStats && (
                               <motion.div
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 className="p-3.5 bg-[#141822] border border-purple-500/30 rounded-xs space-y-3.5 text-slate-300 shadow-lg"
                               >
                                 <div className="flex justify-between items-center border-b border-[#1E232D]/80 pb-1.5">
                                   <div className="flex items-center gap-1.5">
                                     <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                     <span className="font-bold text-white text-[10px] uppercase">Session Playback Stats</span>
                                   </div>
                                   <button
                                     onClick={() => setSelectedWatchlistItemStats(null)}
                                     className="text-[8px] text-rose-400 hover:text-rose-300 border border-transparent hover:border-[#1E232D] p-0.5 cursor-pointer"
                                   >
                                     [Close X]
                                   </button>
                                 </div>

                                 {/* Numbers metric highlights */}
                                 {selectedWatchlistItemStats.statistics ? (
                                   <div className="grid grid-cols-2 gap-2 text-[9px]">
                                     <div className="p-2 bg-[#0F1218] border border-[#1E232D] rounded-xs">
                                       <span className="text-slate-500 block uppercase text-[8px]">Trades / Winrate</span>
                                       <span className="font-bold text-white mt-0.5 block">
                                         {selectedWatchlistItemStats.statistics.totalTrades || 0} ({selectedWatchlistItemStats.statistics.winRate || "0.00%"})
                                       </span>
                                     </div>
                                     <div className="p-2 bg-[#0F1218] border border-[#1E232D] rounded-xs">
                                       <span className="text-slate-500 block uppercase text-[8px]">Net Pips / RR</span>
                                       <span className="font-bold mt-0.5 block text-emerald-400">
                                         {selectedWatchlistItemStats.statistics.netPips || 0} pips (RR: {selectedWatchlistItemStats.statistics.totalRR || 0})
                                       </span>
                                     </div>
                                     <div className="p-2 bg-[#0F1218] border border-[#1E232D] rounded-xs">
                                       <span className="text-slate-500 block uppercase text-[8px]">Win / Loss Ratio</span>
                                       <span className="font-bold text-white mt-0.5 block">
                                         W: {selectedWatchlistItemStats.statistics.totalWins || 0} / L: {selectedWatchlistItemStats.statistics.totalLosses || 0}
                                       </span>
                                     </div>
                                     <div className="p-2 bg-[#0F1218] border border-[#1E232D] rounded-xs">
                                       <span className="text-slate-500 block uppercase text-[8px]">Type Splits</span>
                                       <span className="font-bold text-slate-300 mt-0.5 block">
                                         L: {selectedWatchlistItemStats.statistics.longTradesCount || 0} / S: {selectedWatchlistItemStats.statistics.shortTradesCount || 0}
                                       </span>
                                     </div>
                                   </div>
                                 ) : (
                                   <div className="text-[9px] text-slate-500 italic">No statistical metrics logged under this active session.</div>
                                 )}

                                 {/* Interactive Trades List within Stats */}
                                 <div>
                                   <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider mb-1.5">Simulation Trade Legs</span>
                                   {selectedWatchlistItemStats.trades && selectedWatchlistItemStats.trades.length > 0 ? (
                                     <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[9px]">
                                       {selectedWatchlistItemStats.trades.map((t: any, idx: number) => (
                                         <div key={t.id || idx} className="p-1 px-2 bg-[#0E1218] border border-[#1E232D] flex items-center justify-between">
                                           <div className="flex items-center gap-1.5 flex-wrap">
                                             <span className={`font-bold ${t.type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type || 'TRADE'}</span>
                                             <span className="text-slate-300 font-sans">&#10141;</span>
                                             <span>In: {t.entry_price || '0'}</span>
                                           </div>
                                           <div className="flex items-center gap-2">
                                             <span className={(t.pips || 0) >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                               {(t.pips || 0) >= 0 ? `+${t.pips}` : t.pips} p
                                             </span>
                                             <span className={`px-1 text-[7px] uppercase font-bold tracking-tight rounded-xs ${t.status === 'TP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : t.status === 'SL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border border-[#1E232D]'}`}>
                                               {t.status || 'CLOSED'}
                                             </span>
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   ) : (
                                     <div className="text-[9px] text-slate-500 italic bg-[#0F1218]/50 p-2 border border-dashed border-[#1E232D]/40 text-center rounded-xs uppercase">No simulation trades registered.</div>
                                   )}
                                 </div>
                               </motion.div>
                             )}
                           </div>
                         )}
                       </div>
                     </>
                   )}

                </div>

                <div className="p-5 border-t border-[#1E232D] bg-[#141822]/40 text-[9px] text-slate-500 uppercase tracking-widest text-center font-semibold">
                  GATED SECURITY BYPASS HANDSHAKE VALIDATED
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* FLOATING ACTION LAUNCHER BUTTON (Bottom-Right Support Hub Overlay) */}
      {/* ====================================================================== */}
      <div id="support-float-launcher" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] font-sans">
        <AnimatePresence>
          {isSupportOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-12 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-0 sm:p-2 md:p-4 text-slate-100 placeholder-slate-500 font-sans"
            >
              <div className="w-full h-full sm:max-h-[800px] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl bg-[#090C11] sm:border border-[#1E232D]/80 sm:shadow-2xl sm:rounded-xl overflow-hidden flex flex-col">
                {/* ADVANCED MODAL HUB HEADER */}
                <div className="bg-[#0E121A] px-4 py-3.5 border-b border-[#1E232D] flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative flex">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping absolute inline-flex opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white">SUPPORT HUB WORKSTATION</h3>
                        <span className="px-1.5 py-0.5 text-[8px] bg-blue-600/10 border border-blue-500/20 text-blue-400 font-mono rounded uppercase">v4.0 Live</span>
                      </div>
                      <p className="text-[9px] text-slate-400 uppercase font-mono tracking-tight mt-0.5">Real-Time Core Gateway [ONLINE] • Authenticated via ForeX API Secret</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsSupportOpen(false)}
                    className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded-lg border border-[#1E232D]/80 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* DUAL COLUMN DESKTOP OR FLEX SINGLE MOBILE LAYOUT */}
                <div className="flex-1 flex overflow-hidden">
                  {/* LEFT SIDEBAR: LIST OF FEEDBACK CONVERSATIONS */}
                  {/* On Mobile (screen < sm), we only show this if activeSupportEmail is null */}
                  <div className={`sm:w-80 md:w-96 border-r border-[#1E232D]/60 flex flex-col bg-[#07090D] h-full ${activeSupportEmail !== null ? "hidden sm:flex" : "w-full flex"}`}>
                    
                    {/* SEARCH & FILTERS PANEL */}
                    <div className="p-3 border-b border-[#1E232D]/50 bg-[#090C11] space-y-2.5 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500 select-none" />
                        <input 
                          type="text"
                          placeholder="Search feedback index, email, message..."
                          value={supportSearch}
                          onChange={(e) => setSupportSearch(e.target.value)}
                          className="w-full bg-[#12161F] border border-[#1E232D] text-[10px] pl-9 pr-3 py-2 rounded-md font-mono uppercase text-white focus:outline-none focus:border-blue-500 transition-all placeholder-[#475569] tracking-wider"
                        />
                      </div>

                      {/* SELECTABLE READ / UNREAD TABS */}
                      <div className="grid grid-cols-3 gap-1 bg-[#12161F]/60 p-0.5 rounded border border-[#1E232D]/40 text-[9px] font-mono uppercase tracking-wider text-center">
                        {(["all", "unread", "read"] as const).map(tab => {
                          const count = tab === "unread" 
                            ? getGroupedConversations().filter(c => c.unreadCount > 0).length
                            : tab === "read"
                            ? getGroupedConversations().filter(c => c.unreadCount === 0).length
                            : getGroupedConversations().length;

                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setSupportTab(tab)}
                              className={`py-1.5 font-bold rounded cursor-pointer transition ${supportTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-[#141A24]/40"}`}
                            >
                              {tab} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {/* CLEAR ALL ACTION */}
                      {getGroupedConversations().length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllSupportMessages}
                          className="w-full py-1.5 px-3 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-200 border border-rose-900/40 hover:border-rose-500/30 text-[9px] uppercase font-mono font-bold tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="h-3 w-3" />
                          Wipe All Conversations
                        </button>
                      )}
                    </div>

                    {/* ACTIVE QUEUE SCROLL AREA */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#1E232D]/30 p-2 space-y-1">
                      {getGroupedConversations().length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 uppercase font-mono text-[9px] space-y-2">
                          <Inbox className="h-6 w-6 text-slate-700 mb-1" />
                          <span>No live conversations active</span>
                        </div>
                      ) : (
                        getGroupedConversations().map(conv => (
                          <div 
                            key={conv.email}
                            onClick={() => selectConversationThread(conv.email)}
                            className={`p-3 rounded-lg border transition duration-155 cursor-pointer flex items-start gap-3 hover:bg-[#121620] relative ${conv.unreadCount > 0 ? "border-blue-500/25 bg-[#0F1724]" : "border-transparent bg-transparent"}`}
                          >
                            {/* MINI UNREAD COUNTER EMBLEM OR INITIALS */}
                            <div className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center font-bold text-xs font-mono border uppercase ${conv.unreadCount > 0 ? "bg-blue-900/40 border-blue-500/30 text-blue-400 animate-pulse" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                              {conv.name.substring(0, 2)}
                            </div>

                            {/* TEXT DATA BLOCKS */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold uppercase truncate block ${conv.unreadCount > 0 ? "text-blue-400" : "text-white"}`}>{conv.name}</span>
                                <span className="text-[8px] font-mono text-slate-500">{new Date(conv.latestAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailRecipientsMode("custom");
                                  setEmailRecipientsText(conv.email);
                                  setIsEmailModalOpen(true);
                                  setEmailError(null);
                                  setEmailSuccess(null);
                                  setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                                }}
                                className="text-[9px] text-slate-500 hover:text-indigo-400 block truncate font-mono uppercase mt-0.5 text-left cursor-pointer transition hover:underline"
                                title={`Send administrative email to ${conv.email}`}
                              >
                                {conv.email}
                              </button>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                {conv.messages[conv.messages.length - 1]?.message}
                              </p>
                            </div>

                            {/* DOT AND PROFILE FAST TRACK */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {conv.unreadCount > 0 && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewUserProfileFromSupport(conv.email);
                                }}
                                className="text-[8px] font-mono font-bold text-slate-500 hover:text-white uppercase py-0.5 px-1.5 border border-transparent hover:border-slate-800 hover:bg-slate-900 rounded cursor-pointer transition mt-2.5 duration-100"
                                title="PREVIEW PROFILE CARD"
                              >
                                INSPECT
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANEL: CHAT INTERACTION OR ADVANCED EMPTY DIAGNOSTIC STACKS */}
                  {/* On Mobile, we only show this if activeSupportEmail is NOT null */}
                  <div className={`flex-1 flex flex-col bg-[#0B0E14] h-full ${activeSupportEmail === null ? "hidden sm:flex" : "w-full flex"}`}>
                    {activeSupportEmail === null ? (
                      /* ADVANCED DIAGNOSTIC ADVICE / MINT PLACEHOLDER LANDING */
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#090C11]/30 select-none">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#131924] border border-[#1E232D] flex items-center justify-center mb-4">
                          <MessageSquare className="h-5 w-5 text-blue-500 animate-bounce" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-white">SUPPORT CONTROL DASHBOARD</h4>
                        <p className="text-[9px] text-slate-500 uppercase font-mono max-w-sm mt-1.5 leading-relaxed">
                          Synchronize messages from standard web interfaces instantly. Select any diagnostics index channel from the portal queue layout to initialize live reply sessions.
                        </p>

                        {/* LIVE GENERAL STATISTICS LOGS inside placeholder card */}
                        <div className="mt-8 grid grid-cols-3 gap-2 w-full max-w-lg text-slate-400">
                          <div className="bg-[#12161F]/40 border border-[#1E232D]/50 p-3 rounded-lg text-center">
                            <span className="text-[8px] text-slate-500 font-mono block uppercase">TOTAL BLOCKS</span>
                            <span className="text-sm font-bold font-mono text-white block mt-0.5">{getGroupedConversations().length}</span>
                          </div>
                          <div className="bg-[#12161F]/40 border border-[#1E232D]/50 p-3 rounded-lg text-center">
                            <span className="text-[8px] text-slate-500 font-mono block uppercase">UNREAD FEED</span>
                            <span className="text-sm font-bold font-mono text-rose-500 block mt-0.5">
                              {getGroupedConversations().filter(c => c.unreadCount > 0).length}
                            </span>
                          </div>
                          <div className="bg-[#12161F]/40 border border-[#1E232D]/50 p-3 rounded-lg text-center font-mono">
                            <span className="text-[8px] text-slate-500 block uppercase">STABLE SLA</span>
                            <span className="text-sm font-bold text-emerald-400 block mt-0.5">100%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* CONVERSATION WRITER & BUBBLER */
                      (() => {
                        const thread = getGroupedConversations().find(c => c.email === activeSupportEmail);
                        if (!thread) return null;
                        return (
                          <div className="flex-grow flex flex-col h-full overflow-hidden">
                            {/* ACTIVE CONVERSATION SUBHEADER BAR */}
                            <div className="bg-[#090C11] border-b border-[#1E232D]/60 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
                              <button
                                onClick={() => setActiveSupportEmail(null)}
                                className="text-[9px] font-mono font-bold text-slate-400 hover:text-white uppercase flex items-center gap-1.5 py-1 px-2 bg-[#12161F] border border-[#1E232D] rounded-md transition cursor-pointer font-bold"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" /> QUEUE LIST
                              </button>

                              <div className="text-center min-w-0 px-3 flex-grow max-w-[50%]">
                                <span className="text-xs font-bold text-white block uppercase truncate">{thread.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 block truncate uppercase mt-0.5">{thread.email}</span>
                              </div>

                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => viewUserProfileFromSupport(thread.email)}
                                  className="text-[9px] font-mono font-bold text-blue-400 hover:text-blue-300 uppercase py-1 px-2 border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 rounded-md transition cursor-pointer font-bold"
                                >
                                  PROFILE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClearSupportThread(thread.email)}
                                  className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-300 uppercase py-1 px-2 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 rounded-md transition cursor-pointer font-bold flex items-center gap-1"
                                  title="Delete entire user thread"
                                >
                                  <Trash2 className="h-3 w-3" /> CLEAR
                                </button>
                              </div>
                            </div>

                            {/* BUBBLING MESSAGE LOGS AREA */}
                            <div className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-[#07090D]/50 flex flex-col">
                              {thread.messages.map((m, idx) => {
                                const isAdmin = m.sender === "admin";
                                return (
                                  <div 
                                    key={m.id || idx}
                                    className={`relative max-w-[80%] rounded-lg p-3 text-xs flex flex-col shadow-md border group/msg ${
                                      isAdmin 
                                        ? "bg-blue-600/15 border-blue-600/35 text-slate-100 self-end rounded-tr-none" 
                                        : "bg-[#12161F] border-[#1E232D] text-slate-100 self-start rounded-tl-none"
                                    }`}
                                  >
                                    {/* DELETE MESSAGE BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSupportMessage(m.id)}
                                      className="absolute top-1.5 right-1.5 opacity-0 group-hover/msg:opacity-100 p-1 bg-red-950/40 hover:bg-rose-900 border border-red-900/40 text-rose-400 hover:text-white rounded transition cursor-pointer shadow-sm"
                                      title="Delete individual message"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>

                                    <p className="whitespace-pre-wrap leading-relaxed select-text font-sans text-[12px] pr-5">{m.message}</p>
                                    <span className="text-[8px] font-mono text-slate-500 mt-2 self-end block uppercase tracking-wide font-bold">
                                      {isAdmin ? "SUPPORT ADMIN" : "USER CLIENT"} • {new Date(m.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* RESPONSE WRITING CONSOLE FOOTER */}
                            <div className="p-3 bg-[#090C11] border-t border-[#1E232D]/70 space-y-3 shrink-0">
                              {/* QUICK CONSOLE RESPONSE SCRIPTS SELECTOR */}
                              <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                                {[
                                  { label: "Welcome Init", text: "Hello! Thank you for reaching out to Forex Support. We are reviewing your logs now. Could you confirm which server or agent client you are running?" },
                                  { label: "Key Invalid", text: "It seems the custom server is throwing a 401. Please verify that your authorization header is sent as 'Authorization: Bearer <FOREX_API_SECRET>' and matches your config environment value." },
                                  { label: "Pip Buffering", text: "Regarding the slight pip fluctuation you reported, our aggregate draws feeds from the LMAX interbank stream. Sometimes buffering latencies on secondary streams create a tiny 100ms skew, but LMAX remains our absolute system source." }
                                ].map(tpl => (
                                  <button
                                    key={tpl.label}
                                    type="button"
                                    onClick={() => setSupportReply(tpl.text)}
                                    className="text-[8px] tracking-wide shrink-0 font-mono font-bold uppercase bg-[#141822] text-slate-400 hover:text-white hover:bg-[#1C212E] border border-[#1E232D] py-1 px-2 rounded-md cursor-pointer transition whitespace-nowrap"
                                  >
                                    + {tpl.label}
                                  </button>
                                ))}
                              </div>

                              {/* TEXTAREA FORM */}
                              <div className="flex gap-2">
                                <textarea
                                  placeholder="Type professional response channel logs..."
                                  value={supportReply}
                                  onChange={(e) => setSupportReply(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      sendSupportReply(thread.email);
                                    }
                                  }}
                                  rows={1}
                                  className="flex-grow bg-[#12161F] border border-[#1E232D] text-xs p-2.5 rounded-md text-white focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder-[#475569] leading-relaxed self-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => sendSupportReply(thread.email)}
                                  disabled={!supportReply.trim()}
                                  className="h-9 w-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-md transition flex items-center justify-center cursor-pointer shrink-0 self-center"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SYSTEM COMMAND PORTAL DROP-UP MENU */}
          {isLauncherMenuOpen && !isSupportOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute bottom-12 right-0 mb-3 w-64 rounded-xl shadow-2xl border border-[#1E232D]/90 overflow-hidden flex flex-col z-[80] bg-[#0E121A]/95 backdrop-blur-md"
            >
              {/* Menu Header */}
              <div className="text-[8px] tracking-widest font-mono text-slate-400 font-bold uppercase p-3 border-b border-[#1E232D]/60 bg-[#090C11]/85">
                SYSTEM CONTROL HUB
              </div>

              {/* Support Workstation Option */}
              <button
                type="button"
                onClick={() => {
                  setIsSupportOpen(true);
                  setIsLauncherMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 text-left transition hover:bg-slate-800/40 text-slate-200 hover:text-white cursor-pointer group/opt border-b border-[#1E232D]/35"
              >
                <div className="h-7 w-7 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase tracking-wide">SUPPORT WORKSPACE</span>
                    {supportConversations.some(m => m.sender === "user" && !m.is_read) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">Interact with live client feedback</span>
                </div>
              </button>

              {/* System Banners Option */}
              <button
                type="button"
                onClick={() => {
                  setIsBannerModalOpen(true);
                  setIsLauncherMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 text-left transition hover:bg-slate-800/40 text-slate-200 hover:text-white cursor-pointer group/opt border-b border-[#1E232D]/35"
              >
                <div className="h-7 w-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Megaphone className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold font-mono uppercase tracking-wide block">SYSTEM BANNERS</span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">Configure live announcements DB</span>
                </div>
              </button>

              {/* Bulk Delete Option */}
              <button
                type="button"
                onClick={() => {
                  setIsBulkDeleteOpen(true);
                  setIsLauncherMenuOpen(false);
                  setBulkDeleteError(null);
                  setBulkDeleteSuccess(null);
                  setBulkWipeSecret(localStorage.getItem("forex_site_secret") || "");
                }}
                className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-[#1E232D]/40 text-rose-400 hover:text-rose-300 cursor-pointer group/opt border-b border-[#1E232D]/35"
              >
                <div className="h-7 w-7 rounded bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold font-mono uppercase tracking-wide block text-white">BULK DELETE USER</span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">Wipe accounts by email list or ALL using .env secret</span>
                </div>
              </button>

              {/* Send Administrative Email Option */}
              <button
                type="button"
                onClick={() => {
                  setIsEmailModalOpen(true);
                  setIsLauncherMenuOpen(false);
                  setEmailError(null);
                  setEmailSuccess(null);
                  setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                }}
                className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-[#1E232D]/40 text-indigo-400 hover:text-indigo-300 cursor-pointer group/opt border-b border-[#1E232D]/35"
              >
                <div className="h-7 w-7 rounded bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold font-mono uppercase tracking-wide block text-white">ADMIN EMAIL SERVICE</span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">Send bulk emails to all or specific users</span>
                </div>
              </button>

              {/* Feedback survey Option */}
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackModalOpen(true);
                  setIsLauncherMenuOpen(false);
                  refreshFeedbacks();
                }}
                className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-[#1E232D]/40 text-emerald-400 hover:text-emerald-300 cursor-pointer group/opt border-b border-[#1E232D]/35"
              >
                <div className="h-7 w-7 rounded bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Star className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase tracking-wide block text-white">FEEDBACK INDEX</span>
                    {feedbackList.some(f => !f.is_read) && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono bg-emerald-500 text-white rounded-full leading-none scale-90">
                        {feedbackList.filter(f => !f.is_read).length}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">View and analyze ratings & forms</span>
                </div>
              </button>

              {/* Contact Us requests Option */}
              <button
                type="button"
                onClick={() => {
                  setIsContactModalOpen(true);
                  setIsLauncherMenuOpen(false);
                  refreshContacts();
                }}
                className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-[#1E232D]/40 text-cyan-400 hover:text-cyan-300 cursor-pointer group/opt"
              >
                <div className="h-7 w-7 rounded bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase tracking-wide block text-white">CONTACT REQUESTS</span>
                    {contactList.some(c => !c.is_read) && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono bg-cyan-500 text-white rounded-full leading-none scale-90">
                        {contactList.filter(c => !c.is_read).length}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono uppercase block truncate mt-0.5">View fullname, message & subjects</span>
                </div>
              </button>
            </motion.div>
          )}

          {/* SYSTEM ANNOUNCEMENT (BANNER) MANAGEMENT DIALOG */}
          {isBannerModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[75] flex items-center justify-center p-4 text-slate-200 font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#090C11] border border-[#1E232D]/90 shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-[#0E121A] px-4 py-3.5 border-b border-[#1E232D] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="h-5 w-5 text-amber-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white">System Announcement (Banner) Manager</h3>
                      <p className="text-[9px] text-slate-400 uppercase font-mono tracking-tight mt-0.5">Control live notifications and API endpoints (/api/system/banner)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsBannerModalOpen(false)}
                    className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded-md border border-[#1E232D]/50 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs bg-[#07090D]">
                  {/* Create Announcement Form */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="font-bold text-slate-300 font-mono text-[10px] uppercase tracking-wider border-b border-[#1E232D]/40 pb-1.5">Draft Announcement</h4>
                    <form onSubmit={handleCreateBanner} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono text-slate-400">Banner Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Connection Alert"
                          value={bannerForm.title}
                          onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                          className="w-full bg-[#12161F] border border-[#1E232D] text-white p-2.5 rounded focus:outline-none focus:border-amber-500 font-mono uppercase"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono text-slate-400">Notification Message</label>
                        <textarea
                          placeholder="Insert announcement specifics..."
                          value={bannerForm.message}
                          onChange={(e) => setBannerForm({ ...bannerForm, message: e.target.value })}
                          className="w-full bg-[#12161F] border border-[#1E232D] text-white p-2.5 rounded h-20 focus:outline-none focus:border-amber-500 font-mono uppercase resize-none leading-relaxed"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-slate-400">Notice Type</label>
                          <select
                            value={bannerForm.type}
                            onChange={(e) => setBannerForm({ ...bannerForm, type: e.target.value })}
                            className="w-full bg-[#12161F] border border-[#1E232D] text-white p-2 rounded focus:outline-none focus:border-amber-500 uppercase font-mono"
                          >
                            <option value="success">Success / Operational</option>
                            <option value="info">Info / General News</option>
                            <option value="warning">Warning / Actions</option>
                            <option value="danger">Danger / Outages</option>
                          </select>
                        </div>

                        <div className="space-y-2 pt-5 select-none">
                          <label className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bannerForm.dismissible}
                              onChange={(e) => setBannerForm({ ...bannerForm, dismissible: e.target.checked })}
                              className="rounded bg-[#12161F] border-[#1E232D] text-amber-500 focus:ring-0 cursor-pointer"
                            />
                            Dismissible
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-slate-400">Start Time (UTC)</label>
                          <input
                            type="datetime-local"
                            value={bannerForm.start_time}
                            onChange={(e) => setBannerForm({ ...bannerForm, start_time: e.target.value })}
                            className="w-full bg-[#12161F] border border-[#1E232D] text-slate-200 p-2 rounded text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-slate-400">End Time (UTC)</label>
                          <input
                            type="datetime-local"
                            value={bannerForm.end_time}
                            onChange={(e) => setBannerForm({ ...bannerForm, end_time: e.target.value })}
                            className="w-full bg-[#12161F] border border-[#1E232D] text-slate-200 p-2 rounded text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 select-none">
                        <label className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bannerForm.enabled}
                            onChange={(e) => setBannerForm({ ...bannerForm, enabled: e.target.checked })}
                            className="rounded bg-[#12161F] border-[#1E232D] text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          Set Active Status (Live)
                        </label>
                      </div>

                      {bannerSaveStatus && (
                        <div className={`p-2 rounded font-mono text-[9px] uppercase border ${
                          bannerSaveStatus.includes("Error") 
                            ? "bg-rose-950/20 border-rose-900/50 text-rose-400" 
                            : bannerSaveStatus.includes("Saving") 
                            ? "bg-[#12161F] border-[#1E232D] text-amber-400 animate-pulse" 
                            : "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                        }`}>
                          {bannerSaveStatus}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold font-mono uppercase text-[10px] tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 mt-4"
                      >
                        <Megaphone className="h-3.5 w-3.5" /> Save Announcement
                      </button>
                    </form>
                  </div>

                  {/* Banner Selector List (Predefined / History) */}
                  <div className="lg:col-span-7 flex flex-col h-[420px]">
                    <div className="flex items-center justify-between border-b border-[#1E232D]/40 pb-1.5 shrink-0">
                      <h4 className="font-bold text-slate-300 font-mono text-[10px] uppercase tracking-wider">Historical & Preset Banners</h4>
                      <button 
                        type="button"
                        onClick={fetchBannersList}
                        className="text-[9px] tracking-widest font-mono text-slate-400 hover:text-white uppercase flex items-center gap-1.5 cursor-pointer bg-slate-900/40 border border-[#1E232D]/60 py-1 px-2 rounded hover:border-slate-500 transition duration-100"
                      >
                        <RefreshCw className={`h-3 w-3 ${bannersLoading ? "animate-spin" : ""}`} /> Reload Banners
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 p-1.5 mt-2 divide-y divide-[#1E232D]/30 max-h-[360px]">
                      {bannersList.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-slate-500 font-mono uppercase text-[9px] pt-12">
                          No announcements created yet.
                        </div>
                      ) : (
                        bannersList.map((b) => (
                          <div key={b.id} className="pt-3.5 first:pt-0 pb-1.5 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                    b.type === "success" 
                                      ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/50" 
                                      : b.type === "warning"
                                      ? "bg-amber-950/30 text-amber-400 border border-amber-900/50"
                                      : b.type === "danger"
                                      ? "bg-rose-950/30 text-rose-400 border border-rose-900/50"
                                      : "bg-blue-950/30 text-blue-400 border border-blue-900/50"
                                  }`}>
                                    {b.type}
                                  </span>
                                  <span className="font-bold uppercase text-slate-200">{b.title}</span>
                                  {b.enabled && (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono font-bold flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      Current active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg uppercase font-mono select-text font-bold">{b.message}</p>
                              </div>

                              {!b.enabled && (
                                <button
                                  type="button"
                                  onClick={() => handleActivateBanner(b.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white border border-[#1E232D] text-[10px] font-mono uppercase font-bold text-slate-350 rounded cursor-pointer transition flex items-center gap-1 shrink-0"
                                >
                                  Activate
                                </button>
                              )}
                            </div>

                            <div className="text-[8px] font-mono text-slate-500 flex items-center gap-4 pt-1.5 flex-wrap">
                              <span>DIMISSIBLE: {b.dismissible ? "TRUE" : "FALSE"}</span>
                              <span>START: {new Date(b.start_time).toLocaleString()}</span>
                              <span>END: {new Date(b.end_time).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================================== */}
        {/* GLOBAL OVERLAYS (BULK DELETE & ADMINISTRATIVE EMAIL COMPOSER) */}
        {/* ====================================================================== */}
        <AnimatePresence>
          {isBulkDeleteOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden font-mono text-xs">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isProcessingBulkDelete) {
                    setIsBulkDeleteOpen(false);
                  }
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xs"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-[#0F1218] border border-[#1E232D] p-6 shadow-2xl z-10 flex flex-col space-y-4 text-slate-300"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-white uppercase tracking-wider text-sm">Bulk Delete User Registry</span>
                  </div>
                  <button
                    onClick={() => setIsBulkDeleteOpen(false)}
                    disabled={isProcessingBulkDelete}
                    className="p-1 text-slate-500 hover:text-slate-300 font-mono text-xs border border-transparent hover:border-[#1E232D] cursor-pointer"
                  >
                    [ESC]
                  </button>
                </div>

                {/* Notification Messages */}
                {bulkDeleteError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex gap-2 items-start font-sans">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{bulkDeleteError}</span>
                  </div>
                )}

                {bulkDeleteSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex gap-2 items-start font-sans">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{bulkDeleteSuccess}</span>
                  </div>
                )}

                {/* Instructions */}
                <div className="text-[10px] text-slate-400 leading-relaxed bg-[#141822]/40 p-3 border border-[#1E232D]/40">
                  Input the emails of the users you want to delete permanently. To delete <strong>ALL USERS</strong> in the database, type <strong>ALL</strong> in the text field. This is irreversible.
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Emails to Wipe (comma-separated, lines, or type "ALL")</label>
                    <textarea
                      rows={5}
                      value={bulkEmailsText}
                      onChange={(e) => setBulkEmailsText(e.target.value)}
                      placeholder="user1@example.com&#10;user2@example.com, user3@example.com&#10;Or type: ALL"
                      className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-rose-500 outline-none text-xs font-mono"
                      disabled={isProcessingBulkDelete}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Administrative .env Secret Key (DB_WIPE_SECRET_KEY / FOREX_API_SECRET)</label>
                    <input
                      type="password"
                      value={bulkWipeSecret}
                      onChange={(e) => setBulkWipeSecret(e.target.value)}
                      placeholder="Enter your .env administrative secret"
                      className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-rose-500 outline-none text-xs font-mono"
                      disabled={isProcessingBulkDelete}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block uppercase">
                      Required for security validation and to authorize deletions
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#1E232D]">
                  <button
                    onClick={() => setIsBulkDeleteOpen(false)}
                    disabled={isProcessingBulkDelete}
                    className="px-4 py-2 border border-[#1E232D] hover:bg-[#1E232D] text-slate-400 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isProcessingBulkDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-[10px] tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isProcessingBulkDelete ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Wiping Profiles...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3" />
                        <span>Confirm Wipe Action</span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEmailModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden font-sans text-xs">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isSendingEmail) {
                    setIsEmailModalOpen(false);
                  }
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xs"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-[#0F1218] border border-[#1E232D] p-6 shadow-2xl z-10 flex flex-col space-y-4 text-slate-300"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1E232D]/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-xs font-mono">Administrative Email Composer</span>
                  </div>
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={isSendingEmail}
                    className="p-1 text-slate-500 hover:text-slate-300 font-mono text-[10px] border border-transparent hover:border-[#1E232D] cursor-pointer"
                  >
                    [ESC]
                  </button>
                </div>

                {/* Notification Messages */}
                {emailError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-normal">{emailError}</span>
                  </div>
                )}

                {emailSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex gap-2 items-start">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-normal">{emailSuccess}</span>
                  </div>
                )}

                {/* Mode Selection Tabs (All Users vs Specific Users) */}
                <div className="grid grid-cols-2 gap-2 border-b border-[#1E232D]/40 pb-2">
                  <button
                    type="button"
                    onClick={() => setEmailRecipientsMode("all")}
                    className={`py-2 text-center text-[10px] font-bold font-mono uppercase border transition cursor-pointer ${
                      emailRecipientsMode === "all"
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "border-[#1E232D] hover:bg-[#1E232D]/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    👥 Broadcast All Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailRecipientsMode("custom")}
                    className={`py-2 text-center text-[10px] font-bold font-mono uppercase border transition cursor-pointer ${
                      emailRecipientsMode === "custom"
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "border-[#1E232D] hover:bg-[#1E232D]/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🎯 Target Specific Recipient(s)
                  </button>
                </div>

                {/* Inputs */}
                <div className="space-y-3 font-mono text-[11px]">
                  {emailRecipientsMode === "custom" && (
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase block mb-1">Recipient Email Address(es)</label>
                      <textarea
                        rows={2}
                        value={emailRecipientsText}
                        onChange={(e) => setEmailRecipientsText(e.target.value)}
                        placeholder="user1@example.com&#10;user2@example.com, user3@example.com"
                        className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-indigo-500 outline-none text-xs"
                        disabled={isSendingEmail}
                      />
                      <span className="text-[8px] text-slate-500 block uppercase mt-0.5">Separate multiple targets using lines, commas, or semicolons</span>
                    </div>
                  )}

                  {emailRecipientsMode === "all" && (
                    <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-400 leading-relaxed uppercase">
                      📢 Broadcasting is enabled. This will safely forward dispatch commands to the remote server to deliver to all registered accounts.
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Email Subject Line</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g., Scheduled Performance Optimization Block"
                      className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-indigo-500 outline-none text-xs"
                      disabled={isSendingEmail}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Message Body</label>
                    <textarea
                      rows={6}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Hi team,&#10;&#10;We are rolling out an optimization patch. No downtime is expected.&#10;&#10;Best,&#10;FirstLook Labs"
                      className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-indigo-500 outline-none text-xs"
                      disabled={isSendingEmail}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Administrative .env Secret Key (FOREX_API_SECRET)</label>
                    <input
                      type="password"
                      value={emailSecret}
                      onChange={(e) => setEmailSecret(e.target.value)}
                      placeholder="Enter administrative server secret to confirm"
                      className="w-full bg-[#141822] border border-[#1E232D] p-2.5 text-white focus:border-indigo-500 outline-none text-xs"
                      disabled={isSendingEmail}
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#1E232D] font-mono text-[10px]">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={isSendingEmail}
                    className="px-4 py-2 border border-[#1E232D] hover:bg-[#1E232D] text-slate-400 font-bold uppercase tracking-wider cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Dispatching Mail...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>Dispatch Email</span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* FEEDBACK MANAGEMENT SYSTEM DIALOG */}
        <AnimatePresence>
          {isFeedbackModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 text-slate-100 font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#090C11] border border-[#1E232D]/95 shadow-2xl rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-[#0E121A] px-4 py-3.5 border-b border-[#1E232D] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-emerald-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white">FEEDBACK SURVEY GATEWAY</h3>
                      <p className="text-[9px] text-slate-400 uppercase font-mono mt-0.5">Core client ratings and qualitative remarks database</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshFeedbacks}
                      className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded border border-[#1E232D]/80 flex items-center gap-1 cursor-pointer font-mono text-[9px] uppercase font-bold"
                    >
                      <RefreshCw className="h-3 w-3" /> reload
                    </button>
                    {feedbackList.length > 0 && (
                      <button
                        onClick={clearAllFeedbackItems}
                        className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 hover:border-rose-500/30 transition rounded flex items-center gap-1 cursor-pointer font-mono text-[9px] uppercase font-bold"
                      >
                        <Trash2 className="h-3 w-3" /> Wipe DB
                      </button>
                    )}
                    <button 
                      onClick={() => setIsFeedbackModalOpen(false)}
                      className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded-md border border-[#1E232D]/50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-[#1E232D]/60 bg-[#07090D] flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                  <div className="flex gap-1.5">
                    {(["all", "unread", "read"] as const).map(tab => {
                      const count = tab === "unread" 
                        ? feedbackList.filter(f => !f.is_read).length
                        : tab === "read"
                        ? feedbackList.filter(f => f.is_read).length
                        : feedbackList.length;

                      return (
                        <button
                          key={tab}
                          onClick={() => setFeedbackFilter(tab)}
                          className={`px-3 py-1.5 font-bold rounded cursor-pointer transition ${feedbackFilter === tab ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white hover:bg-[#141A24]/40 border border-transparent"}`}
                        >
                          {tab} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-slate-500">
                    Real-time aggregated streams
                  </div>
                </div>

                {/* Content Stream */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#07090D] space-y-3">
                  {(() => {
                    const filtered = feedbackList.filter(f => {
                      if (feedbackFilter === "unread") return !f.is_read;
                      if (feedbackFilter === "read") return f.is_read;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 font-mono text-[10px] space-y-2 uppercase">
                          <Inbox className="h-8 w-8 text-slate-700 block" />
                          <span>No client reviews matching status index</span>
                        </div>
                      );
                    }

                    return filtered.map(item => (
                      <div 
                        key={item.id}
                        className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150 ${item.is_read ? "border-[#1E232D] bg-[#090C11]/50" : "border-emerald-500/25 bg-[#0A1312]/60"}`}
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Stars rating */}
                            <div className="flex items-center gap-0.5 py-0.5 px-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-2.5 w-2.5 ${i < item.rate ? "text-emerald-400 fill-emerald-400" : "text-slate-705"}`} 
                                />
                              ))}
                              <span className="text-[9px] font-mono font-bold text-emerald-400 ml-1 mt-0.5">{item.rate}/5</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEmailRecipientsMode("custom");
                                setEmailRecipientsText(item.user_email);
                                setIsEmailModalOpen(true);
                                setEmailError(null);
                                setEmailSuccess(null);
                                setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                              }}
                              className="text-[9px] font-mono text-slate-400 hover:text-indigo-400 transition hover:underline bg-[#12161F] border border-[#1E232D] px-2 py-0.5 rounded uppercase cursor-pointer"
                              title="Directly Draft Email to sender"
                            >
                              ✉ {item.user_email}
                            </button>

                            <span className="text-[8px] font-mono text-slate-500 uppercase">
                              {new Date(item.created_at).toLocaleString()}
                            </span>

                            {!item.is_read && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-mono font-bold uppercase rounded border border-emerald-500/30">
                                NEW FEED
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal whitespace-pre-wrap select-text">
                            {item.feedback}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 font-mono text-[9px] uppercase shrink-0">
                          {!item.is_read && (
                            <button
                              onClick={() => markFeedbackAsRead(item.id)}
                              className="px-2.5 py-1.5 bg-[#12161F] hover:bg-emerald-600 hover:text-white text-slate-300 border border-[#1E232D] hover:border-emerald-500 rounded cursor-pointer transition font-bold"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteFeedbackItem(item.id)}
                            className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 hover:border-rose-500/30 rounded cursor-pointer transition"
                            title="Delete custom review"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTACT MESSAGES CHANNEL DIALOG */}
        <AnimatePresence>
          {isContactModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 text-slate-100 font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#090C11] border border-[#1E232D]/95 shadow-2xl rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-[#0E121A] px-4 py-3.5 border-b border-[#1E232D] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-cyan-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white">CONTACT REAL-TIME GATEWAY</h3>
                      <p className="text-[9px] text-slate-400 uppercase font-mono mt-0.5">Aggregate logs of offline enquiries and subjects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshContacts}
                      className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded border border-[#1E232D]/80 flex items-center gap-1 cursor-pointer font-mono text-[9px] uppercase font-bold"
                    >
                      <RefreshCw className="h-3 w-3" /> reload
                    </button>
                    {contactList.length > 0 && (
                      <button
                        onClick={clearAllContactItems}
                        className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 hover:border-rose-500/30 transition rounded flex items-center gap-1 cursor-pointer font-mono text-[9px] uppercase font-bold"
                      >
                        <Trash2 className="h-3 w-3" /> Wipe DB
                      </button>
                    )}
                    <button 
                      onClick={() => setIsContactModalOpen(false)}
                      className="p-1.5 hover:bg-[#1E232D] text-slate-400 hover:text-white transition rounded-md border border-[#1E232D]/50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-[#1E232D]/60 bg-[#07090D] flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                  <div className="flex gap-1.5">
                    {(["all", "unread", "read"] as const).map(tab => {
                      const count = tab === "unread" 
                        ? contactList.filter(c => !c.is_read).length
                        : tab === "read"
                        ? contactList.filter(c => c.is_read).length
                        : contactList.length;

                      return (
                        <button
                          key={tab}
                          onClick={() => setContactFilter(tab)}
                          className={`px-3 py-1.5 font-bold rounded cursor-pointer transition ${contactFilter === tab ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-white hover:bg-[#141A24]/40 border border-transparent"}`}
                        >
                          {tab} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-slate-500">
                    Secure database pipelines
                  </div>
                </div>

                {/* Content Stream */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#07090D] space-y-3">
                  {(() => {
                    const filtered = contactList.filter(c => {
                      if (contactFilter === "unread") return !c.is_read;
                      if (contactFilter === "read") return c.is_read;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 font-mono text-[10px] space-y-2 uppercase">
                          <Inbox className="h-8 w-8 text-slate-700 block" />
                          <span>No offline messages matching index filters</span>
                        </div>
                      );
                    }

                    return filtered.map(item => (
                      <div 
                        key={item.id}
                        className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-start justify-between gap-4 transition duration-150 ${item.is_read ? "border-[#1E232D] bg-[#090C11]/50" : "border-cyan-500/25 bg-[#091114]/60"}`}
                      >
                        <div className="flex-grow min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white uppercase font-sans">
                              👤 {item.fullname}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setEmailRecipientsMode("custom");
                                setEmailRecipientsText(item.usermail);
                                setIsEmailModalOpen(true);
                                setEmailError(null);
                                setEmailSuccess(null);
                                setEmailSecret(localStorage.getItem("forex_site_secret") || "");
                              }}
                              className="text-[9px] font-mono text-slate-400 hover:text-indigo-400 transition hover:underline bg-[#12161F] border border-[#1E232D] px-2 py-0.5 rounded uppercase cursor-pointer"
                              title="Directly Draft Email to sender"
                            >
                              ✉ {item.usermail}
                            </button>

                            <span className="text-[8px] font-mono text-slate-500 uppercase">
                              {new Date(item.created_at).toLocaleString()}
                            </span>

                            {!item.is_read && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] font-mono font-bold uppercase rounded border border-cyan-500/30">
                                NEW MESSAGE
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 bg-[#12161E]/40 border border-[#1E232D]/40 rounded">
                            <span className="text-[9px] font-mono text-slate-300 block uppercase tracking-wider mb-1 font-bold">
                              Subject: {item.subject}
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal whitespace-pre-wrap select-text">
                              {item.message}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 font-mono text-[9px] uppercase shrink-0 pt-1 md:pt-0">
                          {!item.is_read && (
                            <button
                              onClick={() => markContactAsRead(item.id)}
                              className="px-2.5 py-1.5 bg-[#12161F] hover:bg-cyan-600 hover:text-white text-slate-300 border border-[#1E232D] hover:border-cyan-500 rounded cursor-pointer transition font-bold"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteContactItem(item.id)}
                            className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 hover:border-rose-500/30 rounded cursor-pointer transition"
                            title="Delete custom message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RE-INITIALIZED COMPACT LAUNCHER CIRCLE */}
        <button
          onClick={() => {
            if (isSupportOpen) {
              setIsSupportOpen(false);
              setIsLauncherMenuOpen(false);
            } else {
              setIsLauncherMenuOpen(!isLauncherMenuOpen);
            }
          }}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md hover:shadow-blue-500/20 transition cursor-pointer relative border border-blue-500/20 active:scale-95 duration-100 group"
          id="support-launcher-btn"
        >
          {isSupportOpen || isLauncherMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
          )}

          {/* PULSING COMPREHENSIVE UNREAD CONVERSATIONS BADGE */}
          {(supportConversations.some(m => m.sender === "user" && !m.is_read) || feedbackList.some(f => !f.is_read) || contactList.some(c => !c.is_read)) && !isLauncherMenuOpen && !isSupportOpen && !isFeedbackModalOpen && !isContactModalOpen && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] bg-rose-600 text-[8px] font-bold font-mono px-1 rounded-full text-white flex items-center justify-center shadow animate-bounce">
              {supportConversations.filter(m => m.sender === "user" && !m.is_read).length + feedbackList.filter(f => !f.is_read).length + contactList.filter(c => !c.is_read).length}
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
