import { Star } from "lucide-react";

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(n)}
            className={readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              size={size}
              className={filled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
            />
          </button>
        );
      })}
    </div>
  );
}
