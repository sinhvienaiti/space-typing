import { VoiceFeedbackState } from "../input/voice-feedback";

export function mountVoiceFeedback(root: HTMLElement): { state: VoiceFeedbackState; dispose(): void } {
  const transcript = root.querySelector<HTMLElement>("[data-voice-transcript]");
  const detail = root.querySelector<HTMLElement>("[data-voice-detail]");
  if (!transcript || !detail) throw new Error("Voice feedback elements are missing");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const state = new VoiceFeedbackState((view) => {
    clearTimeout(timer);
    root.hidden = !view.visible;
    root.dataset.state = view.status;
    transcript.textContent = view.transcript ?? "";
    transcript.hidden = view.transcript === null;
    detail.textContent = view.detail;
    if (view.visible && ["heard", "accepted", "unmatched", "unrecognized"].includes(view.status)) timer = setTimeout(() => state.expire(), 4000);
  });
  const shell = root.parentElement;
  const obstacles = shell ? Array.from(shell.querySelectorAll<HTMLElement>("#combatHotbar, #playerStatusHud")) : [];
  const position = (): void => {
    if (!shell) return;
    const bounds = shell.getBoundingClientRect();
    const panelWidth = Math.min(224, Math.max(0, bounds.width - 24));
    const left = bounds.right - 12 - panelWidth;
    let bottom = 12;
    for (const obstacle of obstacles) {
      const rect = obstacle.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.right > left && rect.left < bounds.right - 12) bottom = Math.max(bottom, bounds.bottom - rect.top + 8);
    }
    root.style.bottom = `${Math.ceil(bottom)}px`;
    shell.style.setProperty("--voice-feedback-clearance", `${Math.ceil(bottom) + 76}px`);
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
  if (shell) observer?.observe(shell);
  for (const obstacle of obstacles) observer?.observe(obstacle);
  position();
  return { state, dispose: () => { clearTimeout(timer); observer?.disconnect(); state.stop(); } };
}
