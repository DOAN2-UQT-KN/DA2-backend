import sharp from "sharp";
import { computePHash, computeSha256 } from "../media-hash.util";

describe("computeSha256", () => {
  it("returns NIST example hex for buffer 'abc'", () => {
    // https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/SHA256.pdf
    expect(computeSha256(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("returns null for an empty buffer", () => {
    expect(computeSha256(Buffer.alloc(0))).toBeNull();
  });
});

describe("computePHash", () => {
  async function solidPng(r: number, g: number, b: number): Promise<Buffer> {
    return sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: { r, g, b },
      },
    })
      .png()
      .toBuffer();
  }

  it("returns 16-char lowercase hex for a valid image", async () => {
    const png = await solidPng(40, 120, 200);
    const hash = await computePHash(png);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns the same hash for the same buffer", async () => {
    const png = await solidPng(10, 20, 30);
    const a = await computePHash(png);
    const b = await computePHash(png);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });

  it("returns null for an empty buffer", async () => {
    expect(await computePHash(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for invalid bytes", async () => {
    expect(await computePHash(Buffer.from("not-an-image"))).toBeNull();
  });
});
