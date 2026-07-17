import mongoose from "mongoose";
import { BASE_STATUS, CONTRACT_STATUS } from "../../shared/constants/builds.js";
import { RELEASE_MODES } from "../../shared/constants/schedule.js";

const { Schema } = mongoose;

// subdocument schemas
const buildEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "phase_completed",
        "phase_reopened",
        "contract_status_changed",
        "sis_released",
        "roster_changed",
      ],
      required: true,
    },
    date: { type: Date, required: true },
    phase: { type: String, enum: ["setup", "ticketing", "close"] },
    triggeredBy: { type: String },
    previousCompletionDate: { type: Date },
    from: { type: String },
    to: { type: String },
    value: { type: Schema.Types.Mixed },
    note: { type: String },
    contractId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

const contractSchema = new Schema({
  signee: { type: String, required: true },
  status: { type: String, enum: CONTRACT_STATUS, default: "to do" },
  folderId: { type: String, required: true },
  folderName: { type: String, required: true },
  lastCheckin: { type: Date },
  dateDrafted: { type: Date },
  dateSigned: { type: Date },
  dateFEC: { type: Date },
  archived: { type: Boolean, default: false },
  // At most one non-archived contract per show should have this set —
  // enforced by ShowsRepository.setMainContract, not by this schema.
  isMainContract: { type: Boolean, default: false },
});

const buildSchema = new Schema(
  {
    shouldShowInRoster: { type: Boolean, default: true },

    // --- Context ---
    notes: { type: String },
    gmailLinks: [{ type: String }],
    dateConfirmed: { type: Date, default: Date.now }, // automatically set to the date the show was created; can be updated

    // --- Setup ---
    showFolder: { type: String, enum: BASE_STATUS, default: "done" },
    calendarUpdated: { type: String, enum: BASE_STATUS, default: "to do" },
    bookingSpreadsheet: { type: String, enum: BASE_STATUS, default: "to do" },
    offerInFolder: { type: String, enum: BASE_STATUS, default: "to do" },
    packetSent: { type: String, enum: BASE_STATUS, default: "to do" },
    sisPopulated: { type: String, enum: BASE_STATUS, default: "to do" },
    dateSetupComplete: { type: Date }, // auto-set when Setup rollup hits 'done'
    // Freeform notes/links for this phase — not a rollup input, just a place
    // to record why something's blocked or stuck.
    setupComments: { type: String },

    // --- Ticketing ---
    tessitura: { type: String, enum: BASE_STATUS, default: "to do" },
    tnew: { type: String, enum: BASE_STATUS, default: "to do" },
    marketingAssetsCompiled: { type: String, enum: BASE_STATUS, default: "to do" },
    marketingAssetsLastCheckin: { type: Date },
    sisReleased: { type: String, enum: BASE_STATUS, default: "to do" },
    dateTicketingComplete: { type: Date }, // auto-set when Ticketing rollup hits 'done'
    ticketingComments: { type: String },

    // --- Close ---
    // Server-computed rollup of contracts[] — see deriveContractFieldStatus.
    // Not directly editable by clients.
    contract: { type: String, enum: BASE_STATUS, default: "n/a" },
    contracts: { type: [contractSchema], default: [] },
    livestream: { type: String, enum: BASE_STATUS, default: "n/a" },
    workbook: { type: String, enum: BASE_STATUS, default: "to do" },
    dateCloseComplete: { type: Date }, // auto-set when Close rollup hits 'done'
    closeComments: { type: String },

    // --- Audit log ---
    events: { type: [buildEventSchema], default: [] },
  },
  { _id: false }
);

const presaleSchema = new Schema(
  {
    name: { type: String, default: "Donor Presale" },
    startDateTime: { type: Date },
    endDateTime: { type: Date },
  },
  { _id: false }
);

const performanceSchema = new Schema(
  {
    date: { type: Date },
    doorTime: { type: Date }, // our epoch date is 2001-01-01 - we use the time potion only
    showTime: { type: Date }, // our epoch date is 2001-01-01 - we use the time potion only
    hasLivestream: { type: Boolean, default: false },
    performanceCode: { type: String },
  },
  { _id: false }
);

const embeddedVideoSchema = new Schema(
  {
    provider: { type: String, enum: ["YouTube", "Vimeo"], default: "YouTube" },
    id: { type: String },
  },
  { _id: false }
);

