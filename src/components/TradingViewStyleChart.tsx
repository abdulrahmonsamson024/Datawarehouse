import React, { useRef, useState, useEffect } from "react";
import { createChart, ColorType, CrosshairMode, IChartApi, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { AlertCircle } from "lucide-react";

export interface ChartCandle {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  repaired?: boolean;
  spread?: any;
}

interface TradingViewStyleChartProps {
  data: any[]; // accepts both standard Candlestick or Warehouse raw responses
  pairName: string;
  timeframe: string;
  isLoading?: boolean;
}

export const TradingViewStyleChart: React.FC<TradingViewStyleChartProps> = ({
  data,
  pairName,
  timeframe,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // Hovered state for professional HUD Legend
  const [hudData, setHudData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    repaired: boolean;
    spread?: any;
  } | null>(null);

  // Standardize mixed payloads to standard sorted, unique ChartCandle structure
  const candles = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    const uniqueMap = new Map<number, ChartCandle>();
    
    data.forEach((item) => {
      if (!item) return;
      const rawTime = item.time !== undefined ? item.time : (item.timestamp || item.open_time);
      if (rawTime === undefined) return;

      let timeInSeconds = 0;
      const numTime = Number(rawTime);
      if (!isNaN(numTime)) {
        timeInSeconds = String(numTime).length >= 13 ? Math.floor(numTime / 1000) : numTime;
      } else {
        const dt = new Date(String(rawTime));
        if (isNaN(dt.getTime())) return;
        timeInSeconds = Math.floor(dt.getTime() / 1000);
      }
      
      const roundedTime = Math.round(timeInSeconds);

      // Parse bid-ask or fallbacks for internal chart plotting
      const openVal = item.bid_open !== undefined ? item.bid_open : (item.open || item.open_price || 0);
      const highVal = item.bid_high !== undefined ? item.bid_high : (item.high || item.high_price || 0);
      const lowVal = item.bid_low !== undefined ? item.bid_low : (item.low || item.low_price || 0);
      const closeVal = item.bid_close !== undefined ? item.bid_close : (item.close || item.close_price || 0);

      // Derive nested spread object representation for HUD display if it's flat in API response
      const spreadVal = item.spread ?? (item.spread_close !== undefined ? {
        open: item.spread_open ?? 0,
        high: item.spread_high ?? 0,
        low: item.spread_low ?? 0,
        close: item.spread_close ?? 0
      } : undefined);

      uniqueMap.set(roundedTime, {
        time: roundedTime,
        open: parseFloat(String(openVal)),
        high: parseFloat(String(highVal)),
        low: parseFloat(String(lowVal)),
        close: parseFloat(String(closeVal)),
        volume: parseFloat(String(item.volume || 0)),
        repaired: !!item.repaired,
        spread: spreadVal,
      });
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);
  }, [data]);

  // Initial HUD shows last candle data
  useEffect(() => {
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const d = new Date(lastCandle.time * 1000);
      const isMin = timeframe.toLowerCase().includes("m");
      const dateStr = isMin
        ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      setHudData({
        time: dateStr,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastCandle.volume,
        repaired: !!lastCandle.repaired,
        spread: lastCandle.spread,
      });
    } else {
      setHudData(null);
    }
  }, [candles, timeframe]);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Create TradingView Chart inside our container div
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 600,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: "#06080b" },
        textColor: "#94a3b8",
        fontSize: 10,
        fontFamily: "JetBrains Mono, Courier New, monospace",
      },
      grid: {
        vertLines: { color: "#141922" },
        horzLines: { color: "#141922" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#3b82f6",
          width: 1,
          style: 2, // dashed
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "#3b82f6",
          width: 1,
          style: 2, // dashed
          labelBackgroundColor: "#3b82f6",
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        textColor: "#64748b",
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add professional CandlestickSeries
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // Add overlaid Histogram Volume Series at the bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume-scale",
    });

    chart.priceScale("volume-scale").applyOptions({
      scaleMargins: {
        top: 0.78, // volume at bottom 22%
        bottom: 0,
      },
      visible: false, // hide the volume axis scale to look incredibly professional
    });

    // Populate series data
    const candlestickData = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map(c => {
      const isUp = c.close >= c.open;
      return {
        time: c.time as any,
        value: c.volume,
        color: isUp ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
      };
    });

    candlestickSeries.setData(candlestickData);
    volumeSeries.setData(volumeData);

    // Auto fit/zoom to show all data gracefully
    chart.timeScale().fitContent();

    // ResizeObserver handler to automatically make the chart highly responsive to screen sizes
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      chart.resize(width, Math.max(height, 350));
    });
    
    resizeObserver.observe(containerRef.current);

    // Subscribe to crosshair movement to update our HUD dynamically on hovering/touching
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || param.point === undefined || !param.seriesData) {
        // Fall back to the absolute latest candle when cursor leaves/deactivates
        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const d = new Date(lastCandle.time * 1000);
          const isMin = timeframe.toLowerCase().includes("m");
          const dateStr = isMin
            ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          setHudData({
            time: dateStr,
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
            volume: lastCandle.volume,
            repaired: !!lastCandle.repaired,
            spread: lastCandle.spread,
          });
        }
        return;
      }

      // Find series data
      const dataCandle = param.seriesData.get(candlestickSeries) as any;
      const dataVolume = param.seriesData.get(volumeSeries) as any;

      if (dataCandle) {
        const timeSecs = Number(param.time);
        const d = new Date(timeSecs * 1000);
        const isMin = timeframe.toLowerCase().includes("m");
        const dateStr = isMin
          ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        // Cross-reference original candle to find repaired flag
        const originalCandle = candles.find((c) => c.time === timeSecs);

        setHudData({
          time: dateStr,
          open: dataCandle.open,
          high: dataCandle.high,
          low: dataCandle.low,
          close: dataCandle.close,
          volume: dataVolume ? dataVolume.value : 0,
          repaired: originalCandle ? !!originalCandle.repaired : false,
          spread: originalCandle ? originalCandle.spread : undefined,
        });
      }
    });

    // Cleanup chart on unmount or updates
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, timeframe]);

  const isUpCandle = hudData ? hudData.close >= hudData.open : true;
  const isEUR = pairName.toUpperCase().includes("EUR") || pairName.toUpperCase().includes("GBP") || pairName.toUpperCase().includes("JPY");

  return (
    <div className="relative flex flex-col h-full w-full select-none min-h-[380px] bg-[#06080b]">
      {/* Top HUD Legend matching TradingView UI */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1E232D]/60 bg-[#090B0F]/90 px-4 py-2 font-mono text-[10px] gap-2 z-10">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-white font-bold tracking-wider">{pairName}</span>
          <span className="bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-blue-400 font-bold px-1.5 py-0.5 uppercase tracking-wide">
            {timeframe.toUpperCase()}
          </span>
          {hudData?.repaired && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] px-1 py-0.5 rounded-none font-bold uppercase animate-pulse">
              [Gap Repaired]
            </span>
          )}
        </div>

        {hudData ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
            <span className="text-[9px]">TIME: <span className="text-slate-200">{hudData.time}</span></span>
            <span>O: <span className={isUpCandle ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>${hudData.open.toFixed(isEUR ? 5 : 2)}</span></span>
            <span>H: <span className="text-emerald-400 font-semibold">${hudData.high.toFixed(isEUR ? 5 : 2)}</span></span>
            <span>L: <span className="text-rose-400 font-semibold">${hudData.low.toFixed(isEUR ? 5 : 2)}</span></span>
            <span>C: <span className={isUpCandle ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>${hudData.close.toFixed(isEUR ? 5 : 2)}</span></span>
            <span className="hidden sm:inline">V: <span className="text-blue-400 font-semibold">{Math.round(hudData.volume).toLocaleString()}</span></span>
            {hudData.spread && (
              <span className="text-purple-300 font-mono border-l border-[#1E232D]/80 pl-2 font-medium">
                SPREAD: {typeof hudData.spread === "object" ? (
                  <span>
                    O:{(hudData.spread.open).toFixed(isEUR ? 5 : 4)} | 
                    H:{(hudData.spread.high).toFixed(isEUR ? 5 : 4)} | 
                    L:{(hudData.spread.low).toFixed(isEUR ? 5 : 4)} | 
                    C:{(hudData.spread.close).toFixed(isEUR ? 5 : 4)}
                  </span>
                ) : (
                  <span>{parseFloat(String(hudData.spread)).toFixed(isEUR ? 5 : 4)}</span>
                )}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-500 italic uppercase">Initializing market series...</span>
        )}
      </div>

      <div className="relative flex-1 w-full bg-[#06080b] min-h-[340px]" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 bg-[#06080B]/70 flex items-center justify-center z-20 transition-opacity">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Compacted data processing...</span>
            </div>
          </div>
        )}

        {candles.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-[#1E232D]/35 bg-[#06080b] z-10">
            <AlertCircle className="h-6 w-6 text-slate-500 shrink-0" />
            <div className="max-w-xs">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">No chart points in current timeline window</p>
              <p className="text-[9px] text-slate-500 mt-0.5 font-mono leading-normal">
                Check database instance state, ingest pairs from Exness/Dukascopy, or expand your start time filters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
