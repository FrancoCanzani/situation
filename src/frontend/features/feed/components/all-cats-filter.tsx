import { getRouteApi } from "@tanstack/react-router";
import { ListFilter, X } from "lucide-react";

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
import { CATEGORIES, type Category } from "@shared/types";

import {
  parseCats,
  serializeCats,
  toggleCat,
  topicLabel,
} from "../lib/topics";

const routeApi = getRouteApi("/");

export function AllCatsFilter({
  className,
  size = "icon-xs",
}: {
  className?: string;
  size?: "icon-xs" | "icon-sm";
}) {
  const { cats: catsParam } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const cats = parseCats(catsParam);
  const filtered = cats.length < CATEGORIES.length;

  function setCats(next: Category[]) {
    navigate({
      search: (prev) => ({
        ...prev,
        cats: serializeCats(next),
      }),
    });
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {filtered ? (
        <Button
          aria-label="Clear category filter"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setCats([...CATEGORIES])}
          size={size}
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Filter categories"
              className={
                filtered
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
              size={size}
              type="button"
              variant="ghost"
            />
          }
        >
          <ListFilter />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIES.map((category) => {
              const checked = cats.includes(category);
              return (
                <DropdownMenuCheckboxItem
                  checked={checked}
                  closeOnClick={false}
                  disabled={checked && cats.length <= 1}
                  key={category}
                  onCheckedChange={() => setCats(toggleCat(cats, category))}
                >
                  {topicLabel(category)}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
