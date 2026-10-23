import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import initialBatch from "../data/batches/01_initial.json";
import updateBatch from "../data/batches/02_update.json";
import { buildWorkspace } from "../logic/workspace.js";
import { appReducer, emptyState } from "./reducer.js";
import { loadSavedState, saveState } from "./storage.js";

export const BUNDLED_BATCHES = { initial: initialBatch, update: updateBatch };

// First visit: open in the final post-update state, as the brief asks.
// After that, whatever was saved (including an empty state after a reset) is kept.
function startingState() {
  const saved = loadSavedState();
  if (saved) return saved;
  const at = new Date().toISOString();
  const afterInitial = appReducer(emptyState, { type: "batchImported", batch: initialBatch, label: "Demo: initial batch", at });
  return appReducer(afterInitial, { type: "batchImported", batch: updateBatch, label: "Demo: update batch", at });
}

const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, startingState);

  useEffect(() => saveState(state), [state]);

  const store = useMemo(() => {
    const now = () => new Date().toISOString();
    const importBatch = (batch, label) => dispatch({ type: "batchImported", batch, label, at: now() });

    return {
      workspace: buildWorkspace(state),
      importBatch,
      loadDemo: () => {
        importBatch(initialBatch, "Demo: initial batch");
        importBatch(updateBatch, "Demo: update batch");
      },
      saveRoutes: (record, routes, note) => dispatch({ type: "routesSaved", key: record.key, routes, note, at: now() }),
      resetRoutes: (record) => dispatch({ type: "routesReset", key: record.key }),
      resetEverything: () => dispatch({ type: "everythingReset" }),
    };
  }, [state]);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  return useContext(AppStoreContext);
}
