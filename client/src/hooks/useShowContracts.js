// client/src/hooks/useShowContracts.js
//
// Contract records are mutated immediately (not staged in the deferred
// Properties-page draft) — creation/archival touch Drive and go through
// their own endpoints, and in-place edits reuse the show's live query cache
// so they never race with a stale form snapshot. See useShowProperties.js's
// save() for why build.contracts is deliberately excluded from that draft.

import {
  archiveContractFolder,
  createContractFolder,
  generateContractDoc,
  importContractFolder,
  renameContractFolder,
  setMainContract as setMainContractApi,
} from "@api/drive.api.js";
import { usePatchShow } from "@hooks/usePatchShow.js";
import { useShowById } from "@hooks/useShowById.js";
import { useToast } from "@hooks/useToast.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

// Immutable deep-merge at a nested path, preserving every sibling not
// touched by `values` at each level along the way (e.g. applying
// production.hospitality must not clobber production.meals).
function mergeAtPath(obj, path, values) {
  if (path.length === 0) return { ...obj, ...values };
  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: mergeAtPath(obj?.[head] ?? {}, rest, values),
  };
}

export function useShowContracts(googleFolderId) {
  const { data: show } = useShowById(googleFolderId);
  const allContracts = useMemo(() => show?.build?.contracts ?? [], [show]);
  const contracts = allContracts.filter((c) => !c.archived);

  const toast = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  const { mutate: patch, mutateAsync: patchAsync } = usePatchShow(googleFolderId);

  const updateContract = useCallback(
    (contractId, changes) => {
      const updated = allContracts.map((c) =>
        String(c._id) === String(contractId) ? { ...c, ...changes } : c
      );
      patch(
        { "build.contracts": updated },
        {
          onError: () => {
            toast({
              title: "Save failed",
              description: "Could not update the contract. Please try again.",
              duration: 5000,
            });
          },
        }
      );
    },
    [allContracts, patch, toast]
  );

  // Writes one parsed section (e.g. terms.main, production.hospitality)
  // onto a contract, merging into whatever's already there at that path so
  // sibling sections aren't clobbered. Unlike updateContract, this awaits
  // the save so the "Apply to Contract" button can reflect success/failure
  // instead of always reporting success immediately (mutate() is
  // fire-and-forget).
  const applyContractSection = useCallback(
    async (contractId, path, values) => {
      if (!googleFolderId) return;
      const updated = allContracts.map((c) =>
        String(c._id) === String(contractId) ? mergeAtPath(c, path, values) : c
      );
      try {
        await patchAsync({ "build.contracts": updated });
      } catch (err) {
        toast({
          title: "Could not apply to contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
        throw err;
      }
    },
    [allContracts, googleFolderId, patchAsync, toast]
  );

  // Writes several sections at once (e.g. the Contract Terms modal's single
  // Save button) in one request instead of one PATCH per tile — folds each
  // section's merge into the next so none of them clobber each other.
  const applyContractSections = useCallback(
    async (contractId, sections) => {
      if (!googleFolderId) return;
      const updated = allContracts.map((c) => {
        if (String(c._id) !== String(contractId)) return c;
        return sections.reduce((acc, { path, values }) => mergeAtPath(acc, path, values), c);
      });
      try {
        await patchAsync({ "build.contracts": updated });
      } catch (err) {
        toast({
          title: "Could not save contract terms",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
        throw err;
      }
    },
    [allContracts, googleFolderId, patchAsync, toast]
  );

  const renameContract = useCallback(
    async (contractId, signee) => {
      if (!signee?.trim() || !googleFolderId) return;
      setIsRenaming(true);
      try {
        const { show: updatedShow } = await renameContractFolder(
          googleFolderId,
          contractId,
          signee.trim()
        );
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
      } catch (err) {
        toast({
          title: "Could not rename contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      } finally {
        setIsRenaming(false);
      }
    },
    [googleFolderId, queryClient, toast]
  );

  const generateContract = useCallback(
    async (contractId) => {
      if (!googleFolderId) return;
      setGeneratingId(contractId);
      try {
        const { show: updatedShow } = await generateContractDoc(googleFolderId, contractId);
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
        toast({
          title: "Contract doc generated",
          description: "The template copy was added to the contract's folder.",
          duration: 5000,
        });
      } catch (err) {
        toast({
          title: "Could not generate contract doc",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      } finally {
        setGeneratingId(null);
      }
    },
    [googleFolderId, queryClient, toast]
  );

  const addContract = useCallback(
    async (signee) => {
      if (!signee?.trim() || !googleFolderId) return;
      setIsAdding(true);
      try {
        const { show: updatedShow } = await createContractFolder(googleFolderId, signee.trim());
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
      } catch (err) {
        toast({
          title: "Could not create contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      } finally {
        setIsAdding(false);
      }
    },
    [googleFolderId, queryClient, toast]
  );

  const archiveContract = useCallback(
    async (contractId) => {
      if (!googleFolderId) return;
      try {
        const { show: updatedShow } = await archiveContractFolder(googleFolderId, contractId);
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
      } catch (err) {
        toast({
          title: "Could not archive contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      }
    },
    [googleFolderId, queryClient, toast]
  );

  const setMainContract = useCallback(
    async (contractId, isMainContract) => {
      if (!googleFolderId) return;
      try {
        const { show: updatedShow } = await setMainContractApi(
          googleFolderId,
          contractId,
          isMainContract
        );
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
      } catch (err) {
        toast({
          title: "Could not update main contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      }
    },
    [googleFolderId, queryClient, toast]
  );

  const importContract = useCallback(
    async (subfolderId) => {
      if (!subfolderId || !googleFolderId) return;
      setIsImporting(true);
      try {
        const { show: updatedShow } = await importContractFolder(googleFolderId, subfolderId);
        if (updatedShow) queryClient.setQueryData(["show", googleFolderId], updatedShow);
      } catch (err) {
        toast({
          title: "Could not import contract",
          description: err.message ?? "Please try again.",
          duration: 5000,
        });
      } finally {
        setIsImporting(false);
      }
    },
    [googleFolderId, queryClient, toast]
  );

  return {
    contracts,
    updateContract,
    applyContractSection,
    applyContractSections,
    renameContract,
    isRenaming,
    generateContract,
    generatingId,
    addContract,
    archiveContract,
    isAdding,
    setMainContract,
    importContract,
    isImporting,
  };
}
