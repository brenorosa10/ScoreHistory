import { Link } from "@tanstack/react-router";
import { ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MatchRecord } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { resultBadgeClass, resultLetter } from "@/lib/match-result";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 40;
const COMMIT_THRESHOLD = 112;

type SwipeableMatchRowProps = {
  match: MatchRecord;
  revealed: boolean;
  hideOpponentName?: boolean;
  onRevealedChange: (revealed: boolean) => void;
  onRequestDelete: () => void;
};

export function SwipeableMatchRow({
  match,
  revealed,
  hideOpponentName = false,
  onRevealedChange,
  onRequestDelete,
}: SwipeableMatchRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const skipClick = useRef(false);

  function setRowOffset(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  useEffect(() => {
    if (!dragging) {
      setRowOffset(revealed ? -ACTION_WIDTH : 0);
    }
  }, [dragging, revealed]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    startX.current = event.clientX;
    startY.current = event.clientY;
    startOffset.current = revealed ? -ACTION_WIDTH : offsetRef.current;
    axis.current = "undecided";
    skipClick.current = false;
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) {
      return;
    }

    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (axis.current !== "x") {
      return;
    }

    event.preventDefault();
    setRowOffset(Math.min(0, Math.max(-(ACTION_WIDTH + 56), startOffset.current + dx)));
  }

  function finishGesture(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragging(false);

    if (axis.current !== "x") {
      return;
    }

    skipClick.current = true;
    const current = offsetRef.current;

    if (current <= -COMMIT_THRESHOLD) {
      setRowOffset(0);
      onRevealedChange(false);
      onRequestDelete();
      return;
    }

    const shouldOpen = current <= -OPEN_THRESHOLD;
    onRevealedChange(shouldOpen);
    setRowOffset(shouldOpen ? -ACTION_WIDTH : 0);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-label="Excluir partida"
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-destructive text-white"
        onClick={() => {
          skipClick.current = true;
          onRequestDelete();
        }}
      >
        <Trash2 className="size-5" />
      </button>

      <div
        className={cn(
          "relative touch-pan-y bg-background",
          dragging && axis.current === "x" ? "select-none transition-none" : "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
      >
        <Link
          to="/partidas/$matchId"
          params={{ matchId: match.id }}
          draggable={false}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors active:bg-accent"
          onClick={(event) => {
            if (skipClick.current || revealed || offsetRef.current < -8) {
              event.preventDefault();
              skipClick.current = false;
              if (revealed) {
                onRevealedChange(false);
              }
            }
          }}
        >
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold",
              resultBadgeClass(match.won),
            )}
          >
            {resultLetter(match.won)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {hideOpponentName ? formatShortDate(match.playedAt) : match.opponentName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {hideOpponentName ? match.courtType : `${formatShortDate(match.playedAt)} · ${match.courtType}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-sm font-semibold tabular-nums">{match.score}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </div>
  );
}