const contactSchema = new Schema(
  {
    name: { type: String },
    info: { type: String },
  },
  { _id: false }
);

const slidingScaleTierSchema = new Schema(
  {
    name: { type: String },
    min: { type: Number },
  },
  { _id: false }
);

const warningSchema = new Schema(
  {
    code: { type: String, required: true },
    message: { type: String, required: true },
    sectionAnchor: { type: String },
  },
  { _id: false }
);

// main "Show" schema
const ShowSchema = new Schema(
  {
    googleFolderId: { type: String, required: true, unique: true },
    artist: { type: String, required: true },
    date: { type: Date },
    isMulti: { type: Boolean, default: false },
    unparsed: { type: Boolean, default: false },
    canceled: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },

    build: { type: buildSchema, default: () => ({}) },

    // billing
    billing: {
      main: { type: String },
      sub1: { type: String },
      sub2: { type: String },
    },

    // contact(s)
    contact: [contactSchema],

    // drive
    drive: {
      folderIds: {
        marketingAssets: { type: String, default: null },
      },
      spreadsheetIds: {
        settlementWorkbook: { type: String, default: null },
        preExistingSheets: [{ id: String, name: String }],
      },
      documentIds: {
        marketingAssetsInfo: { type: String, default: null },
      },
    },

    // marketing assets
    marketingAssets: {
      urlArtistWebsite: { type: String },
      urlArtistFacebook: { type: String },
      urlArtistInstagram: { type: String },
      embeddedVideo: [embeddedVideoSchema],
    },

    // set length
    misc: {
      setLength: { type: String },
      other: { type: String },
    },

    // offer
    offer: {
      date: { type: Date },
      expiration: { type: Date },
    },

    // performances
    performances: [performanceSchema],

    // production
    production: {
      hospitality: {
        hospitalityType: {
          type: String,
          enum: ["light", "normal", "heavy", "see rider", "none"],
        },
        totalBuyout: { type: Number },
      },
      meals: {
        numPeople: { type: Number },
        numDays: { type: Number },
        dollarsPerPerson: { type: Number },
        totalBuyout: { type: Number },
      },
      accommodations: {
        numRooms: { type: Number },
        numNights: { type: Number },
        totalBuyout: { type: Number },
      },
      travel: {
        totalBuyout: { type: Number },
      },
      backline: {
        backlineType: {
          type: String,
          enum: ["no", "if needed", "yes", "in house", "buyout"],
        },
        totalBuyout: { type: Number },
      },
      merchCut: {
        type: String,
        enum: ["85% artist / 15% venue", "no merch commission"],
        default: "no merch commission",
      },
      numGuestListComps: { type: Number },
    },

    // schedule
    schedule: {
      releaseMode: { type: String, enum: RELEASE_MODES, default: "asap" },
      announceDateTime: { type: Date },
      onSaleDateTime: { type: Date },
      presales: [presaleSchema],
      notes: { type: String },
    },

    // terms
    terms: {
      main: {
        guarantee: { type: Number },
        backendType: {
          type: String,
          enum: ["plus", "vs", "none"],
          default: "none",
        },
        percentage: { type: Number, default: 0 },
        splitPoint: { type: Number, min: 0.01 },
      },
      livestream: {
        hasLivestream: { type: Boolean, default: false },
        ticketPrice: { type: Number },
        guarantee: { type: Number },
        backendType: {
          type: String,
          enum: ["plus", "vs", "none"],
          default: "none",
        },
        percentage: { type: Number, default: 0 },
        splitPoint: { type: Number, min: 0.01 },
      },
      educationalEvents: {
        description: { type: String },
      },
    },

    // ticketPrices
    ticketPrices: {
      ga: {
        advance: { type: Number },
        dos: { type: Number },
      },
      slidingScaleTiers: [slidingScaleTierSchema],
      premium: {
        advance: { type: Number },
        dos: { type: Number },
      },
      vip: {
        advance: { type: Number },
        dos: { type: Number },
      },
      details: { type: String },
    },

    // validation
    validation: {
      warnings: [warningSchema],
    },
  },
  {
    timestamps: true,
    collection: "Shows",
  }
);

// virtuals
ShowSchema.virtual("validation.hasWarnings").get(function () {
  return (this.validation?.warnings?.length ?? 0) > 0;
});

// model
const Show = mongoose.model("Show", ShowSchema, "Shows");
export default Show;
