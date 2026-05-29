import { addDays, formatDate } from "@/lib/reporting/date-utils";
import { BigDecliner, EventCalendarItem } from "@/lib/types";
import { DataProvider, MarketNewsItem } from "./types";

const source = (title: string, url: string) => [{ title, url }];

export class MockMarketDataProvider implements DataProvider {
  async fetchMacroEvents(date: string): Promise<EventCalendarItem[]> {
    void date;
    return [
      {
        event_date: "2026-05-28",
        event_name: "BEA Personal Income and Outlays / PCE",
        event_type: "macro",
        importance: "high",
        affected_assets: ["US Treasury yields", "Nasdaq", "Growth stocks", "USD"],
        watch_points: "核心 PCE 是否高于预期，决定长久期科技股估值压力。",
        source_urls: source("BEA release schedule", "https://www.bea.gov/news/schedule")
      },
      {
        event_date: "2026-05-28",
        event_name: "Q1 GDP second estimate",
        event_type: "macro",
        importance: "high",
        affected_assets: ["S&P 500", "USD", "Cyclicals"],
        watch_points: "增长和价格分项是否显示滞胀压力。",
        source_urls: source("BEA GDP", "https://www.bea.gov/data/gdp/gross-domestic-product")
      }
    ];
  }

  async fetchFedEvents(date: string): Promise<EventCalendarItem[]> {
    void date;
    return [
      {
        event_date: "2026-05-27",
        event_name: "Federal Reserve speaker calendar",
        event_type: "fed",
        importance: "medium",
        affected_assets: ["Rates", "Banks", "Growth stocks"],
        watch_points: "关注官员对通胀、就业和降息路径的表述是否发生边际变化。",
        source_urls: source("Federal Reserve calendar", "https://www.federalreserve.gov/newsevents/calendar.htm")
      }
    ];
  }

  async fetchEarningsEvents(date: string): Promise<EventCalendarItem[]> {
    void date;
    return [
      {
        event_date: "2026-05-27",
        event_name: "Marvell Technology earnings",
        event_type: "earnings",
        importance: "high",
        affected_assets: ["MRVL", "AVGO", "NVDA", "AI ASIC", "Optical networking"],
        watch_points: "AI custom silicon、光互连、数据中心网络收入和指引。",
        source_urls: source("Marvell IR calendar", "https://investor.marvell.com/news-events/ir-calendar")
      },
      {
        event_date: "2026-05-27",
        event_name: "Synopsys earnings",
        event_type: "earnings",
        importance: "high",
        affected_assets: ["SNPS", "CDNS", "Semiconductor design"],
        watch_points: "EDA 需求和 AI ASIC 设计活动是否继续强劲。",
        source_urls: source("Synopsys events", "https://investor.synopsys.com/events-and-presentations/default.aspx")
      },
      {
        event_date: "2026-05-27",
        event_name: "Snowflake earnings",
        event_type: "earnings",
        importance: "high",
        affected_assets: ["SNOW", "Cloud", "AI data platform"],
        watch_points: "产品收入增长、AI Data Cloud 消费、剩余履约义务和 FY2027 指引。",
        source_urls: source("Kiplinger earnings calendar", "https://www.kiplinger.com/investing/stocks/17494/next-week-earnings-calendar-stocks")
      },
      {
        event_date: "2026-05-28",
        event_name: "Dell Technologies Q1 FY2027 earnings",
        event_type: "earnings",
        importance: "high",
        affected_assets: ["DELL", "AI servers", "SMCI", "VRT", "NVDA"],
        watch_points: "AI server backlog、ISG margin、GPU server 订单质量和 FY2027 指引。",
        source_urls: source("Dell upcoming events", "https://delltechnologies.gcs-web.com/news-events/upcoming-events")
      }
    ];
  }

