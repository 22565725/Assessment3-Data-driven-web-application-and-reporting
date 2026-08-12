"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ThemeToggle from "@/Components/theme/ThemeToggle";

type Layout = "grid" | "list";

export default function SettingsPage() {
  const [layout, setLayout] = useLocalStorage<Layout>("feedLayout", "grid");
  const [showImages, setShowImages] = useLocalStorage<boolean>("feedShowImages", true);
  const [message, setMessage] = useState("");
  // ADDED: replaces window.confirm. See the comment on the markup below.
  const [isConfirming, setIsConfirming] = useState(false);

  const clearSavedPosts = () => {
    window.localStorage.removeItem("myData");
    setIsConfirming(false);
    setMessage("Your saved posts have been cleared.");
  };

  const boxClass = "flex flex-col gap-2 rounded-md border border-border p-4";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Settings</h1>

      <div className="flex max-w-xl flex-col gap-4">
        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <ThemeToggle />
        </section>

        <fieldset className={boxClass}>
          <legend className="px-1 text-lg font-semibold text-foreground">
            Feed layout
          </legend>

          <label className="flex items-center gap-2 text-foreground">
            <input type="radio" name="layout" value="grid"
              checked={layout === "grid"}
              onChange={() => setLayout("grid")} />
            Grid — cards side by side
          </label>

          <label className="flex items-center gap-2 text-foreground">
            <input type="radio" name="layout" value="list"
              checked={layout === "list"}
              onChange={() => setLayout("list")} />
            List — one post per row
          </label>
        </fieldset>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">Compact mode</h2>
          <label className="flex items-center gap-2 text-foreground">
            <input type="checkbox" checked={showImages}
              onChange={(event) => setShowImages(event.target.checked)} />
            Show post images
          </label>
          <p className="text-sm text-muted">
            Turn images off to fit more posts on screen.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">Your posts</h2>

          {/* CHANGED: window.confirm replaced with an in-page confirmation.
              window.confirm draws an operating-system dialog — it cannot be
              themed, cannot be styled, and looks identical in light and dark
              mode, which is exactly the "themes should reach the buttons"
              problem. It also blocks the whole browser tab while open.
              role="alert" makes screen readers announce the warning when it
              appears. Nothing steals focus: the buttons follow the trigger in
              DOM order, so Tab reaches them naturally. */}
          {isConfirming ? (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-foreground">
                Delete every post you have created? This cannot be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={clearSavedPosts}
                  className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground transition-opacity hover:opacity-90">
                  Yes, delete my posts
                </button>
                <button type="button" onClick={() => setIsConfirming(false)}
                  className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button"
              onClick={() => { setIsConfirming(true); setMessage(""); }}
              className="self-start rounded-md border border-danger px-3 py-2 text-sm text-danger transition-colors hover:bg-danger hover:text-danger-foreground">
              Clear my saved posts
            </button>
          )}

          <p className="text-sm text-muted" aria-live="polite">{message}</p>
        </section>
      </div>
    </main>
  );
}