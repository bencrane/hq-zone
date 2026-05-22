/**
 * Static reference data for the filter dropdowns. Set-aside codes and
 * notice types come from SAM.gov's published vocabularies; states are
 * USPS two-letter codes (50 + DC). Kept small + local rather than
 * fetching from DEX to avoid a chicken-and-egg load on the first
 * page render.
 */

export const US_STATES: readonly { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

// Common SAM notice types. Source: sam.gov vocabulary.
export const NOTICE_TYPES: readonly string[] = [
  "Solicitation",
  "Combined Synopsis/Solicitation",
  "Presolicitation",
  "Sources Sought",
  "Special Notice",
  "Award Notice",
  "Justification",
  "Intent to Bundle Requirements (DoD- Funded)",
  "Sale of Surplus Property",
];

// Common set-aside codes (SBA + agency-level). Not exhaustive — SAM uses many.
export const SET_ASIDE_CODES: readonly { code: string; label: string }[] = [
  { code: "SBA", label: "Total Small Business" },
  { code: "SBP", label: "Partial Small Business" },
  { code: "8A", label: "8(a) Set-Aside" },
  { code: "8AN", label: "8(a) Sole Source" },
  { code: "HZC", label: "HUBZone Set-Aside" },
  { code: "HZS", label: "HUBZone Sole Source" },
  { code: "SDVOSBC", label: "SDVOSB Set-Aside" },
  { code: "SDVOSBS", label: "SDVOSB Sole Source" },
  { code: "WOSB", label: "WOSB Set-Aside" },
  { code: "WOSBSS", label: "WOSB Sole Source" },
  { code: "EDWOSB", label: "EDWOSB Set-Aside" },
  { code: "EDWOSBSS", label: "EDWOSB Sole Source" },
  { code: "IEE", label: "Indian Economic Enterprise" },
  { code: "ISBEE", label: "Indian Small Business Economic Enterprise" },
  { code: "BICiv", label: "Buy Indian" },
  { code: "VSA", label: "Veteran-Owned Set-Aside" },
  { code: "VSS", label: "Veteran-Owned Sole Source" },
];

export const PAGE_SIZES: readonly number[] = [25, 50, 100];
