import { useEffect, useState } from "react";
import useShowsStore from "../../store/useShowsStore.js";
import styles from "./Overlay.module.css";

const LOADERS = [
  { tag: "l-helix", props: { size: 80, speed: 2.5 } },
  { tag: "l-waveform", props: { size: 80, speed: 1 } },
  { tag: "l-infinity", props: { size: 80, speed: 1.3 } },
  { tag: "l-mirage", props: { size: 80, speed: 2.5 } },
  { tag: "l-pulsar", props: { size: 80, speed: 1.75 } },
  { tag: "l-ring", props: { size: 80, speed: 2 } },
  { tag: "l-ring-2", props: { size: 80, speed: 0.65 } },
  { tag: "l-dot-wave", props: { size: 80, speed: 1 } },
  { tag: "l-dot-pulse", props: { size: 80, speed: 1.25 } },
  { tag: "l-dot-stream", props: { size: 80, speed: 2.5 } },
  { tag: "l-bouncy", props: { size: 80, speed: 1.75 } },
  { tag: "l-bouncy-arc", props: { size: 80, speed: 0.9 } },
  { tag: "l-leapfrog", props: { size: 80, speed: 2.5 } },
  { tag: "l-squircle", props: { size: 80, speed: 0.9 } },
  { tag: "l-trefoil", props: { size: 80, speed: 1.4 } },
  { tag: "l-momentum", props: { size: 80, speed: 1.1 } },
  { tag: "l-zoomies", props: { size: 80, speed: 1.4 } },
  { tag: "l-hatch", props: { size: 80, speed: 3.5 } },
  { tag: "l-jelly", props: { size: 80, speed: 0.9 } },
  { tag: "l-jelly-triangle", props: { size: 80, speed: 1.25 } },
  { tag: "l-tailspin", props: { size: 80, speed: 0.9 } },
  { tag: "l-ping", props: { size: 80, speed: 2 } },
  { tag: "l-ripples", props: { size: 80, speed: 1 } },
  { tag: "l-quantum", props: { size: 80, speed: 1.75 } },
  { tag: "l-reuleaux", props: { size: 80, speed: 1.2 } },
  { tag: "l-hourglass", props: { size: 80, speed: 1.75 } },
  { tag: "l-orbit", props: { size: 80, speed: 1.2 } },
  { tag: "l-spiral", props: { size: 80, speed: 1 } },
  { tag: "l-grid", props: { size: 80, speed: 1 } },
  { tag: "l-cardio", props: { size: 80, speed: 2 } },
  { tag: "l-chaoticOrbit", props: { size: 80, speed: 1.5 } },
  { tag: "l-superballs", props: { size: 80, speed: 1.4 } },
  { tag: "l-newtons-cradle", props: { size: 80, speed: 1.4 } },
];

// Module-level promise — registers all ldrs custom elements once,
// shared across every render of this component.
const ldrsReady = import("ldrs").then((ldrs) => {
  LOADERS.forEach(({ tag }) => {
    const fnName = tag.replace(/^l-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (typeof ldrs[fnName]?.register === "function") {
      ldrs[fnName].register();
    }
  });
});

const Overlay = () => {
  const syncPhase = useShowsStore((s) => s.syncPhase);
  const statusText = useShowsStore((s) => s.statusText);
  const loaderIndex = useShowsStore((s) => s.loaderIndex);
  const isVisible = syncPhase !== null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ldrsReady.then(() => setReady(true));
  }, []);

  const { tag: Tag, props } = LOADERS[loaderIndex] ?? LOADERS[0];

  return (
    <div className={styles.backdrop} data-visible={isVisible} aria-hidden={!isVisible}>
      <div className={styles.content}>
        {ready && isVisible && <Tag {...props} color="var(--color-wyrd)" stroke="3" />}
        {statusText && <p className={styles.statusText}>{statusText}</p>}
      </div>
    </div>
  );
};

export default Overlay;
