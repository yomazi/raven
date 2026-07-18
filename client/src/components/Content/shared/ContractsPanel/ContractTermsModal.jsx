// client/src/components/Content/shared/ContractsPanel/ContractTermsModal.jsx
//
// Direct inspect/edit view for a single contract's terms — no parsing
// involved, just the same tiles ParseContractModal reviews parsed data
// against, bound straight to the contract's live values. One Save button
// commits every tile at once.

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SvgClose from "@svg/close_google.svg?react";
import { FIELD_SECTIONS, pickSectionValues, setAtPath } from "./contractTermsFields.js";
import styles from "./ContractTermsModal.module.css";
import ContractTermsTiles from "./ContractTermsTiles.jsx";

/**
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   contract      full contract subdocument ({ _id, signee, terms, production, payment, ... })
 *   onSave        (contractId, sections: [{ path, values }]) => Promise —
 *                 writes every section's edited fields onto the contract
 */
export default function ContractTermsModal({ open, onOpenChange, contract, onSave }) {
  const [draft, setDraft] = useState(contract ?? null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(contract ?? null);
    setIsSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?._id]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: (sections) => onSave(contract._id, sections),
    onSuccess: () => setIsSaved(true),
  });

  function handleFieldChange(path, key, value) {
    setDraft((prev) => setAtPath(prev ?? {}, path, key, value));
    setIsSaved(false);
  }

  function handleSave() {
    const sections = FIELD_SECTIONS.map((section) => ({
      path: section.path,
      values: pickSectionValues(section, draft),
    }));
    save(sections);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Close asChild>
            <button className={styles.closeButton} aria-label="Close">
              <SvgClose className={styles.closeIcon} />
            </button>
          </Dialog.Close>

          <Dialog.Title className={styles.title}>
            Contract Terms{contract?.signee ? `: ${contract.signee}` : ""}
          </Dialog.Title>

          <ContractTermsTiles data={draft} onFieldChange={handleFieldChange} showApplyButtons={false} />

          <div className={styles.actions}>
            <button className={styles.btnSave} onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : isSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
