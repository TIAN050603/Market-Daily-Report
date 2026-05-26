import { MockMarketDataProvider } from "./mock-provider";
import { PublicRssMarketDataProvider } from "./public-rss-provider";
import { DataProvider } from "./types";

export function getDataProvider(): DataProvider {
  if (process.env.DATA_PROVIDER === "mock") {
    return new MockMarketDataProvider();
  }

  return new PublicRssMarketDataProvider();
}
