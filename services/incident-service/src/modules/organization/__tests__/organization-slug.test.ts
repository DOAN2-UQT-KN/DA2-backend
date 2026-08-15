import {
  nextUniqueOrganizationSlug,
  slugifyOrganizationName,
} from "@da2/constants";

describe("slugifyOrganizationName", () => {
  it("converts Vietnamese names to hyphenated ASCII slugs", () => {
    expect(slugifyOrganizationName("Mùa Hè Xanh")).toBe("mua-he-xanh");
    expect(slugifyOrganizationName("Câu lạc bộ ABC")).toBe("cau-lac-bo-abc");
  });

  it("strips special characters and collapses hyphens", () => {
    expect(slugifyOrganizationName("Fashion & Design 2026")).toBe(
      "fashion-design-2026",
    );
    expect(slugifyOrganizationName("  Hello---World!!  ")).toBe("hello-world");
  });

  it("lowercases and trims", () => {
    expect(slugifyOrganizationName(" EcoLink ")).toBe("ecolink");
  });

  it("falls back when the name has no alphanumeric characters", () => {
    expect(slugifyOrganizationName("!!!")).toBe("organization");
    expect(slugifyOrganizationName("   ")).toBe("organization");
  });
});

describe("nextUniqueOrganizationSlug", () => {
  it("returns the base slug when it is free", () => {
    expect(nextUniqueOrganizationSlug("mua-he-xanh", new Set())).toBe(
      "mua-he-xanh",
    );
  });

  it("appends -2, then -3 for duplicates", () => {
    expect(
      nextUniqueOrganizationSlug("mua-he-xanh", new Set(["mua-he-xanh"])),
    ).toBe("mua-he-xanh-2");
    expect(
      nextUniqueOrganizationSlug(
        "cau-lac-bo-abc",
        new Set(["cau-lac-bo-abc", "cau-lac-bo-abc-2"]),
      ),
    ).toBe("cau-lac-bo-abc-3");
  });

  it("skips holes only when the exact candidate is taken", () => {
    expect(
      nextUniqueOrganizationSlug(
        "eco",
        new Set(["eco", "eco-3"]),
      ),
    ).toBe("eco-2");
  });
});
