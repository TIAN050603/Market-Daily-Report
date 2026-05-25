import { MockMarketDataProvider } from "./mock-provider";
import { DataProvider } from "./types";

export function getDataProvider(): DataProvider {
  // Swap this factory when real RSS/news/market-data providers are configured.
  return new MockMarketDataProvider();
}
