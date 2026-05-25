import { Direction, Importance, Priority, Sentiment } from "@/lib/types";

const sentimentText: Record<Sentiment | Direction, string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  mixed: "Mixed",
  uncertain: "Uncertain"
};

export function SentimentBadge({ value }: { value: Sentiment | Direction }) {
  return <span className={`pill ${value}`}>{sentimentText[value]}</span>;
}

export function ImportanceBadge({ value }: { value: Importance | Priority }) {
  return <span className={`pill ${value}`}>{value.toUpperCase()}</span>;
}

export function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="tags">
      {items.map((item) => (
        <span className="tag" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}
