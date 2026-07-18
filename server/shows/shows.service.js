import log from "../logging/log.js";
import { deriveContractFieldStatus } from "../../shared/functions/builds.js";
import ShowsEvents from "./shows.events.js";
import ShowsRepository from "./shows.repository.js";
import {
  flatten,
  processBuildSideEffects,
  processPhaseCompletions,
  processScheduleSideEffects,
} from "./shows.utilities.js";

class ShowsService {
  static #mapDriveShowToDocument(driveShow) {
    return {
      googleFolderId: driveShow.driveId,
      artist: driveShow.artist,
      date: driveShow.date,
      isMulti: driveShow.multipleShows,
      unparsed: driveShow.unparsed ?? false,
      deleted: false,
    };
  }

  // Seeded only on first insert (see ShowsRepository's setOnInsert) so every
  // show starts with one performance to fill in, matching the Properties
  // UI's own "+ Add Performance" default shape.
  static #defaultPerformance(date) {
    return { date, doorTime: null, showTime: null, hasLivestream: false, performanceCode: "" };
  }

  static async upsertOne(driveShow) {
    const mapped = ShowsService.#mapDriveShowToDocument(driveShow);
    const show = await ShowsRepository.upsertOne(mapped, {
      performances: [ShowsService.#defaultPerformance(mapped.date)],
    });
    if (show) {
      ShowsEvents.emitChanged({
        googleFolderId: mapped.googleFolderId,
        changedFields: ["date", "artist"],
      });
    }
    return show;
  }

  static async upsertMany(driveShows, fromDate = null) {
    const mapped = driveShows.map(ShowsService.#mapDriveShowToDocument);
    const result = await ShowsRepository.upsertMany(mapped, (show) => ({
      performances: [ShowsService.#defaultPerformance(show.date)],
    }));

    const googleFolderIds = mapped.map((s) => s.googleFolderId);
    const deletedCount = await ShowsRepository.softDeleteWhereNotIn(googleFolderIds, fromDate);

    if (deletedCount > 0) {
      log.warn("softDelete", `${deletedCount} show(s) soft-deleted`, { fromDate });
    }

    // Fire for every synced show — listeners cheaply no-op when nothing
    // relevant actually changed, so we don't need to diff here.
    for (const show of mapped) {
      ShowsEvents.emitChanged({
        googleFolderId: show.googleFolderId,
        changedFields: ["date", "artist"],
      });
    }

    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      deletedCount,
    };
  }

  static async getAll() {
    return ShowsRepository.findAll();
  }

  static async getByGoogleFolderId(googleFolderId) {
    return ShowsRepository.findByGoogleFolderId(googleFolderId);
  }

  static async updateDriveAssets(googleFolderId, driveUpdate) {
    return ShowsRepository.updateDriveAssets(googleFolderId, driveUpdate);
  }

  static async softDelete(googleFolderId) {
    const show = await ShowsRepository.softDelete(googleFolderId);
    if (show) {
      ShowsEvents.emitChanged({ googleFolderId, changedFields: ["deleted"] });
    }
    return show;
  }

  // Direct, targeted contract-array mutations — bypass the generic patch
  // pipeline (no side-effect date stamping needed for create/archive), but
  // still keep the computed build.contract rollup in sync.
  static async addContract(googleFolderId, { signee, folderId, folderName, isMainContract = false }) {
    const show = await ShowsRepository.addContract(googleFolderId, {
      signee,
      folderId,
      folderName,
      status: "to do",
      isMainContract,
    });
    if (!show) return null;

    const contracts = show.build?.contracts ?? [];
    const result = await ShowsRepository.patch(googleFolderId, {
      "build.contract": deriveContractFieldStatus(contracts),
    });

    const newContract = contracts[contracts.length - 1];
    ShowsEvents.emitChanged({
      googleFolderId,
      contractId: newContract?._id,
      changedFields: ["membership"],
    });

    return result;
  }

  static async archiveContract(googleFolderId, contractId) {
    const show = await ShowsRepository.setContractArchived(googleFolderId, contractId, true);
    if (!show) return null;

    const contracts = show.build?.contracts ?? [];
    const result = await ShowsRepository.patch(googleFolderId, {
      "build.contract": deriveContractFieldStatus(contracts),
    });

    ShowsEvents.emitChanged({ googleFolderId, contractId, changedFields: ["membership"] });

    return result;
  }

  static async setContractStatus(googleFolderId, contractId, status) {
    const show = await ShowsRepository.setContractStatus(googleFolderId, contractId, status);
    if (!show) return null;

    const contracts = show.build?.contracts ?? [];
    const result = await ShowsRepository.patch(googleFolderId, {
      "build.contract": deriveContractFieldStatus(contracts),
    });

    ShowsEvents.emitChanged({ googleFolderId, contractId, changedFields: ["status"] });

    return result;
  }

  // Renaming doesn't affect status/archived, so no rollup recompute is needed
  // here (unlike addContract/archiveContract).
  static async renameContract(googleFolderId, contractId, { signee, folderName }) {
    const result = await ShowsRepository.renameContract(googleFolderId, contractId, {
      signee,
      folderName,
    });
    if (result) {
      ShowsEvents.emitChanged({ googleFolderId, contractId, changedFields: ["signee"] });
    }
    return result;
  }

  // Doesn't affect status/archived/rollup — just which one contract is
  // flagged main. Turning one on is exclusive (enforced atomically by the
  // repository); turning one off is a show having no main contract at all,
  // which is allowed, so it only ever touches the target contract.
  static async setMainContract(googleFolderId, contractId, isMainContract) {
    const result = isMainContract
      ? await ShowsRepository.setMainContract(googleFolderId, contractId)
      : await ShowsRepository.clearMainContract(googleFolderId, contractId);
    if (result) {
      ShowsEvents.emitChanged({ googleFolderId, contractId, changedFields: ["isMainContract"] });
    }
    return result;
  }

  static #computeWarnings(show) {
    const warnings = [];

    // contacts
    if (!show.contact || show.contact.length === 0) {
      warnings.push({
        code: "NO_CONTACT",
        message: "At least one contact is required.",
        sectionAnchor: "contact",
      });
    }

    // performances
    if (!show.performances || show.performances.length === 0) {
      warnings.push({
        code: "NO_PERFORMANCES",
        message: "At least one performance is required.",
        sectionAnchor: "performances",
      });
    } else {
      show.performances.forEach((p, i) => {
        const missing = [];

        if (!p.doorTime) missing.push("door time");
        if (!p.showTime) missing.push("show time");
        if (!p.performanceCode) missing.push("performance code");
        if (missing.length > 0) {
          warnings.push({
            code: `INCOMPLETE_PERFORMANCE_${i}`,
            message: `Performance ${i + 1} is missing: ${missing.join(", ")}.`,
            sectionAnchor: "performances",
          });
        }
        if (p.doorTime && p.showTime && p.doorTime >= p.showTime) {
          warnings.push({
            code: `DOOR_AFTER_SHOW_${i}`,
            message: `Performance ${i + 1}: door time must be before show time.`,
            sectionAnchor: "performances",
          });
        }
      });

      if (show.isMulti && show.performances.length < 2) {
        warnings.push({
          code: "MULTI_SINGLE_PERFORMANCE",
          message: "This show is marked as multiple shows but only has one performance defined.",
          sectionAnchor: "performances",
        });
      }
    }

    // schedule
    const { schedule } = show;
    if (schedule) {
      if (schedule.releaseMode === "asap" && schedule.presales?.length > 0) {
        warnings.push({
          code: "ASAP_WITH_PRESALES",
          message: "Release ASAP is selected but presales are defined.",
          sectionAnchor: "schedule",
        });
      }
      if (schedule.releaseMode === "on-schedule" && !schedule.announceDateTime) {
        warnings.push({
          code: "MISSING_ANNOUNCE_DATE",
          message: "Announce date is required when releasing on schedule.",
          sectionAnchor: "schedule",
        });
      }
      if (schedule.releaseMode === "on-schedule" && !schedule.onSaleDateTime) {
        warnings.push({
          code: "MISSING_ON_SALE_DATE",
          message: "On sale date is required when releasing on schedule.",
          sectionAnchor: "schedule",
        });
      }
      if (schedule.presales?.length > 1) {
        const donorPresales = schedule.presales.filter((p) => p.name === "Donor Presale");
        if (donorPresales.length > 1) {
          warnings.push({
            code: "DUPLICATE_DONOR_PRESALE",
            message: "More than one presale is named 'Donor Presale'.",
            sectionAnchor: "schedule",
          });
        }
      }
      schedule.presales?.forEach((presale, i) => {
        if (
          presale.startDateTime &&
          presale.endDateTime &&
          presale.startDateTime >= presale.endDateTime
        ) {
          warnings.push({
            code: `PRESALE_DATES_INVALID_${i}`,
            message: `Presale "${presale.name}": start must be before end.`,
            sectionAnchor: "schedule",
          });
        }
        if (
          presale.endDateTime &&
          schedule.onSaleDateTime &&
          presale.endDateTime > schedule.onSaleDateTime
        ) {
          warnings.push({
            code: `PRESALE_AFTER_ON_SALE_${i}`,
            message: `Presale "${presale.name}": end date must be on or before the on sale date.`,
            sectionAnchor: "schedule",
          });
        }
      });
    }

    return warnings;
  }

  static async patch(googleFolderId, updates) {
    // 1. Fetch current show for side-effect comparisons
    const current = await ShowsRepository.findByGoogleFolderId(googleFolderId);
    if (!current) return null;

    const previousBuild = current.build?.toObject?.() ?? current.build ?? {};
    const previousSchedule = current.schedule?.toObject?.() ?? current.schedule ?? {};

    // 2. Flatten updates so all checks use dot-notation keys consistently
    const flatUpdates = flatten(updates);

    // 3. Compute build side effects (extra fields + pre-patch events)
    const { extra: preExtra, events: preEvents } = processBuildSideEffects(
      flatUpdates,
      previousBuild
    );

    // 3b. Compute schedule side effects (extra fields)
    const { extra: scheduleExtra } = processScheduleSideEffects(flatUpdates, previousSchedule);

    const mergedUpdates = { ...flatUpdates, ...preExtra, ...scheduleExtra };

    // 4. Write the patch
    const show = await ShowsRepository.patch(googleFolderId, mergedUpdates);
    if (!show) return null;

    const updatedBuild = show.build?.toObject?.() ?? show.build ?? {};

    // 5. Compute phase completion side effects (extra fields + post-patch events)
    const { extra: postExtra, events: postEvents } = processPhaseCompletions(
      updatedBuild,
      previousBuild
    );

    const allEvents = [...preEvents, ...postEvents];

    // 6. Recompute warnings
    const warnings = ShowsService.#computeWarnings(show);

    // 7. Write second patch if needed (phase dates + warnings)
    const needsSecondPatch =
      Object.keys(postExtra).length > 0 ||
      warnings.length !== (current.validation?.warnings?.length ?? 0);

    let finalShow = show;

    if (needsSecondPatch) {
      finalShow = await ShowsRepository.patch(googleFolderId, {
        ...postExtra,
        "validation.warnings": warnings,
      });
    } else {
      await ShowsRepository.patch(googleFolderId, {
        "validation.warnings": warnings,
      });
    }

    // 8. Push events separately via $push to avoid clobbering the array
    if (allEvents.length > 0) {
      await ShowsRepository.pushBuildEvents(googleFolderId, allEvents);
    }

    // patch() is the generic write path used by most of the client's editing
    // UI (e.g. the contract status dropdown patches the whole
    // build.contracts array rather than calling setContractStatus), so we
    // can't reliably tell from flatUpdates' keys alone whether something a
    // live report cares about changed — array-valued fields like
    // build.contracts show up as one opaque key, not per-field paths. Always
    // emit; listeners (live reports) diff against their own cache and no-op
    // cheaply when nothing they render actually changed.
    ShowsEvents.emitChanged({ googleFolderId, changedFields: Object.keys(flatUpdates) });

    log.info("patch", "Show patched", {
      googleFolderId,
      warnings: warnings.length,
      events: allEvents.length,
    });

    return finalShow;
  }
}

export default ShowsService;
