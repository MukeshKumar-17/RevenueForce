import styles from "./FilterBar.module.css";

// Person + source-type filter. onChange receives only the field that changed.
export function FilterBar({ people, filters, onChange }) {
  const callReps = people.filter((person) => person.roles.includes("call rep"));
  const organisers = people.filter((person) => person.roles.includes("meeting organiser"));

  return (
    <div className={styles.bar}>
      <div className={`field ${styles.person}`}>
        <label htmlFor="filter-person">Person</label>
        <select id="filter-person" className="select select-pill" value={filters.person} onChange={(event) => onChange({ person: event.target.value })}>
          <option value="all">Everyone</option>
          <optgroup label="Call reps">
            {callReps.map((person) => (
              <option key={`rep-${person.email}`} value={person.email}>
                {person.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Meeting organisers">
            {organisers.map((person) => (
              <option key={`org-${person.email}`} value={person.email}>
                {person.email}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="field" role="group" aria-labelledby="filter-source-label">
        <span id="filter-source-label" className={styles.groupLabel}>
          Source
        </span>
        <div className={styles.segmented}>
          {["all", "call", "meeting"].map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn-secondary btn-sm"
              aria-pressed={filters.sourceType === type}
              onClick={() => onChange({ sourceType: type })}
            >
              {type === "all" ? "All" : type === "call" ? "Calls" : "Meetings"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
