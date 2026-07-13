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
} from "@api/drive.api.js";
import { usePatchShow } from "@hooks/usePatchShow.js";
import { useShowById } from "@hooks/useShowById.js";
import { useToast } from "@hooks/useToast.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

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

  const { mutate: patch } = usePatchShow(googleFolderId);

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
    renameContract,
    isRenaming,
    generateContract,
    generatingId,
    addContract,
    archiveContract,
    isAdding,
    importContract,
    isImporting,
  };
}