  async fetchMarketNews(date: string): Promise<MarketNewsItem[]> {
    const isHolidayReport = date === "2026-05-25";
    const headlineSignal: MarketNewsItem = isHolidayReport
      ? {
          title: "Memorial Day 休市，市场等待 2026-05-26 重新开盘定价",
          summary:
            "2026-05-25 美股因 Memorial Day 休市，周末和假期期间的 AI、宏观与利率信息会集中在 2026-05-26 盘前和开盘后反映。",
          category: "macro",
          fact_status: "fact",
          affected_tickers: ["QQQ", "SPY", "SMH"],
          affected_sectors: ["Macro", "AI", "Semiconductor"],
          importance_score: 94,
          source_urls: source("NYSE holiday calendar", "https://www.nyse.com/markets/hours-calendars?os=roku___")
        }
      : {
          title: `${date} 假期后首个交易日：AI 财报兑现与 PCE 利率风险同时定价`,
          summary:
            `${date} 盘前需要重点看 Nasdaq 和半导体能否消化假期期间累积的信息：AI 基础设施仍有业绩支撑，但 PCE、GDP 和美债收益率会影响高估值科技股折现率。`,
          category: "macro",
          fact_status: "inference",
          affected_tickers: ["QQQ", "SPY", "SMH", "NVDA", "MRVL", "DELL"],
          affected_sectors: ["Macro", "AI", "Semiconductor", "Rates"],
          importance_score: 94,
          source_urls: source("BEA release schedule", "https://www.bea.gov/news/schedule")
        };

    return [
      headlineSignal,
      {
        title: "Nvidia 财报继续支撑 AI 基础设施需求",
        summary: "最新财报继续显示数据中心收入和 AI 需求强劲，但市场接下来会验证外溢到 ASIC、网络和服务器链的程度。",
        category: "ai",
        fact_status: "fact",
        affected_tickers: ["NVDA", "MRVL", "AVGO", "DELL", "SMCI"],
        affected_sectors: ["AI Infrastructure", "Semiconductor", "Data Center"],
        importance_score: 90,
        source_urls: source("Axios Nvidia earnings", "https://www.axios.com/2026/05/20/nvidia-earnings-shows-ai-demand-is-still-roaring")
      },
      {
        title: "数据中心电力约束成为 AI 估值的新变量",
        summary: "公用事业并购和清洁能源采购显示 AI 电力需求正在改变能源基础设施投资逻辑。",
        category: "energy",
        fact_status: "inference",
        affected_tickers: ["NEE", "D", "CEG", "VST", "VRT", "ETN"],
        affected_sectors: ["Data Center Power", "Energy", "Grid Infrastructure"],
        importance_score: 86,
        source_urls: source("Axios power deal", "https://www.axios.com/2026/05/19/nextera-dominion-deal-power-elecricity-scale")
      }
    ];
  }

  async fetchSectorNews(_date: string): Promise<MarketNewsItem[]> {
    return [
      {
        title: "CPO / 硅光继续被 AI 网络瓶颈推到前台",
        summary: "1.6T 光模块、CPO、DSP、交换芯片是 AI 集群扩容后的关键约束。",
        category: "optical_communication",
        fact_status: "inference",
        affected_tickers: ["MRVL", "AVGO", "COHR", "LITE", "CIEN", "AAOI", "GFS"],
        affected_sectors: ["Optical Communication", "Networking"],
        importance_score: 82,
        source_urls: source("GlobalFoundries CPO", "https://www.marketscreener.com/news/globalfoundries-accelerates-adoption-of-co-packaged-optics-for-advanced-ai-data-centers-with-scale-o-ce7f58ded188ff22")
      },
      {
        title: "企业软件进入 AI 变现检查点",
        summary: "Salesforce 和 Snowflake 财报会检验 AI 功能是否转化为 RPO、净留存和云消费增长。",
        category: "software",
        fact_status: "expectation",
        affected_tickers: ["CRM", "SNOW", "MSFT", "ORCL"],
        affected_sectors: ["Cloud", "Software"],
        importance_score: 78,
        source_urls: source("Kiplinger earnings calendar", "https://www.kiplinger.com/investing/stocks/17494/next-week-earnings-calendar-stocks")
      }
    ];
  }

