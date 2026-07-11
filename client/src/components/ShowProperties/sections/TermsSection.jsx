import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import { useImportableContractFolders } from "@hooks/useImportableContractFolders.js";
import { useShowContracts } from "@hooks/useShowContracts.js";
import { CONTRACT_STATUS } from "@shared/constants/builds.js";
import { useState } from "react";
import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const BACKEND_TYPES = ["none", "plus", "vs"];
const CONTRACT_STATUS_LABELS = Object.fromEntries(CONTRACT_STATUS.map((s) => [s, s]));

function formatDate(value) {
  return value ? new Date(value).toISOString().split("T")[0] : "";
}

// ---------------------------------------------------------------------------
// ContractRow — one active contract: editable signee/status/check-in, the
// auto-populated drafted/signed/FEC dates, a link to its Drive subfolder,
// and an Archive action.
// ---------------------------------------------------------------------------

function ContractRow({ contract, onUpdate, onArchive }) {
  const [draftSignee, setDraftSignee] = useState(null); // null = not editing
  const displaySignee = draftSignee ?? contract.signee ?? "";

  function handleSigneeBlur() {
    const trimmed = draftSignee?.trim();
    if (trimmed && trimmed !== contract.signee) {
      onUpdate(contract._id, { signee: trimmed });
    }
    setDraftSignee(null);
  }

  return (
    <div className={styles.subSection}>
      <div className={styles.subSectionTitleRow}>
        <input
          type="text"
          className={styles.input}
          value={displaySignee}
          onChange={(e) => setDraftSignee(e.target.value)}
          onBlur={handleSigneeBlur}
        />
        <button className={styles.removeButton} onClick={() => onArchive(contract._id)}>
          Archive
        </button>
      </div>

      <div className={styles.fieldGrid}>
        <span className={styles.label}>Status</span>
        <BadgeSelect
          value={contract.status}
          options={CONTRACT_STATUS}
          labels={CONTRACT_STATUS_LABELS}
          variant="status"
          onChange={(newVal) => onUpdate(contract._id, { status: newVal })}
        />

        <span className={styles.label}>Last check-in</span>
        <input
          type="date"
          className={styles.input}
          value={formatDate(contract.lastCheckin)}
          onChange={(e) =>
            onUpdate(contract._id, {
              lastCheckin: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />

        {contract.dateDrafted && (
          <>
            <span className={styles.label}>Drafted</span>
            <span className={styles.value}>
              {new Date(contract.dateDrafted).toLocaleDateString()}
            </span>
          </>
        )}
        {contract.dateSigned && (
          <>
            <span className={styles.label}>Signed</span>
            <span className={styles.value}>
              {new Date(contract.dateSigned).toLocaleDateString()}
            </span>
          </>
        )}
        {contract.dateFEC && (
          <>
            <span className={styles.label}>FEC</span>
            <span className={styles.value}>
              {new Date(contract.dateFEC).toLocaleDateString()}
            </span>
          </>
        )}

        <span className={styles.label}>Folder</span>
        <a
          className={styles.driveLink}
          href={`https://drive.google.com/drive/folders/${contract.folderId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {contract.folderName}
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportContractControl — pick an existing Drive subfolder (of the show's
// root folder) that isn't already tied to a contract and turn it into one,
// renaming it to start with "contract - " if it doesn't already.
// ---------------------------------------------------------------------------

function ImportContractControl({ googleFolderId, importContract, isImporting }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const { data: folders = [], isLoading } = useImportableContractFolders(googleFolderId, {
    enabled: isOpen,
  });

  function handleImport() {
    if (!selectedFolderId) return;
    importContract(selectedFolderId);
    setIsOpen(false);
    setSelectedFolderId("");
  }

  if (!isOpen) {
    return (
      <button className={styles.addButton} onClick={() => setIsOpen(true)}>
        Import Contract
      </button>
    );
  }

  return (
    <div className={styles.addRow}>
      <select
        className={styles.select}
        value={selectedFolderId}
        onChange={(e) => setSelectedFolderId(e.target.value)}
        disabled={isLoading}
      >
        <option value="" disabled>
          {isLoading
            ? "Loading folders…"
            : folders.length === 0
              ? "No available folders"
              : "— select a folder —"}
        </option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <button
        className={styles.addButton}
        onClick={handleImport}
        disabled={!selectedFolderId || isImporting}
      >
        {isImporting ? "Importing…" : "Import"}
      </button>
      <button className={styles.removeButton} onClick={() => setIsOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContractsSubsection
// ---------------------------------------------------------------------------

function ContractsSubsection({ googleFolderId }) {
  const {
    contracts,
    updateContract,
    addContract,
    archiveContract,
    isAdding,
    importContract,
    isImporting,
  } = useShowContracts(googleFolderId);
  const [newSignee, setNewSignee] = useState("");

  function handleAdd() {
    if (!newSignee.trim()) return;
    addContract(newSignee);
    setNewSignee("");
  }

  return (
    <>
      {contracts.length === 0 && (
        <p className={styles.empty}>No contracts — this show doesn't require one.</p>
      )}

      {contracts.map((contract) => (
        <ContractRow
          key={contract._id}
          contract={contract}
          onUpdate={updateContract}
          onArchive={archiveContract}
        />
      ))}

      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Signee name (artist or management firm)…"
          value={newSignee}
          onChange={(e) => setNewSignee(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className={styles.addButton} onClick={handleAdd} disabled={isAdding}>
          {isAdding ? "Adding…" : "+ Add Contract"}
        </button>
      </div>

      <ImportContractControl
        googleFolderId={googleFolderId}
        importContract={importContract}
        isImporting={isImporting}
      />
    </>
  );
}

const BackendFields = ({ prefix, values, setField }) => {
  const hasBackend = values?.backendType && values.backendType !== "none";

  return (
    <>
      <label className={styles.label} htmlFor={`${prefix}-guarantee`}>
        Guarantee ($)
      </label>
      <input
        id={`${prefix}-guarantee`}
        className={styles.input}
        type="number"
        min="0"
        step="0.01"
        value={values?.guarantee ?? ""}
        onChange={(e) =>
          setField(`${prefix}.guarantee`, e.target.value === "" ? null : Number(e.target.value))
        }
      />

      <label className={styles.label} htmlFor={`${prefix}-backendType`}>
        Backend Type
      </label>
      <select
        id={`${prefix}-backendType`}
        className={styles.select}
        value={values?.backendType ?? "none"}
        onChange={(e) => {
          setField(`${prefix}.backendType`, e.target.value);
          if (e.target.value === "none") {
            setField(`${prefix}.percentage`, 0);
            setField(`${prefix}.splitPoint`, null);
          }
        }}
      >
        {BACKEND_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {hasBackend && (
        <>
          <label className={styles.label} htmlFor={`${prefix}-percentage`}>
            Percentage (%)
          </label>
          <input
            id={`${prefix}-percentage`}
            className={styles.input}
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={values?.percentage ?? ""}
            onChange={(e) =>
              setField(
                `${prefix}.percentage`,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />

          <label className={styles.label} htmlFor={`${prefix}-splitPoint`}>
            Split Point ($)
          </label>
          <input
            id={`${prefix}-splitPoint`}
            className={styles.input}
            type="number"
            min="0.01"
            step="0.01"
            value={values?.splitPoint ?? ""}
            onChange={(e) =>
              setField(
                `${prefix}.splitPoint`,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </>
      )}
    </>
  );
};

export default function TermsSection({ show, setField }) {
  const terms = show.terms ?? {};
  const hasLivestream = terms.livestream?.hasLivestream ?? false;

  return (
    <section id="terms" className={styles.section}>
      <SectionHeader title="Contracts" />

      <ContractsSubsection googleFolderId={show.googleFolderId} />

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Main Settlement</h4>
        <div className={styles.fieldGrid}>
          <BackendFields prefix="terms.main" values={terms.main} setField={setField} />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Livestream</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="livestream-enabled">
            Has Livestream
          </label>
          <input
            id="livestream-enabled"
            type="checkbox"
            className={styles.checkbox}
            checked={hasLivestream}
            onChange={(e) => {
              setField("terms.livestream.hasLivestream", e.target.checked);
            }}
          />

          {hasLivestream && (
            <>
              <label className={styles.label} htmlFor="livestream-ticket-price">
                Ticket Price ($)
              </label>
              <input
                id="livestream-ticket-price"
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={terms.livestream?.ticketPrice ?? ""}
                onChange={(e) =>
                  setField(
                    "terms.livestream.ticketPrice",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
              <BackendFields
                prefix="terms.livestream"
                values={terms.livestream}
                setField={setField}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Educational Events</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="edu-description">
            Description
          </label>
          <textarea
            id="edu-description"
            className={styles.textarea}
            value={terms.educationalEvents?.description ?? ""}
            onChange={(e) => setField("terms.educationalEvents.description", e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </section>
  );
}
