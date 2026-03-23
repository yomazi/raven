import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const VIDEO_PROVIDERS = ["YouTube", "Vimeo"];

export default function MarketingAssetsSection({ show, setField }) {
  const ma = show.marketingAssets ?? {};
  const videos = ma.embeddedVideo ?? [];

  const updateVideo = (index, field, value) => {
    const updated = videos.map((v, i) => (i === index ? { ...v, [field]: value } : v));
    setField("marketingAssets.embeddedVideo", updated);
  };

  const addVideo = () => {
    setField("marketingAssets.embeddedVideo", [...videos, { provider: "YouTube", id: "" }]);
  };

  const removeVideo = (index) => {
    setField(
      "marketingAssets.embeddedVideo",
      videos.filter((_, i) => i !== index)
    );
  };

  return (
    <section id="marketing-assets" className={styles.section}>
      <SectionHeader title="Marketing Assets" />

      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="ma-website">
          Website
        </label>
        <input
          id="ma-website"
          className={styles.input}
          type="url"
          value={ma.urlArtistWebsite ?? ""}
          onChange={(e) => setField("marketingAssets.urlArtistWebsite", e.target.value)}
        />

        <label className={styles.label} htmlFor="ma-facebook">
          Facebook
        </label>
        <input
          id="ma-facebook"
          className={styles.input}
          type="url"
          value={ma.urlArtistFacebook ?? ""}
          onChange={(e) => setField("marketingAssets.urlArtistFacebook", e.target.value)}
        />

        <label className={styles.label} htmlFor="ma-instagram">
          Instagram
        </label>
        <input
          id="ma-instagram"
          className={styles.input}
          type="url"
          value={ma.urlArtistInstagram ?? ""}
          onChange={(e) => setField("marketingAssets.urlArtistInstagram", e.target.value)}
        />
      </div>

      {videos.length > 0 && (
        <div className={styles.subSectionGroup}>
          <h4 className={styles.subSectionTitle}>Embedded Videos</h4>
          {videos.map((video, i) => (
            <div key={i} className={styles.subSection}>
              <div className={styles.subSectionTitleRow}>
                <h4 className={styles.subSectionTitle}>Video {i + 1}</h4>
                <button className={styles.removeButton} onClick={() => removeVideo(i)}>
                  Remove
                </button>
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.label} htmlFor={`video-provider-${i}`}>
                  Provider
                </label>
                <select
                  id={`video-provider-${i}`}
                  className={styles.select}
                  value={video.provider ?? "YouTube"}
                  onChange={(e) => {
                    updateVideo(i, "provider", e.target.value);
                  }}
                >
                  {VIDEO_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <label className={styles.label} htmlFor={`video-id-${i}`}>
                  Video ID
                </label>
                <input
                  id={`video-id-${i}`}
                  className={styles.input}
                  type="text"
                  value={video.id ?? ""}
                  onChange={(e) => updateVideo(i, "id", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.addButton} onClick={addVideo}>
        + Add Video
      </button>
    </section>
  );
}