  async fetchBigDecliners(date: string): Promise<BigDecliner[]> {
    const baseDecliners: BigDecliner[] = [
      {
        ticker: "INTU",
        company_name: "Intuit",
        previous_day_change_percent: -20,
        volume_note: "财报后单日大幅波动，说明资金对增长质量和 AI 替代风险重新定价。",
        reason: "市场担心传统财税软件增长质量、AI 替代风险和重组信号，即使财报本身并不差。",
        reason_type: "company_specific",
        catalysts: ["财报", "重组/裁员", "指引", "软件估值重估"],
        watch_points: "关注 TurboTax 在线份额、QuickBooks 增长、AI 产品能否提升定价。",
        source_urls: source("Intuit 8-K", "https://investors.intuit.com/sec-filings/all-sec-filings/content/0000896878-26-000024/intu-20260520.htm")
      },
      {
        ticker: "TTWO",
        company_name: "Take-Two Interactive",
        previous_day_change_percent: -6.5,
        volume_note: "财报后波动，说明市场在重新评估 GTA VI 预期兑现节奏。",
        reason: "市场重新评估 GTA VI 预期、FY2027 兑现路径和当前估值中已包含多少乐观情绪。",
        reason_type: "company_specific",
        catalysts: ["FY2026 results", "GTA VI timing", "net bookings outlook"],
        watch_points: "GTA VI 时间表、预售、FY2027 net bookings 指引。",
        source_urls: source("Take-Two earnings release", "https://ir.take2games.com/static-files/de7eeb58-9a3d-44c4-8407-9b0453cae8a4")
      },
      {
        ticker: "MCHP",
        company_name: "Microchip Technology",
        previous_day_change_percent: -3.88,
        volume_note: "公开页面显示成交量约 417.9 万股；是否异常需与 30 日均量比较。",
        reason: "半导体内部资金更偏好 AI 数据中心纯受益链，传统 MCU/工业复苏节奏仍待验证。",
        reason_type: "sector_driven",
        catalysts: ["财报", "10-K", "半导体风格轮动"],
        watch_points: "订单恢复、渠道库存、工业和汽车需求。",
        source_urls: source("Microchip 10-K", "https://ir.microchip.com/sec-filings/all-sec-filings/content/0000827054-26-000016/0000827054-26-000016.pdf")
      }
    ];

    const historicalVariants: Record<string, { ticker: string; company: string; change: number; theme: string }[]> = {
      "2026-05-25": [
        { ticker: "INTU", company: "Intuit", change: -20, theme: "财税软件财报后的增长质量和 AI 替代风险重估" },
        { ticker: "TTWO", company: "Take-Two Interactive", change: -6.5, theme: "GTA VI 兑现节奏和游戏股估值回吐" },
        { ticker: "MCHP", company: "Microchip Technology", change: -3.88, theme: "传统 MCU/工业半导体复苏节奏弱于 AI 数据中心链" }
      ],
      "2026-05-26": [
        { ticker: "ADTX", company: "Aditxt", change: -28.4, theme: "小盘医疗科技股流动性和融资风险" },
        { ticker: "GMM", company: "Global Mofy AI", change: -18.7, theme: "小盘 AI 概念股在成交放大后回吐" },
        { ticker: "SMCI", company: "Super Micro Computer", change: -7.9, theme: "AI server 供应链对毛利率和订单质量重新定价" }
      ],
      "2026-05-27": [
        { ticker: "SNOW", company: "Snowflake", change: -5.6, theme: "云软件财报前资金降低风险敞口" },
        { ticker: "AAOI", company: "Applied Optoelectronics", change: -6.8, theme: "光通信高 beta 标的在 CPO 预期交易后波动放大" },
        { ticker: "RKLB", company: "Rocket Lab", change: -4.9, theme: "太空商业化成长股随风险偏好降温回撤" }
      ],
      "2026-05-28": [
        { ticker: "PLAB", company: "Photronics", change: -11.2, theme: "半导体材料/光掩模需求和指引被重新评估" },
        { ticker: "ZCMD", company: "Zhongchao", change: -16.5, theme: "低流动性中概小盘股价格异动" },
        { ticker: "SUGP", company: "SU Group", change: -10.4, theme: "小盘股成交驱动下跌，需要警惕流动性噪音" }
      ]
    };

    const variant = historicalVariants[date];
    if (!variant) return baseDecliners;

    return variant.map((item, index) => ({
      ...baseDecliners[index % baseDecliners.length],
      ticker: item.ticker,
      company_name: item.company,
      previous_day_change_percent: item.change,
      volume_note: `${date} 历史回填样例：当前 MVP 未接入历史逐日涨跌幅数据库，不能把实时跌幅榜直接套用到过去日期。`,
      reason: `${date} 大跌复盘重点：${item.theme}。这条用于区分历史日报，后续接入 Polygon/IEX/Nasdaq historical movers 后应替换为真实逐日数据。`,
      catalysts: [...baseDecliners[index % baseDecliners.length].catalysts, `historical_backfill_${date}`],
      watch_points: `${date} 后续观察：确认是否有对应财报、评级、融资、监管或板块同步下跌；不要用今天的实时跌幅榜解释这一天。`
    }));
  }

  async fetchTickerNews(ticker: string, date: string): Promise<MarketNewsItem[]> {
    const all = [...(await this.fetchMarketNews(date)), ...(await this.fetchSectorNews(date))];
    return all.filter((item) => item.affected_tickers.includes(ticker.toUpperCase()));
  }

  async fetchEconomicCalendar(date: string): Promise<EventCalendarItem[]> {
    return this.fetchMacroEvents(date);
  }

  async fetchUpcomingEvents(date: string, _days = 7): Promise<EventCalendarItem[]> {
    const endDate = formatDate(addDays(date, _days));
    const dailyContext: EventCalendarItem[] = date === "2026-05-25"
      ? [
          {
            event_date: "2026-05-25",
            event_name: "Memorial Day: US stock market closed",
            event_type: "market_holiday",
            importance: "high",
            affected_assets: ["NYSE", "Nasdaq", "US equities", "Liquidity"],
            watch_points: "假期报告应被视为 2026-05-26 开盘前准备清单，不应和下一个交易日的日内报告完全相同。",
            source_urls: source("NYSE holiday calendar", "https://www.nyse.com/markets/hours-calendars")
          }
        ]
      : [
          {
            event_date: date,
            event_name: `${date} US equity market session / premarket setup`,
            event_type: "market_session",
            importance: "medium",
            affected_assets: ["Nasdaq", "S&P 500", "QQQ", "SPY", "SMH"],
            watch_points: "把当天盘前新闻、收益率、期货和热门成长股开盘反应作为事件日历的第一项，避免把前一交易日的未来日历原样复制。",
            source_urls: source("Nasdaq market activity", "https://www.nasdaq.com/market-activity")
          }
        ];
    return [
      ...dailyContext,
      ...(await this.fetchMacroEvents(date)),
      ...(await this.fetchFedEvents(date)),
      ...(await this.fetchEarningsEvents(date))
    ]
      .filter((event) => event.event_date >= date && event.event_date <= endDate)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }
}
