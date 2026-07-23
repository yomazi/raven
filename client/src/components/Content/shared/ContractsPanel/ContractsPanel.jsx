import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import { useSyncContractBookingSheet } from "@hooks/useBookingSyncIssues.js";
import { useDriveFiles } from "@hooks/useDriveFiles.js";
import { useImportableContractFolders } from "@hooks/useImportableContractFolders.js";
import { useShowContracts } from "@hooks/useShowContracts.js";
import { useToast } from "@hooks/useToast.js";
import * as Switch from "@radix-ui/react-switch";
import { CONTRACT_STATUS } from "@shared/constants/builds.js";
import SvgContract from "@svg/contract_google.svg?react";
import SvgCopyOneCell from "@svg/copy-one-cell_rg.svg?react";
import SvgEdit from "@svg/edit_google.svg?react";
import { useState } from "react";
import { isPdfFile } from "../../../../utilities/contractPdf.js";
import ContractTermsModal from "./ContractTermsModal.jsx";
import styles from "./ContractsPanel.module.css";
import ParseContractModal from "./ParseContractModal.jsx";

const CONTRACT_STATUS_LABELS = Object.fromEntries(CONTRACT_STATUS.map((s) => [s, s]));

const SYNC_FAILURE_MESSAGES = {
  not_found: "Show or contract not found.",
  no_show_date: "This show has no date set.",
  archived: "This contract is archived.",
  no_spreadsheet_for_year: "No booking spreadsheet is registered for this show's year.",
  no_status_column: "Couldn't find a Status/FEC column on that sheet tab.",
  no_match: "No matching row found in the booking spreadsheet.",
  ambiguous_match: "Found more than one possible row — couldn't tell which one is correct.",
};

function formatDate(value) {
  return value ? new Date(value).toISOString().split("T")[0] : "";
}

// Mirrors RosterGrid.jsx's single-cell copyLink (includeDate: false) — a
// <table><td> wrapping the link so pasting into a spreadsheet or email
// keeps it as a real hyperlink, not just plain text.
function copyContractLink(signee, folderId) {
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const html = `<table><tr><td><a href="${url}">${signee}</a></td></tr></table>`;
  navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([signee], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

// ---------------------------------------------------------------------------
// ContractRow — one active contract: editable signee/status/check-in, the
// auto-populated drafted/signed/FEC dates, a link to its Drive subfolder,
// and an Archive action.
// ---------------------------------------------------------------------------

function ContractRow({
  googleFolderId,
  contract,
  onUpdate,
  onArchive,
  onRename,
  onGenerate,
  onSetMain,
  onApplySection,
  onApplyAllSections,
  isGenerating,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(contract.signee ?? "");
  const [draftComments, setDraftComments] = useState(contract.comments ?? "");
  const [isParseOpen, setIsParseOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const { data: files = [] } = useDriveFiles(contract.folderId);
  const hasPdf = files.some(isPdfFile);
  const { mutate: syncBookingSheet, isPending: isSyncing } = useSyncContractBookingSheet();
  const toast = useToast();

  function handleSync() {
    syncBookingSheet(
      { googleFolderId, contractId: contract._id },
      {
        onSuccess: (result) => {
          if (result.synced) {
            toast({
              description: `Synced to "${result.sheetTitle}", row ${result.row}.`,
              duration: 4000,
            });
          } else {
            toast({
              title: "Couldn't sync",
              description: SYNC_FAILURE_MESSAGES[result.reason] ?? result.reason,
              duration: 6000,
            });
          }
        },
        onError: (err) => {
          toast({
            title: "Couldn't sync",
            description: err.response?.data?.error ?? err.message,
            duration: 6000,
          });
        },
      }
    );
  }

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

  function commitComments() {
    if (draftComments !== (contract.comments ?? "")) {
      onUpdate(contract._id, { comments: draftComments });
    }
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
            <button
              className={styles.copyButton}
              onClick={() => copyContractLink(contract.signee, contract.folderId)}
              title="Copy contract name and link"
            >
              <SvgCopyOneCell className={styles.copyIcon} />
            </button>
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
        <div className={styles.rowActions}>
          <button className={styles.termsButton} onClick={() => setIsTermsOpen(true)}>
            Terms
          </button>
          {hasPdf && (
            <button className={styles.parseButton} onClick={() => setIsParseOpen(true)}>
              Parse
            </button>
          )}
          <button className={styles.removeButton} onClick={() => onArchive(contract._id)}>
            Archive
          </button>
        </div>
      </div>

      <ParseContractModal
        open={isParseOpen}
        onOpenChange={setIsParseOpen}
        contract={contract}
        files={files}
        onApplySection={onApplySection}
      />

      <ContractTermsModal
        open={isTermsOpen}
        onOpenChange={setIsTermsOpen}
        contract={contract}
        onSave={onApplyAllSections}
      />

      <div className={styles.fieldGridRow}>
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
              <span className={styles.value}>
                {new Date(contract.dateFEC).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        <div className={styles.mainToggle}>
          <span>
            {contract.isMainContract ? "This is the main contract" : "Set as main contract"}
          </span>
          <Switch.Root
            className={styles.switchRoot}
            checked={!!contract.isMainContract}
            onCheckedChange={(checked) => onSetMain(contract._id, checked)}
          >
            <Switch.Thumb className={styles.switchThumb} />
          </Switch.Root>
        </div>
      </div>

      <div className={styles.commentsBlock}>
        <span className={styles.label}>Notes</span>
        <textarea
          className={styles.textarea}
          value={draftComments}
          onChange={(e) => setDraftComments(e.target.value)}
          onBlur={commitComments}
          rows={2}
        />
      </div>

      <div className={styles.syncRow}>
        <button className={styles.syncButton} onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? "Syncing…" : "Sync Booking Sheet"}
        </button>
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
    setMainContract,
    applyContractSection,
    applyContractSections,
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
          googleFolderId={googleFolderId}
          contract={contract}
          onUpdate={updateContract}
          onArchive={archiveContract}
          onRename={renameContract}
          onGenerate={generateContract}
          onSetMain={setMainContract}
          onApplySection={applyContractSection}
          onApplyAllSections={applyContractSections}
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
