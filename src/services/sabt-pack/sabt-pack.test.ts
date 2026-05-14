import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { SABT_PACK_SLOT_FIXTURES } from "@/services/ad-studio-ai/weekly-strategy";
import { sundayOfThisWeekUae } from "@/services/sabt-pack";

test("SABT_PACK_SLOT_FIXTURES — covers exactly 7 unique slots in order", () => {
  assert.equal(SABT_PACK_SLOT_FIXTURES.length, 7, "must have 7 slots");

  const slotNumbers = SABT_PACK_SLOT_FIXTURES.map((f) => f.slot);
  assert.deepEqual(
    [...slotNumbers].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7],
    "slots must be 1..7 with no duplicates"
  );

  for (let i = 0; i < SABT_PACK_SLOT_FIXTURES.length; i++) {
    assert.equal(
      SABT_PACK_SLOT_FIXTURES[i].slot,
      i + 1,
      `slot at index ${i} must be ${i + 1} so iteration order = slot order`
    );
  }

  const formats = SABT_PACK_SLOT_FIXTURES.map((f) => f.format);
  assert.equal(new Set(formats).size, 7, "all 7 slots must have distinct formats");
});

test("SABT_PACK_SLOT_FIXTURES — every slot has copy guidance the planner can consume", () => {
  for (const fixture of SABT_PACK_SLOT_FIXTURES) {
    assert.ok(fixture.label.length > 0, `slot ${fixture.slot} missing label`);
    assert.ok(fixture.purpose.length > 20, `slot ${fixture.slot} purpose too thin`);
    assert.ok(
      fixture.copyConstraint.length > 20,
      `slot ${fixture.slot} copy constraint too thin`
    );
  }
});

test("sundayOfThisWeekUae — returns an ISO date for a Sunday in UAE local", () => {
  const iso = sundayOfThisWeekUae();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

  // Confirm it's a Sunday. Build a Date in UTC at noon (avoids the midnight
  // edge case where toString day differs from getUTCDay) and check the
  // day-of-week using UAE-offset math identical to the implementation.
  const date = new Date(`${iso}T12:00:00Z`);
  const dubaiDay = new Date(date.getTime() + 4 * 60 * 60 * 1000).getUTCDay();
  assert.equal(dubaiDay, 0, `${iso} (Dubai-local) must be a Sunday (got day=${dubaiDay})`);
});

test("slideshow compositor — sharp pipeline produces 1080x1350 JPEG buffers", async () => {
  // We don't hit the real compositor (would require R2 + DB). Instead verify
  // the underlying sharp pipeline shape — compose a 1080×1350 buffer from a
  // synthetic image, the same way buildSlideshowFrames does internally.
  const sourceBuffer = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 180, g: 90, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  const composed = await sharp(sourceBuffer)
    .resize(1080, 1350, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88 })
    .toBuffer();

  const meta = await sharp(composed).metadata();
  assert.equal(meta.width, 1080, "frame must be 1080px wide");
  assert.equal(meta.height, 1350, "frame must be 1350px tall (4:5)");
  assert.equal(meta.format, "jpeg", "frame must be JPEG");
});
