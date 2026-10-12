const QUICK_SETTINGS_ID = "runtimeSettingsButton";
const QUICK_SETTINGS_STYLE_ID = "runtimeQuickControlsStyles";

/**
 * Keeps the existing settings flow reachable while a run is active and hides
 * the legacy title-screen Briefing shortcut. The route dialog itself remains
 * available to gameplay systems that use it for actual route decisions.
 */
export function installRuntimeQuickControls(root: Document = document): void {
  const routeButton = root.getElementById("routeButton") as HTMLButtonElement | null;
  if (routeButton) {
    routeButton.hidden = true;
    routeButton.style.display = "none";
    routeButton.setAttribute("aria-hidden", "true");
    routeButton.tabIndex = -1;
  }

  if (root.getElementById(QUICK_SETTINGS_ID)) return;

  const playerStatusHud = root.getElementById("playerStatusHud");
  const pauseSettingsButton = root.getElementById(
    "pauseSettingsButton",
  ) as HTMLButtonElement | null;
  if (!playerStatusHud || !pauseSettingsButton) return;

  const style = root.createElement("style");
  style.id = QUICK_SETTINGS_STYLE_ID;
  style.textContent = `
    #${QUICK_SETTINGS_ID} {
      position: fixed;
      top: 5.75rem;
      right: 1rem;
      z-index: 90;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      display: grid;
      place-items: center;
      border: 1px solid rgba(159, 246, 255, 0.42);
      border-radius: 999px;
      background: rgba(7, 17, 31, 0.84);
      color: #9ff6ff;
      box-shadow: 0 0 18px rgba(103, 232, 249, 0.18);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      font: inherit;
      font-size: 1.15rem;
      line-height: 1;
      cursor: pointer;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    }

    #${QUICK_SETTINGS_ID}:hover {
      transform: translateY(-1px) scale(1.04);
      border-color: rgba(159, 246, 255, 0.78);
      box-shadow: 0 0 24px rgba(103, 232, 249, 0.3);
    }

    #${QUICK_SETTINGS_ID}:focus-visible {
      outline: 2px solid #9ff6ff;
      outline-offset: 2px;
    }

    #${QUICK_SETTINGS_ID}[hidden] {
      display: none;
    }

    @media (max-width: 760px) {
      #${QUICK_SETTINGS_ID} {
        top: 4.75rem;
        right: 0.75rem;
        width: 2.35rem;
        height: 2.35rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${QUICK_SETTINGS_ID} {
        transition: none;
      }
    }
  `;
  root.head.appendChild(style);

  const button = root.createElement("button");
  button.id = QUICK_SETTINGS_ID;
  button.type = "button";
  button.className = "runtime-settings-button";
  button.textContent = "⚙";
  button.title = "Audio settings";
  button.setAttribute("aria-label", "Open audio settings");
  root.body.appendChild(button);

  const syncVisibility = () => {
    button.hidden = playerStatusHud.classList.contains("hidden");
  };

  const observer = new MutationObserver(syncVisibility);
  observer.observe(playerStatusHud, {
    attributes: true,
    attributeFilter: ["class"],
  });
  syncVisibility();

  button.addEventListener("click", () => {
    if (button.disabled) return;
    button.disabled = true;

    // Reuse the game's normal pause transition, then reuse the existing
    // pause-screen Settings action so there is only one settings state path.
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      }),
    );

    queueMicrotask(() => {
      pauseSettingsButton.click();
      button.disabled = false;
    });
  });
}
