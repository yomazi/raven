import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import { useImportableContractFolders } from "@hooks/useImportableContractFolders.js";
import { useShowContracts } from "@hooks/useShowContracts.js";
import { CONTRACT_STATUS } from "@shared/constants/builds.js";
import SvgContract from "@svg/contract_google.svg?react";
import SvgEdit from "@svg/edit_google.svg?react";
import { useState } from "react";
import styles from "./ContractsPanel.module.css";

const CONTRACT_STATUS_LABELS = Object.fromEntries(CONTRACT_STATUS.map((s) => [s, s]));

function formatDate(value) {
  return value ? new Date(value).toISOString().split("T")[0] : "";
}

// ---------------------------------------------------------------------------
// ContractRow — one active contract: editable signee/status/check-in, the
// auto-populated drafted/signed/FEC dates, a link to its Drive subfolder,
// and an Archive action.
// ---------------------------------------------------------------------------

function ContractRow({ contract, onUpdate, onArchive, onRename, onGenerate, isGenerating }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(contract.signee ?? "");

  function startEditingName() {
    setDraftName(contract.signee ?? "");
    setIsEditingName(true);
  }

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== contract.signee) {
      onRename(contract._id, trimmed);
    }
    setIsEditingName(false);
  }

  return (
    <div className={styles.subSection}>
      <div className={styles.subSectionTitleRow}>
        {isEditingName ? (
          <input
            type="text"
            className={styles.input}
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        ) : (
          <div className={styles.nameDisplay}>
            <a
              className={styles.nameLink}
              href={`https://drive.google.com/drive/folders/${contract.folderId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SvgContract className={styles.nameIcon} />
              <span className={styles.nameText}>{contract.signee}</span>
            </a>
            <button
              className={styles.editButton}
              onClick={startEditingName}
              title="Rename contract"
            >
              <SvgEdit className={styles.editIcon} />
            </button>
          </div>
        )}
        <button className={styles.removeButton} onClick={() => onArchive(contract._id)}>
          Archive
        </button>
      </div>

      <div className={styles.fieldGrid}>
        <span className={styles.label}>Status</span>
        <div className={styles.statusCell}>
          <BadgeSelect
            value={contract.status}
            options={CONTRACT_STATUS}
            labels={CONTRACT_STATUS_LABELS}
            variant="status"
            onChange={(newVal) => onUpdate(contract._id, { status: newVal })}
          />
          {contract.status === "to do" && (
            <button
              className={styles.generateButton}
              onClick={() => onGenerate(contract._id)}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate"}
            </button>
          )}
        </div>

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
            <span className={styles.value}>{new Date(contract.dateFEC).toLocaleDateString()}</span>
          </>
        )}
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
// ContractsPanel
// ---------------------------------------------------------------------------

export default function ContractsPanel({ show }) {
  const googleFolderId = show?.googleFolderId;
  const {
    contracts,
    updateContract,
    renameContract,
    generateContract,
    generatingId,
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

  if (!show) return null;

  return (
    <div className={styles.page}>
      {contracts.length === 0 && (
        <p className={styles.empty}>No contracts — this show doesn't require one.</p>
      )}

      {contracts.map((contract) => (
        <ContractRow
          key={contract._id}
          contract={contract}
          onUpdate={updateContract}
          onArchive={archiveContract}
          onRename={renameContract}
          onGenerate={generateContract}
          isGenerating={generatingId === contract._id}
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
    </div>
  );
}
