import { EventEmitter } from "node:events";

const emitter = new EventEmitter();

// Internal domain events for Show/contract field changes. Listeners (e.g.
// live reports) subscribe without shows.service.js needing to know they
// exist — keeps the modules decoupled.
class ShowsEvents {
  static onChanged(handler) {
    emitter.on("changed", handler);
  }

  // changedFields: array of "date" | "artist" | "signee" | "status" | "membership"
  static emitChanged({ googleFolderId, contractId = null, changedFields }) {
    emitter.emit("changed", { googleFolderId, contractId, changedFields });
  }
}

export default ShowsEvents;
