/**
 * TAM fixture — person-grain lead rows. Each row is a person at a
 * company; company fields are denormalized so the table can filter on
 * both person + company dimensions in one pass. Swap-out when the
 * BFF `/api/v1/people/search` endpoint is wired.
 */
import type { TamRow } from "./api";

interface Company {
  id: string;
  name: string;
  industry: string;
  employee_band: string;
  revenue_band: string;
  hq_state: string;
  hq_locality: string;
  founded_year: number;
  website: string;
}

const COMPANIES: Company[] = [
  {
    id: "C00001",
    name: "Cascade Cloud Systems",
    industry: "Information Technology",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "WA",
    hq_locality: "Seattle",
    founded_year: 2014,
    website: "cascadecloud.com",
  },
  {
    id: "C00002",
    name: "Northwind Industrial",
    industry: "Manufacturing",
    employee_band: "1001-5000",
    revenue_band: "100M-1B",
    hq_state: "OH",
    hq_locality: "Cleveland",
    founded_year: 1972,
    website: "northwindind.com",
  },
  {
    id: "C00003",
    name: "Bayline Logistics",
    industry: "Logistics & Transportation",
    employee_band: "501-1000",
    revenue_band: "100M-1B",
    hq_state: "CA",
    hq_locality: "Long Beach",
    founded_year: 1998,
    website: "baylinelog.com",
  },
  {
    id: "C00004",
    name: "Aspect Software Labs",
    industry: "Software Development",
    employee_band: "11-50",
    revenue_band: "1M-10M",
    hq_state: "CA",
    hq_locality: "San Francisco",
    founded_year: 2021,
    website: "aspectsw.dev",
  },
  {
    id: "C00005",
    name: "Tidewater Marine Repair",
    industry: "Construction",
    employee_band: "51-200",
    revenue_band: "10M-50M",
    hq_state: "VA",
    hq_locality: "Norfolk",
    founded_year: 1986,
    website: "tidewatermr.com",
  },
  {
    id: "C00006",
    name: "Beacon Health Group",
    industry: "Health Care",
    employee_band: "501-1000",
    revenue_band: "100M-1B",
    hq_state: "MA",
    hq_locality: "Boston",
    founded_year: 2002,
    website: "beaconhealth.io",
  },
  {
    id: "C00007",
    name: "Crescent Defense Technologies",
    industry: "Government & Defense",
    employee_band: "1001-5000",
    revenue_band: "100M-1B",
    hq_state: "AZ",
    hq_locality: "Phoenix",
    founded_year: 1995,
    website: "crescentdt.com",
  },
  {
    id: "C00008",
    name: "Sunbelt Retail Partners",
    industry: "Retail",
    employee_band: "5001-10000",
    revenue_band: "1B+",
    hq_state: "TX",
    hq_locality: "Dallas",
    founded_year: 1981,
    website: "sunbeltrp.com",
  },
  {
    id: "C00009",
    name: "Stride Robotics",
    industry: "Software Development",
    employee_band: "51-200",
    revenue_band: "10M-50M",
    hq_state: "MA",
    hq_locality: "Cambridge",
    founded_year: 2018,
    website: "striderobotics.com",
  },
  {
    id: "C00010",
    name: "Granite State Capital",
    industry: "Financial Services",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "NH",
    hq_locality: "Manchester",
    founded_year: 1989,
    website: "granitestate.cap",
  },
  {
    id: "C00011",
    name: "Frontier Energy Tech",
    industry: "Energy",
    employee_band: "501-1000",
    revenue_band: "100M-1B",
    hq_state: "NM",
    hq_locality: "Albuquerque",
    founded_year: 2009,
    website: "frontierenergy.tech",
  },
  {
    id: "C00012",
    name: "Meridian Real Estate Group",
    industry: "Real Estate",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "FL",
    hq_locality: "Miami",
    founded_year: 1991,
    website: "meridianre.com",
  },
  {
    id: "C00013",
    name: "Pacific Telecom Holdings",
    industry: "Telecommunications",
    employee_band: "10001+",
    revenue_band: "1B+",
    hq_state: "CA",
    hq_locality: "San Diego",
    founded_year: 1968,
    website: "pacifictelecom.net",
  },
  {
    id: "C00014",
    name: "Bayou Construction Partners",
    industry: "Construction",
    employee_band: "1001-5000",
    revenue_band: "100M-1B",
    hq_state: "LA",
    hq_locality: "Baton Rouge",
    founded_year: 1976,
    website: "bayoucp.com",
  },
  {
    id: "C00015",
    name: "Northfield Cybersecurity",
    industry: "Information Technology",
    employee_band: "51-200",
    revenue_band: "10M-50M",
    hq_state: "MD",
    hq_locality: "Bethesda",
    founded_year: 2016,
    website: "northfieldcyber.com",
  },
  {
    id: "C00016",
    name: "Broadridge Federal IT",
    industry: "Information Technology",
    employee_band: "501-1000",
    revenue_band: "100M-1B",
    hq_state: "VA",
    hq_locality: "Arlington",
    founded_year: 2003,
    website: "broadridgefed.com",
  },
  {
    id: "C00017",
    name: "Apex Marketing Group",
    industry: "Marketing & Advertising",
    employee_band: "11-50",
    revenue_band: "1M-10M",
    hq_state: "NY",
    hq_locality: "Brooklyn",
    founded_year: 2020,
    website: "apexmkt.io",
  },
  {
    id: "C00018",
    name: "Heartland Professional Services",
    industry: "Professional Services",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "MO",
    hq_locality: "Kansas City",
    founded_year: 1999,
    website: "heartlandps.com",
  },
  {
    id: "C00019",
    name: "Verdant AgriTech",
    industry: "Manufacturing",
    employee_band: "51-200",
    revenue_band: "10M-50M",
    hq_state: "IA",
    hq_locality: "Des Moines",
    founded_year: 2015,
    website: "verdantagri.co",
  },
  {
    id: "C00020",
    name: "Aurora Education Labs",
    industry: "Education",
    employee_band: "11-50",
    revenue_band: "1M-10M",
    hq_state: "CO",
    hq_locality: "Denver",
    founded_year: 2019,
    website: "auroraedu.org",
  },
  {
    id: "C00021",
    name: "Sentinel Logistics",
    industry: "Logistics & Transportation",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "GA",
    hq_locality: "Atlanta",
    founded_year: 1994,
    website: "sentinellog.com",
  },
  {
    id: "C00022",
    name: "Tundra Software",
    industry: "Software Development",
    employee_band: "1-10",
    revenue_band: "0-1M",
    hq_state: "MN",
    hq_locality: "Minneapolis",
    founded_year: 2024,
    website: "tundra.dev",
  },
  {
    id: "C00023",
    name: "Atlas Manufacturing Co",
    industry: "Manufacturing",
    employee_band: "5001-10000",
    revenue_band: "1B+",
    hq_state: "MI",
    hq_locality: "Detroit",
    founded_year: 1955,
    website: "atlasmfg.com",
  },
  {
    id: "C00024",
    name: "Mesa Health Networks",
    industry: "Health Care",
    employee_band: "1001-5000",
    revenue_band: "100M-1B",
    hq_state: "AZ",
    hq_locality: "Tucson",
    founded_year: 1988,
    website: "mesahealth.net",
  },
  {
    id: "C00025",
    name: "Coastal Energy Partners",
    industry: "Energy",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "TX",
    hq_locality: "Houston",
    founded_year: 2007,
    website: "coastalenergy.com",
  },
  {
    id: "C00026",
    name: "Summit Financial Advisors",
    industry: "Financial Services",
    employee_band: "11-50",
    revenue_band: "1M-10M",
    hq_state: "UT",
    hq_locality: "Salt Lake City",
    founded_year: 2017,
    website: "summitfa.com",
  },
  {
    id: "C00027",
    name: "Cypress Real Estate",
    industry: "Real Estate",
    employee_band: "51-200",
    revenue_band: "10M-50M",
    hq_state: "FL",
    hq_locality: "Tampa",
    founded_year: 2001,
    website: "cypressre.co",
  },
  {
    id: "C00028",
    name: "Highland Defense Research",
    industry: "Government & Defense",
    employee_band: "501-1000",
    revenue_band: "100M-1B",
    hq_state: "VA",
    hq_locality: "McLean",
    founded_year: 1992,
    website: "highlanddr.com",
  },
  {
    id: "C00029",
    name: "Lakeshore Telecom",
    industry: "Telecommunications",
    employee_band: "201-500",
    revenue_band: "50M-100M",
    hq_state: "IL",
    hq_locality: "Chicago",
    founded_year: 1985,
    website: "lakeshoretel.com",
  },
  {
    id: "C00030",
    name: "Cobalt Software Studios",
    industry: "Software Development",
    employee_band: "11-50",
    revenue_band: "1M-10M",
    hq_state: "OR",
    hq_locality: "Portland",
    founded_year: 2022,
    website: "cobaltsw.com",
  },
];

