import log from "../logging/log.js";
import ShowsRepository from "./shows.repository.js";

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

  static async upsertOne(driveShow) {
    const mapped = ShowsService.#mapDriveShowToDocument(driveShow);
    return ShowsRepository.upsertOne(mapped);
  }

  static async upsertMany(driveShows, fromDate = null) {
    const mapped = driveShows.map(ShowsService.#mapDriveShowToDocument);
    const result = await ShowsRepository.upsertMany(mapped);

    const googleFolderIds = mapped.map((s) => s.googleFolderId);
    const deletedCount = await ShowsRepository.softDeleteWhereNotIn(googleFolderIds, fromDate);

    if (deletedCount > 0) {
      log.warn("softDelete", `${deletedCount} show(s) soft-deleted`, { fromDate });
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
        if (p.hasLivestream && !show.terms?.livestream?.hasLivestream) {
          warnings.push({
            code: `LIVESTREAM_TERMS_MISSING_${i}`,
            message: `Performance ${i + 1} has a livestream but no livestream terms are defined.`,
            sectionAnchor: "terms",
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
      if (schedule.releaseAsap && schedule.presales?.length > 0) {
        warnings.push({
          code: "ASAP_WITH_PRESALES",
          message: "Release ASAP is true but presales are defined.",
          sectionAnchor: "schedule",
        });
      }
      if (!schedule.releaseAsap && !schedule.announceDateTime) {
        warnings.push({
          code: "MISSING_ANNOUNCE_DATE",
          message: "Announce date is required when not releasing ASAP.",
          sectionAnchor: "schedule",
        });
      }
      if (!schedule.releaseAsap && !schedule.onSaleDateTime) {
        warnings.push({
          code: "MISSING_ON_SALE_DATE",
          message: "On sale date is required when not releasing ASAP.",
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

    // terms
    if (show.terms?.livestream?.hasLivestream) {
      const hasLivestreamPerformance = show.performances?.some((p) => p.hasLivestream);
      if (!hasLivestreamPerformance) {
        warnings.push({
          code: "LIVESTREAM_NO_PERFORMANCE",
          message: "Livestream terms are defined but no performance is marked as a livestream.",
          sectionAnchor: "performances",
        });
      }
      if (!show.terms.livestream.ticketPrice) {
        warnings.push({
          code: "LIVESTREAM_NO_TICKET_PRICE",
          message: "Livestream is enabled but no ticket price is set.",
          sectionAnchor: "terms",
        });
      }
    }

    return warnings;
  }

  static async patch(googleFolderId, updates) {
    // Apply updates
    const show = await ShowsRepository.patch(googleFolderId, updates);
    if (!show) return null;

    // Recompute warnings on every save
    const warnings = ShowsService.#computeWarnings(show);
    const updated = await ShowsRepository.patch(googleFolderId, {
      "validation.warnings": warnings,
    });

    log.info("patch", "Show patched", { googleFolderId, warnings: warnings.length });
    return updated;
  }
}

export default ShowsService;
