import { getRouteApi } from "@tanstack/react-router";
import { Columns3 } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FeedSort } from "@shared/types";

import {
  FEED_TOPICS,
  parseCols,
  serializeCols,
  toggleCol,
  topicLabel,
  type FeedTopic,
} from "../lib/topics";
import { AllCatsFilter } from "./all-cats-filter";

const routeApi = getRouteApi("/");

const SORTS: { value: FeedSort; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "relevance", label: "Relevance" },
];

export function FeedHeader() {
  const { sort, cols: colsParam } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const cols = parseCols(colsParam);

  function setCols(next: FeedTopic[]) {
    navigate({
      search: (prev) => ({
        ...prev,
        cols: serializeCols(next),
      }),
    });
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:border-b">
      <p className="text-xl font-medium">Situation</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {SORTS.map((option) => (
            <button
              className={cn(
                sort === option.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={option.value}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, sort: option.value }),
                })
              }
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <AllCatsFilter className="md:hidden" size="icon-sm" />
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Columns"
                  className="text-muted-foreground hover:text-foreground"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <Columns3 />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FEED_TOPICS.map((topic) => {
                  const checked = cols.includes(topic);
                  return (
                    <DropdownMenuCheckboxItem
                      checked={checked}
                      closeOnClick={false}
                      disabled={checked && cols.length <= 1}
                      key={topic}
                      onCheckedChange={() => setCols(toggleCol(cols, topic))}
                    >
                      {topicLabel(topic)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
