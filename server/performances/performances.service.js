const { google } = require("googleapis");

const DriveRepository = require("./performances.drive.repository.js");

import { ROOT_FOLDER_ID } from "../utilities/constants.js";

class PerformancesService {
  static async fetchPerformances(req, res, next) {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Start at the root folder
    const programFolders = await DriveRepository.getFolderChildren(ROOT_FOLDER_ID);

    // Filter folders named like "YYYY Program" >= current year
    const upcomingPrograms = programFolders
      .filter((f) => /^\d{4} Program$/.test(f.name))
      .filter((f) => parseInt(f.name.slice(0, 4)) >= currentYear);

    let allPerformances = [];

    for (const program of upcomingPrograms) {
      const monthFolders = await getFolderChildren(program.id);
      const futureMonthFolders = monthFolders
        .filter((f) => /^\d{4}-\d{2} .+$/.test(f.name))
        .filter((f) => {
          const [year, month] = f.name.split(" ")[0].split("-").map(Number);
          const folderDate = new Date(year, month - 1, 1);
          return folderDate >= today;
        });

      for (const monthFolder of futureMonthFolders) {
        const showFolders = await getFolderChildren(monthFolder.id);

        const filteredShows = showFolders
          .filter((f) => /^\d{2}-\d{2}-\d{2} .+/.test(f.name)) // matches MM-DD-YY <show>
          .map((f) => {
            const nameParts = f.name.split(" ");
            const datePart = nameParts[0]; // "MM-DD-YY"
            const artistParts = nameParts.slice(1);

            let isMulti = false;
            if (artistParts[artistParts.length - 1] === "(multi)") {
              isMulti = true;
              artistParts.pop();
            }

            return {
              folderId: f.id,
              artist: artistParts.join(" "),
              isMulti,
            };
          });

        allPerformances = allPerformances.concat(filteredShows);
      }
    }

    return allPerformances;
  }
}

module.exports = PerformancesService;
