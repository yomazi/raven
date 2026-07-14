// client/src/utilities/contractPdf.js
//
// Contract PDFs filed into a contract's Drive subfolder follow a versioned
// naming convention (see GmailPanel_config.js DOCTYPES.prg "contract",
// stages: "draft+FEC"):
//
//   prg.contract.draft.1 - ...       first draft
//   prg.contract.draft.2 - ...       later drafts
//   prg.contract.FEC - ...           fully executed
//   prg.contract.FEC.update.1 - ...  post-execution amendments
//
// This ranks filenames by that lifecycle so the "most recent" version can be
// picked out: any draft < FEC < any FEC update, and higher numbers are later
// within draft/update.

const PDF_MIME = "application/pdf";

const DRAFT_RE = /^prg\.contract\.draft\.(\d+)\s*-/i;
const FEC_UPDATE_RE = /^prg\.contract\.fec\.update\.(\d+)\s*-/i;
const FEC_RE = /^prg\.contract\.fec\s*-/i;

const FEC_RANK = 1_000_000;
const FEC_UPDATE_RANK = 2_000_000;

// Returns a sortable rank (higher = more recent), or null if the filename
// doesn't follow the known contract naming convention.
export function rankContractFilename(name) {
  const updateMatch = name.match(FEC_UPDATE_RE);
  if (updateMatch) return FEC_UPDATE_RANK + parseInt(updateMatch[1], 10);

  if (FEC_RE.test(name)) return FEC_RANK;

  const draftMatch = name.match(DRAFT_RE);
  if (draftMatch) return parseInt(draftMatch[1], 10);

  return null;
}

export function isPdfFile(file) {
  return file?.mimeType === PDF_MIME;
}

// PDFs sorted most-recent-first. Files that follow the naming convention
// sort ahead of ones that don't (rank null treated as -1); ties keep
// original order.
export function sortContractPdfsByRecency(files) {
  return (files ?? [])
    .filter(isPdfFile)
    .map((file, index) => ({ file, index, rank: rankContractFilename(file.name) ?? -1 }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((entry) => entry.file);
}

export function getMostRecentContractPdf(files) {
  return sortContractPdfsByRecency(files)[0] ?? null;
}
