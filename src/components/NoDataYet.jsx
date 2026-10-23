import { Link } from "react-router-dom";
import { useAppStore } from "../store/AppStore.jsx";
import { EmptyState } from "./EmptyState.jsx";

export function NoDataYet() {
  const { loadDemo } = useAppStore();
  return (
    <EmptyState
      title="No records imported yet"
      seed={21}
      action={
        <button type="button" className="btn btn-primary" onClick={loadDemo}>
          Load demo state
        </button>
      }
    >
      Load both supplied deliveries, or go to <Link to="/data">Data &amp; export</Link> to replay the import steps one by one.
    </EmptyState>
  );
}
