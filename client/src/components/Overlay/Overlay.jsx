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

// Register all ldrs components once
async function registerAll() {
  const ldrs = await import("ldrs");
  LOADERS.forEach(({ tag }) => {
    const fnName = tag.replace(/^l-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (typeof ldrs[fnName]?.register === "function") {
      ldrs[fnName].register();
    }
  });
}
registerAll();

const Overlay = () => {
  const syncPhase = useShowsStore((s) => s.syncPhase);
  const statusText = useShowsStore((s) => s.statusText);
  const isClientAreaLoading = useShowsStore((s) => s.isClientAreaLoading);
  const isVisible = syncPhase !== null || isClientAreaLoading;

  // Pick a random loader once per mount, not on every render
  const [loader, setLoader] = useState(() => LOADERS[Math.floor(Math.random() * LOADERS.length)]);

  useEffect(() => {
    if (isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoader(LOADERS[Math.floor(Math.random() * LOADERS.length)]);
    }
    // deliberately no else branch — loader state never changes on close
  }, [isVisible]);

  const { tag: Tag, props } = loader;

  return (
    <div className={styles.backdrop} data-visible={isVisible} aria-hidden={!isVisible}>
      <div className={styles.content}>
        <Tag {...props} color="var(--color-wyrd)" stroke="3" />
        {statusText && <p className={styles.statusText}>{statusText}</p>}
      </div>
    </div>
  );
};

export default Overlay;
