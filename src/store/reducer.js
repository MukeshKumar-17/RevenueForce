import { applyBatch } from "../logic/importBatch.js";

// Source records, manual decisions and the import log are kept apart,
// so a new source revision can never overwrite a manager's route.
export const emptyState = {
  records: {},
  routeOverrides: {},
  importLog: [],
};

export function appReducer(state, action) {
  switch (action.type) {
    case "batchImported": {
      const { records, summary } = applyBatch(state.records, action.batch);
      const logEntry = { ...summary, id: state.importLog.length + 1, label: action.label, importedAt: action.at };
      return { ...state, records, importLog: [...state.importLog, logEntry] };
    }

    case "routesSaved":
      return {
        ...state,
        routeOverrides: { ...state.routeOverrides, [action.key]: { routes: action.routes, note: action.note, decidedAt: action.at } },
      };

    case "routesReset": {
      const { [action.key]: _removed, ...remaining } = state.routeOverrides;
      return { ...state, routeOverrides: remaining };
    }

    case "everythingReset":
      return emptyState;

    default:
      return state;
  }
}
