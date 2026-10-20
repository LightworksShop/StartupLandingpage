import { useEffect, useState } from "react";
import {
  blankDesign,
  normalizeDesign,
} from "../../../lib/marketing/design-model";

// Owns document revisions and page selection. Pointer previews commit once on release.
export function useDesignHistory(initialDesign) {
  const [pageIndex, setPageIndex] = useState(0);
  const [versionId, setVersionId] = useState("");
  const [history, setHistory] = useState({
    past: [],
    present: initialDesign
      ? normalizeDesign(initialDesign.composition)
      : blankDesign(),
    future: [],
  });
  const rootDesign = history.present;
  const design =
    pageIndex === 0
      ? rootDesign
      : normalizeDesign(rootDesign.pages[pageIndex - 1] || rootDesign);
  useEffect(() => {
    if (pageIndex > rootDesign.pages.length)
      setPageIndex(rootDesign.pages.length);
  }, [rootDesign.pages.length, pageIndex]);
  const writePage = (root, value, index = pageIndex) =>
    index === 0
      ? { ...value, pages: root.pages }
      : {
          ...root,
          pages: root.pages.map((p, i) =>
            i === index - 1 ? { ...value, pages: undefined } : p,
          ),
        };
  const commit = (next, whole = false) => {
    setHistory((h) => {
      const current = whole
        ? h.present
        : pageIndex === 0
          ? h.present
          : normalizeDesign(h.present.pages[pageIndex - 1]);
      const edited = typeof next === "function" ? next(current) : next;
      const value = whole ? edited : writePage(h.present, edited);
      if (JSON.stringify(value) === JSON.stringify(h.present)) return h;
      return {
        past: [...h.past, h.present].slice(-100),
        present: value,
        future: [],
      };
    });
    setVersionId("");
  };
  const change = (key, value) => commit((d) => ({ ...d, [key]: value }));
  const nested = (key, field, value) =>
    commit((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  const undo = () =>
    setHistory((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past.at(-1),
            future: [h.present, ...h.future],
          }
        : h,
    );
  const redo = () =>
    setHistory((h) =>
      h.future.length
        ? {
            past: [...h.past, h.present],
            present: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
  useEffect(() => {
    const keydown = (e) => {
      if (
        !(e.ctrlKey || e.metaKey) ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return {
    history,
    setHistory,
    pageIndex,
    setPageIndex,
    rootDesign,
    design,
    writePage,
    commit,
    change,
    nested,
    undo,
    redo,
    versionId,
    setVersionId,
  };
}
