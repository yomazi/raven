// client/src/components/Content/BadgeSelect/BadgeSelectEditor.jsx
//
// AG Grid cell editor adapter for BadgeSelect.
// Handles AG Grid lifecycle and delegates all rendering to BadgeSelect.
//
// cellEditorParams:
//   options   string[]  — ordered list of valid values
//   labels    object    — { [value]: displayLabel }
//   variant   string    — "status" | "priority" (default: "status")
//   onSelect  fn        — async (newValue) => void

import { useEffect, useRef } from "react";
import BadgeSelect from "./BadgeSelect.jsx";

const BadgeSelectAdapter = (props) => {
  const { value, options, labels, variant = "status", onSelect, api, node, column } = props;
  const committed = useRef(false);

  // Close on grid scroll
  useEffect(() => {
    function onScroll() {
      api.stopEditing(true);
    }
    const viewport = document.querySelector(".ag-body-viewport");
    viewport?.addEventListener("scroll", onScroll);
    return () => viewport?.removeEventListener("scroll", onScroll);
  }, [api]);

  async function handleChange(newVal) {
    if (newVal === value || committed.current) return;
    committed.current = true;

    // Optimistic update
    node.setDataValue(column.getColId(), newVal);
    api.stopEditing(false);

    try {
      await onSelect(newVal);
    } catch (err) {
      // Roll back
      node.setDataValue(column.getColId(), value);
      console.error("BadgeSelectAdapter: failed to update value", err);
    }
  }

  return (
    <BadgeSelect
      value={value}
      options={options}
      labels={labels}
      variant={variant}
      onChange={handleChange}
      openOnMount={true}
    />
  );
};

export default BadgeSelectAdapter;
