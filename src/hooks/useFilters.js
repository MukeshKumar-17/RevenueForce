import { useSearchParams } from "react-router-dom";

const DEFAULTS = { person: "all", sourceType: "all", route: "all", state: "all" };

// Keeps list filters in the URL (?person=...&sourceType=...) so links and refreshes keep them.
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(Object.entries(DEFAULTS).map(([name, fallback]) => [name, params.get(name) ?? fallback]));

  const updateFilters = (changes) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      value === "all" ? next.delete(name) : next.set(name, value);
    }
    setParams(next, { replace: true });
  };

  return [filters, updateFilters];
}

// Builds a query string from filters, leaving out defaults.
export function toQuery(filters) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value !== "all") params.set(name, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