const cm = new Map(COMPANIES.map((c) => [c.id, c]));

interface PersonSeed {
  full_name: string;
  title: string;
  seniority_band: string;
  function: string;
  person_state: string | null;
  person_locality: string | null;
  company_id: string;
}

const PEOPLE: PersonSeed[] = [
  // Cascade Cloud Systems — IT mid-size
  {
    full_name: "Elena Park",
    title: "VP of Engineering",
    seniority_band: "vp",
    function: "Engineering",
    person_state: "WA",
    person_locality: "Seattle",
    company_id: "C00001",
  },
  {
    full_name: "Marcus Hale",
    title: "Director of Sales",
    seniority_band: "director",
    function: "Sales",
    person_state: "WA",
    person_locality: "Bellevue",
    company_id: "C00001",
  },
  {
    full_name: "Priya Iyer",
    title: "Head of Product",
    seniority_band: "director",
    function: "Product",
    person_state: "WA",
    person_locality: "Seattle",
    company_id: "C00001",
  },

  // Northwind Industrial — large manufacturing
  {
    full_name: "Robert Kowalski",
    title: "CFO",
    seniority_band: "c_suite",
    function: "Finance",
    person_state: "OH",
    person_locality: "Cleveland",
    company_id: "C00002",
  },
  {
    full_name: "Janice Webb",
    title: "VP of Operations",
    seniority_band: "vp",
    function: "Operations",
    person_state: "OH",
    person_locality: "Akron",
    company_id: "C00002",
  },
  {
    full_name: "Daniel Ortega",
    title: "Plant Manager",
    seniority_band: "manager",
    function: "Operations",
    person_state: "OH",
    person_locality: "Toledo",
    company_id: "C00002",
  },

  // Bayline Logistics — mid logistics
  {
    full_name: "Amelia Choi",
    title: "COO",
    seniority_band: "c_suite",
    function: "Operations",
    person_state: "CA",
    person_locality: "Long Beach",
    company_id: "C00003",
  },
  {
    full_name: "Travis Booker",
    title: "Director of Logistics",
    seniority_band: "director",
    function: "Operations",
    person_state: "CA",
    person_locality: "Carson",
    company_id: "C00003",
  },

  // Aspect Software Labs — small SaaS
  {
    full_name: "Iris Chen",
    title: "Founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "CA",
    person_locality: "San Francisco",
    company_id: "C00004",
  },
  {
    full_name: "Hugo Bertrand",
    title: "CTO",
    seniority_band: "c_suite",
    function: "Engineering",
    person_state: "CA",
    person_locality: "Oakland",
    company_id: "C00004",
  },
  {
    full_name: "Yuki Tanaka",
    title: "Senior Software Engineer",
    seniority_band: "ic",
    function: "Engineering",
    person_state: "CA",
    person_locality: "San Francisco",
    company_id: "C00004",
  },

  // Tidewater Marine Repair — mid construction
  {
    full_name: "Lloyd Whitman",
    title: "VP of Operations",
    seniority_band: "vp",
    function: "Operations",
    person_state: "VA",
    person_locality: "Norfolk",
    company_id: "C00005",
  },
  {
    full_name: "Karen Doyle",
    title: "Director of Sales",
    seniority_band: "director",
    function: "Sales",
    person_state: "VA",
    person_locality: "Virginia Beach",
    company_id: "C00005",
  },

  // Beacon Health Group — mid healthcare
  {
    full_name: "Dr. Mei-Lin Zhao",
    title: "Chief Medical Officer",
    seniority_band: "c_suite",
    function: "Executive",
    person_state: "MA",
    person_locality: "Boston",
    company_id: "C00006",
  },
  {
    full_name: "Stephen Faulkner",
    title: "VP of Network Strategy",
    seniority_band: "vp",
    function: "Operations",
    person_state: "MA",
    person_locality: "Cambridge",
    company_id: "C00006",
  },
  {
    full_name: "Olivia Hartwell",
    title: "Director of Marketing",
    seniority_band: "director",
    function: "Marketing",
    person_state: "MA",
    person_locality: "Boston",
    company_id: "C00006",
  },

  // Crescent Defense Technologies — large defense
  {
    full_name: "Colonel (ret.) James Beaumont",
    title: "VP of Government Programs",
    seniority_band: "vp",
    function: "Sales",
    person_state: "AZ",
    person_locality: "Phoenix",
    company_id: "C00007",
  },
  {
    full_name: "Rita Solano",
    title: "CFO",
    seniority_band: "c_suite",
    function: "Finance",
    person_state: "AZ",
    person_locality: "Scottsdale",
    company_id: "C00007",
  },
  {
    full_name: "Aiden Castellano",
    title: "Director of Contracts",
    seniority_band: "director",
    function: "Legal",
    person_state: "AZ",
    person_locality: "Phoenix",
    company_id: "C00007",
  },

  // Sunbelt Retail Partners — very large retail
  {
    full_name: "Tasha Greene",
    title: "Chief Merchandising Officer",
    seniority_band: "c_suite",
    function: "Operations",
    person_state: "TX",
    person_locality: "Dallas",
    company_id: "C00008",
  },
  {
    full_name: "Patrick Mahoney",
    title: "VP of HR",
    seniority_band: "vp",
    function: "HR",
    person_state: "TX",
    person_locality: "Plano",
    company_id: "C00008",
  },

  // Stride Robotics — Boston robotics
  {
    full_name: "Anika Bose",
    title: "Founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "MA",
    person_locality: "Cambridge",
    company_id: "C00009",
  },
  {
    full_name: "Vikram Shastri",
    title: "VP of Engineering",
    seniority_band: "vp",
    function: "Engineering",
    person_state: "MA",
    person_locality: "Cambridge",
    company_id: "C00009",
  },
  {
    full_name: "Sebastian Reilly",
    title: "Director of Sales",
    seniority_band: "director",
    function: "Sales",
    person_state: "MA",
    person_locality: "Boston",
    company_id: "C00009",
  },

  // Granite State Capital — finance
  {
    full_name: "Emily Vance",
    title: "Managing Director",
    seniority_band: "director",
    function: "Finance",
    person_state: "NH",
    person_locality: "Manchester",
    company_id: "C00010",
  },
  {
    full_name: "Harold Lefebvre",
    title: "CFO",
    seniority_band: "c_suite",
    function: "Finance",
    person_state: "NH",
    person_locality: "Nashua",
    company_id: "C00010",
  },

  // Frontier Energy Tech
  {
    full_name: "Carmen Reyes",
    title: "VP of Engineering",
    seniority_band: "vp",
    function: "Engineering",
    person_state: "NM",
    person_locality: "Albuquerque",
    company_id: "C00011",
  },
  {
    full_name: "Wendell Park",
    title: "Director of Field Operations",
    seniority_band: "director",
    function: "Operations",
    person_state: "NM",
    person_locality: "Santa Fe",
    company_id: "C00011",
  },

  // Meridian Real Estate Group
  {
    full_name: "Sofia Castellanos",
    title: "Managing Partner",
    seniority_band: "founder",
    function: "Executive",
    person_state: "FL",
    person_locality: "Miami",
    company_id: "C00012",
  },
  {
    full_name: "Luis Quintero",
    title: "Director of Acquisitions",
    seniority_band: "director",
    function: "Finance",
    person_state: "FL",
    person_locality: "Coral Gables",
    company_id: "C00012",
  },

  // Pacific Telecom Holdings
  {
    full_name: "Theresa Nakamura",
    title: "Chief Network Officer",
    seniority_band: "c_suite",
    function: "Engineering",
    person_state: "CA",
    person_locality: "San Diego",
    company_id: "C00013",
  },
  {
    full_name: "Brian Gallagher",
    title: "VP of Enterprise Sales",
    seniority_band: "vp",
    function: "Sales",
    person_state: "CA",
    person_locality: "Los Angeles",
    company_id: "C00013",
  },
  {
    full_name: "Aaliyah Foster",
    title: "Director of Customer Success",
    seniority_band: "director",
    function: "Customer Success",
    person_state: "CA",
    person_locality: "San Diego",
    company_id: "C00013",
  },

  // Bayou Construction Partners
  {
    full_name: "Anthony Boudreaux",
    title: "President",
    seniority_band: "c_suite",
    function: "Executive",
    person_state: "LA",
    person_locality: "Baton Rouge",
    company_id: "C00014",
  },
  {
    full_name: "Michelle Landry",
    title: "VP of Estimating",
    seniority_band: "vp",
    function: "Operations",
    person_state: "LA",
    person_locality: "New Orleans",
    company_id: "C00014",
  },

  // Northfield Cybersecurity
  {
    full_name: "Vance Okonkwo",
    title: "CTO",
    seniority_band: "c_suite",
    function: "Engineering",
    person_state: "MD",
    person_locality: "Bethesda",
    company_id: "C00015",
  },
  {
    full_name: "Lena Brockman",
    title: "Director of Threat Intelligence",
    seniority_band: "director",
    function: "Engineering",
    person_state: "MD",
    person_locality: "Silver Spring",
    company_id: "C00015",
  },
  {
    full_name: "Marisol Rivers",
    title: "VP of Federal Sales",
    seniority_band: "vp",
    function: "Sales",
    person_state: "VA",
    person_locality: "Arlington",
    company_id: "C00015",
  },

  // Broadridge Federal IT
  {
    full_name: "Curtis Henley",
    title: "VP of Federal Programs",
    seniority_band: "vp",
    function: "Sales",
    person_state: "VA",
    person_locality: "Arlington",
    company_id: "C00016",
  },
  {
    full_name: "Damian Aldridge",
    title: "Director of Cloud Engineering",
    seniority_band: "director",
    function: "Engineering",
    person_state: "VA",
    person_locality: "Reston",
    company_id: "C00016",
  },

  // Apex Marketing Group
  {
    full_name: "Naomi Brennan",
    title: "Founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "NY",
    person_locality: "Brooklyn",
    company_id: "C00017",
  },
  {
    full_name: "Jude Pellegrino",
    title: "Creative Director",
    seniority_band: "director",
    function: "Design",
    person_state: "NY",
    person_locality: "Manhattan",
    company_id: "C00017",
  },

  // Heartland Professional Services
  {
    full_name: "Glenn Whitlock",
    title: "Managing Partner",
    seniority_band: "founder",
    function: "Executive",
    person_state: "MO",
    person_locality: "Kansas City",
    company_id: "C00018",
  },
  {
    full_name: "Hannah Spivey",
    title: "Director of Finance",
    seniority_band: "director",
    function: "Finance",
    person_state: "MO",
    person_locality: "St. Louis",
    company_id: "C00018",
  },

  // Verdant AgriTech
  {
    full_name: "Felicity Hawthorne",
    title: "Founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "IA",
    person_locality: "Des Moines",
    company_id: "C00019",
  },
  {
    full_name: "Owen Bridger",
    title: "Head of Agronomy",
    seniority_band: "director",
    function: "Operations",
    person_state: "IA",
    person_locality: "Ames",
    company_id: "C00019",
  },

  // Aurora Education Labs
  {
    full_name: "Tomás Aguilar",
    title: "Founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "CO",
    person_locality: "Denver",
    company_id: "C00020",
  },
  {
    full_name: "Hadley Westwood",
    title: "Head of Curriculum",
    seniority_band: "director",
    function: "Product",
    person_state: "CO",
    person_locality: "Boulder",
    company_id: "C00020",
  },

  // Sentinel Logistics
  {
    full_name: "Marquise Wheeler",
    title: "VP of Operations",
    seniority_band: "vp",
    function: "Operations",
    person_state: "GA",
    person_locality: "Atlanta",
    company_id: "C00021",
  },
  {
    full_name: "Catalina Estevez",
    title: "Director of Carrier Relations",
    seniority_band: "director",
    function: "Operations",
    person_state: "GA",
    person_locality: "Marietta",
    company_id: "C00021",
  },

  // Tundra Software — tiny
  {
    full_name: "Petter Lindqvist",
    title: "Founder",
    seniority_band: "founder",
    function: "Executive",
    person_state: "MN",
    person_locality: "Minneapolis",
    company_id: "C00022",
  },
  {
    full_name: "Saoirse Hennessy",
    title: "Founding Engineer",
    seniority_band: "ic",
    function: "Engineering",
    person_state: "MN",
    person_locality: "St. Paul",
    company_id: "C00022",
  },

  // Atlas Manufacturing Co
  {
    full_name: "Edith Volkov",
    title: "Chief Operating Officer",
    seniority_band: "c_suite",
    function: "Operations",
    person_state: "MI",
    person_locality: "Detroit",
    company_id: "C00023",
  },
  {
    full_name: "Reese Calloway",
    title: "VP of Engineering",
    seniority_band: "vp",
    function: "Engineering",
    person_state: "MI",
    person_locality: "Ann Arbor",
    company_id: "C00023",
  },
  {
    full_name: "Imani Barnes",
    title: "Director of Quality",
    seniority_band: "director",
    function: "Operations",
    person_state: "MI",
    person_locality: "Detroit",
    company_id: "C00023",
  },

  // Mesa Health Networks
  {
    full_name: "Dr. Andre Pelletier",
    title: "Chief Medical Officer",
    seniority_band: "c_suite",
    function: "Executive",
    person_state: "AZ",
    person_locality: "Tucson",
    company_id: "C00024",
  },
  {
    full_name: "Beatrice Holloway",
    title: "VP of Revenue Cycle",
    seniority_band: "vp",
    function: "Finance",
    person_state: "AZ",
    person_locality: "Phoenix",
    company_id: "C00024",
  },

  // Coastal Energy Partners
  {
    full_name: "Diego Marchetti",
    title: "President",
    seniority_band: "c_suite",
    function: "Executive",
    person_state: "TX",
    person_locality: "Houston",
    company_id: "C00025",
  },
  {
    full_name: "Anya Volkonskaya",
    title: "VP of Engineering",
    seniority_band: "vp",
    function: "Engineering",
    person_state: "TX",
    person_locality: "Houston",
    company_id: "C00025",
  },

  // Summit Financial Advisors
  {
    full_name: "Christine Petraglia",
    title: "Founder & Managing Partner",
    seniority_band: "founder",
    function: "Executive",
    person_state: "UT",
    person_locality: "Salt Lake City",
    company_id: "C00026",
  },
  {
    full_name: "Devon Northcutt",
    title: "Senior Advisor",
    seniority_band: "ic",
    function: "Finance",
    person_state: "UT",
    person_locality: "Park City",
    company_id: "C00026",
  },

  // Cypress Real Estate
  {
    full_name: "Renée Beaumont",
    title: "Managing Director",
    seniority_band: "director",
    function: "Executive",
    person_state: "FL",
    person_locality: "Tampa",
    company_id: "C00027",
  },
  {
    full_name: "Cooper Hartwell",
    title: "Director of Acquisitions",
    seniority_band: "director",
    function: "Finance",
    person_state: "FL",
    person_locality: "Orlando",
    company_id: "C00027",
  },

  // Highland Defense Research
  {
    full_name: "Dr. Felix Sutherland",
    title: "Chief Scientist",
    seniority_band: "c_suite",
    function: "Engineering",
    person_state: "VA",
    person_locality: "McLean",
    company_id: "C00028",
  },
  {
    full_name: "Vanessa Tremaine",
    title: "VP of Federal Programs",
    seniority_band: "vp",
    function: "Sales",
    person_state: "VA",
    person_locality: "Reston",
    company_id: "C00028",
  },

  // Lakeshore Telecom
  {
    full_name: "Patrice Yamamoto",
    title: "Chief Network Officer",
    seniority_band: "c_suite",
    function: "Engineering",
    person_state: "IL",
    person_locality: "Chicago",
    company_id: "C00029",
  },
  {
    full_name: "Garrett Whitfield",
    title: "Director of Enterprise Sales",
    seniority_band: "director",
    function: "Sales",
    person_state: "IL",
    person_locality: "Naperville",
    company_id: "C00029",
  },

  // Cobalt Software Studios
  {
    full_name: "Hollis Renner",
    title: "Co-founder & CEO",
    seniority_band: "founder",
    function: "Executive",
    person_state: "OR",
    person_locality: "Portland",
    company_id: "C00030",
  },
  {
    full_name: "Margaux Bellini",
    title: "Head of Design",
    seniority_band: "director",
    function: "Design",
    person_state: "OR",
    person_locality: "Portland",
    company_id: "C00030",
  },
  {
    full_name: "Joaquin Vasquez",
    title: "Senior Engineer",
    seniority_band: "ic",
    function: "Engineering",
    person_state: "OR",
    person_locality: "Beaverton",
    company_id: "C00030",
  },
];

