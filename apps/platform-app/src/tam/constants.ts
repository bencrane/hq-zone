/**
 * Static reference data for the TAM filter dropdowns. Firmographic
 * vocabulary (employee bands, revenue bands, industries) — kept local
 * to avoid a load on first paint. States are USPS two-letter codes.
 */

export const PAGE_SIZES: readonly number[] = [25, 50, 100];

export const EMPLOYEE_BANDS: readonly { value: string; label: string }[] = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-500", label: "201–500" },
  { value: "501-1000", label: "501–1,000" },
  { value: "1001-5000", label: "1,001–5,000" },
  { value: "5001-10000", label: "5,001–10,000" },
  { value: "10001+", label: "10,001+" },
];

export const REVENUE_BANDS: readonly { value: string; label: string }[] = [
  { value: "0-1M", label: "$0–1M" },
  { value: "1M-10M", label: "$1M–10M" },
  { value: "10M-50M", label: "$10M–50M" },
  { value: "50M-100M", label: "$50M–100M" },
  { value: "100M-1B", label: "$100M–1B" },
  { value: "1B+", label: "$1B+" },
];

export const SENIORITY_BANDS: readonly { value: string; label: string }[] = [
  { value: "ic", label: "Individual contributor" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
  { value: "c_suite", label: "C-suite" },
  { value: "founder", label: "Founder / Owner" },
];

export const FUNCTIONS: readonly string[] = [
  "Engineering",
  "Sales",
  "Marketing",
  "Product",
  "Operations",
  "Finance",
  "Customer Success",
  "Design",
  "Legal",
  "HR",
  "Data",
  "Executive",
];

export const INDUSTRIES: readonly string[] = [
  "Information Technology",
  "Software Development",
  "Financial Services",
  "Manufacturing",
  "Construction",
  "Health Care",
  "Retail",
  "Logistics & Transportation",
  "Energy",
  "Telecommunications",
  "Government & Defense",
  "Real Estate",
  "Education",
  "Professional Services",
  "Marketing & Advertising",
];

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
