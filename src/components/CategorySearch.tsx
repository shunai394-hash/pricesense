"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  getCategoryById,
  JOB_CATEGORY_COUNT,
  JOB_GROUPS,
} from "@/data/jobCategories";
import type { JobCategory } from "@/data/types";
import { groupCategoriesByGroup, searchCategories } from "@/lib/categories";
import { formatYen } from "@/lib/calculator";

interface CategorySearchProps {
  selectedId: string;
  onSelect: (category: JobCategory) => void;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function CategorySearch({ selectedId, onSelect }: CategorySearchProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  const results = useMemo(() => searchCategories(query), [query]);
  const groupedResults = useMemo(
    () => groupCategoriesByGroup(results),
    [results]
  );

  const indexedResults = useMemo(() => {
    const items: Array<{ category: JobCategory; index: number }> = [];
    let index = 0;
    for (const group of JOB_GROUPS) {
      const groupItems = groupedResults.get(group.id);
      if (!groupItems?.length) continue;
      for (const category of groupItems) {
        items.push({ category, index });
        index += 1;
      }
    }
    return items;
  }, [groupedResults]);

  const selectedCategory = getCategoryById(selectedId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, query, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-category-search-dropdown]")
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (category: JobCategory) => {
      onSelect(category);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      updatePosition();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, indexedResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (indexedResults[highlightIndex]) {
          handleSelect(indexedResults[highlightIndex].category);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const dropdown =
    isOpen && mounted ? (
      <div
        data-category-search-dropdown
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 9999,
        }}
        className="overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="border-b border-border px-4 py-2 text-xs text-muted">
          {query.trim()
            ? `${results.length}件ヒット / 全${JOB_CATEGORY_COUNT}職種`
            : `全${JOB_CATEGORY_COUNT}職種を表示中（スクロールで全件確認）`}
        </div>
        <ul
          id={listboxId}
          role="listbox"
          aria-label="職種一覧"
          className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain py-1"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">
              該当する職種が見つかりません
            </li>
          ) : (
            JOB_GROUPS.map((group) => {
              const items = groupedResults.get(group.id);
              if (!items?.length) return null;

              return (
                <li key={group.id} role="presentation">
                  <p className="sticky top-0 z-10 bg-surface-elevated px-4 py-1.5 text-xs font-medium text-accent">
                    {group.label}（{items.length}）
                  </p>
                  <ul>
                    {items.map((category) => {
                      const indexed = indexedResults.find(
                        (item) => item.category.id === category.id
                      );
                      const index = indexed?.index ?? 0;
                      return (
                        <li
                          key={category.id}
                          role="option"
                          aria-selected={category.id === selectedId}
                          onMouseEnter={() => setHighlightIndex(index)}
                          onClick={() => handleSelect(category)}
                          className={`cursor-pointer px-4 py-2.5 transition-colors ${
                            index === highlightIndex
                              ? "bg-accent/10"
                              : "hover:bg-surface"
                          } ${category.id === selectedId ? "border-l-2 border-accent" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {category.label}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {category.description}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-accent">
                              {formatYen(category.avgRate)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-border px-4 py-2 text-center text-xs text-muted">
          表示: {results.length} / {JOB_CATEGORY_COUNT} 職種
        </div>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor="job-category-search"
          className="text-sm font-medium text-muted"
        >
          職種
        </label>
        <span className="text-xs text-accent">{JOB_CATEGORY_COUNT}職種対応</span>
      </div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          id="job-category-search"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder={`${JOB_CATEGORY_COUNT}職種から検索（例: AI、デザイン、弁護士）`}
          value={isOpen ? query : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            updatePosition();
          }}
          onClick={() => {
            setIsOpen(true);
            updatePosition();
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-border bg-surface py-3.5 pl-10 pr-4 text-foreground transition-colors placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {!isOpen && selectedCategory && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <span className="text-xs text-muted">{selectedCategory.groupLabel}</span>
          <span className="text-sm font-medium text-foreground">
            {selectedCategory.label}
          </span>
          <span className="ml-auto text-xs text-accent">
            平均 {formatYen(selectedCategory.avgRate)}
          </span>
        </div>
      )}

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