function emailFor(seed: PersonSeed, company: Company): string {
  const parts = seed.full_name
    .replace(/^Dr\.?\s+/, "")
    .replace(/^Colonel.*?\s/, "")
    .split(/\s+/);
  const first = parts[0]?.toLowerCase() ?? "person";
  const last = parts[parts.length - 1]?.toLowerCase().replace(/[^a-z]/g, "") ?? "x";
  return `${first}.${last}@${company.website}`;
}

function linkedinFor(seed: PersonSeed): string {
  const slug = seed.full_name
    .toLowerCase()
    .replace(/^dr\.?\s+/, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `linkedin.com/in/${slug}`;
}

export const TAM_FIXTURE: TamRow[] = PEOPLE.map((p, i) => {
  const c = cm.get(p.company_id);
  if (!c) throw new Error(`unknown company ${p.company_id}`);
  return {
    person_id: `P${String(i + 1).padStart(5, "0")}`,
    full_name: p.full_name,
    title: p.title,
    seniority_band: p.seniority_band,
    function: p.function,
    person_state: p.person_state,
    person_locality: p.person_locality,
    email: emailFor(p, c),
    linkedin: linkedinFor(p),
    company_id: c.id,
    company_name: c.name,
    industry: c.industry,
    employee_band: c.employee_band,
    revenue_band: c.revenue_band,
    company_hq_state: c.hq_state,
    company_hq_locality: c.hq_locality,
    founded_year: c.founded_year,
    website: c.website,
  };
});
