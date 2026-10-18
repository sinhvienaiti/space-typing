import { describe, expect, it } from "vitest";
import { checkFeedback, cleanFeedbackText, FEEDBACK_MAX } from "../src/online/feedback-rules";

describe("feedback rules", () => {
  it("keeps line breaks but removes control and invisible characters", () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const separator = String.fromCharCode(0x2028);
    expect(cleanFeedbackText("  Step 1\r\nStep" + zeroWidth + " 2" + separator + String.fromCharCode(7) + "\n\n\n\n\nEnd  ")).toBe("Step 1\nStep 2\n\n\nEnd");
  });

  it("checks the kind, the length and the optional email", () => {
    expect(checkFeedback({ category: "praise", message: "A long enough message." })).toMatchObject({ ok: false, field: "category" });
    expect(checkFeedback({ category: "idea", message: "short" })).toMatchObject({ ok: false, field: "message" });
    expect(checkFeedback({ category: "idea", message: "x".repeat(FEEDBACK_MAX + 1) })).toMatchObject({ ok: false, field: "message" });
    expect(checkFeedback({ category: "contact", message: "Hello team, a question.", contactEmail: "not-an-email" })).toMatchObject({ ok: false, field: "contactEmail" });
    expect(checkFeedback({ category: "contact", message: "Hello team, a question.", contactEmail: "  " })).toMatchObject({ ok: true, value: { contactEmail: null } });
  });

  it("keeps only known context fields, trimmed and bounded", () => {
    const check = checkFeedback({
      category: "bug",
      message: "Something broke in the boss fight.",
      context: { screen: "x".repeat(100), stage: 1e9, ship: "nova", password: "hunter2", errors: ["a", "b", "c", "d", "e", "f", 7] },
    });
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.value.context.screen).toHaveLength(40);
    expect(check.value.context.stage).toBe(100_000);
    expect(check.value.context.password).toBeUndefined();
    expect(check.value.context.errors).toEqual(["b", "c", "d", "e", "f"]);
  });
});
