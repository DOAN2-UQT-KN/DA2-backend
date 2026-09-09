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
  it("remains a stub", () => {
    expect(computePHash(Buffer.from("abc"))).toBeNull();
  });
});
