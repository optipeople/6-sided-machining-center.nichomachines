/**
 * ROI Calculator — Solution Variants
 *
 * Add one entry per løsningsforslag i SOLUTIONS-arrayet.
 * Hvert produkt-id matcher id-feltet i products.ts.
 * processingTimeSec: maskintid i sekunder pr. emne (0 = produktet bearbejdes ikke i denne løsning).
 *
 * automationOptions: valgfrie tilkøb der forbedrer OEE og/eller reducerer operatørbehov.
 * Hvert option summeres til investering og OEE, når kunden vælger det i trin 3.
 */

export type AutomationOption = {
  /** Kort navn vist i UI */
  name: string;
  /** Beskrivelse vist under navnet */
  description: string;
  /** Merpris i EUR */
  priceEur: number;
  /** OEE-forbedring i procentpoint (f.eks. 8 = +8 pp) */
  oeeBoostPct: number;
  /** Reduktion i antal operatører (f.eks. 0.5 = halvt årsværk) */
  operatorReduction: number;
};

export type SolutionVariant = {
  /** Løsningens navn, f.eks. "Drilling Cell Standard" */
  name: string;

  /** Kort beskrivelse vist i trin 3 — hvad kendetegner løsningen */
  description: string;

  /** Valgfrit billede af maskinen — sti relativt til /public, fx "/solutions/double-machine.png" */
  image?: string;

  /** Forventet OEE i procent (0–100) */
  oeePercent: number;

  /** Antal operatører nødvendigt for at køre maskinen */
  operators: number;

  /** Investeringspris i EUR (ekskl. automatisering) */
  investmentEur: number;

  /** Maskintid i sekunder pr. emne for hvert produkt-id */
  processingTimeSec: Record<string, number>;

  /** Valgfrie automatiseringstilkøb */
  automationOptions?: AutomationOption[];
};

export const SOLUTIONS: SolutionVariant[] = [
  {
    name: "Single Machine - Single Side Drilling",
    description: "A single machine with one drilling unita and manual in/outfeed.",
    image: "/solutions/Single-Machine-Single-side-drilling.png",
    oeePercent: 60,
    operators: 1,
    investmentEur: 68_000,
    processingTimeSec: {
      "Special Milling Panel":   45,
      "Sliding Door":            60,
      "Hinge Door":              55,
      "Fixed Shelf":             30,
      "Tall Cabinet Side":       90,
      "Middle Base w/ Groove":   40,
      "Plinth Front":            25,
      "Drawer Front":            35,
      "Cabinet Side":            50,
    },
    automationOptions: [
      {
        name: "Automatic Loading / Unloading",
        description: "Conveyor-based panel feed and discharge — eliminates manual handling between operations.",
        priceEur: 25_000,
        oeeBoostPct: 10,
        operatorReduction: 0.5,
      },
      {
        name: "Real-time Production Monitoring",
        description: "OPC-UA integration with live dashboard for cycle times, downtime, and throughput.",
        priceEur: 8_000,
        oeeBoostPct: 5,
        operatorReduction: 0,
      },
    ],
  },

  {
    name: "Single Machine - Double Side Drilling",
    description: "One machine with double drilling units for increased capacity. Comes with manual in/outfeed",
    image: "/solutions/Single-Machine-double-side-drilling.png",
    oeePercent: 60,
    operators: 1,
    investmentEur: 98_000,
    processingTimeSec: {
      "Special Milling Panel":   35,
      "Sliding Door":            45,
      "Hinge Door":              42,
      "Fixed Shelf":             23,
      "Tall Cabinet Side":       68,
      "Middle Base w/ Groove":   30,
      "Plinth Front":            20,
      "Drawer Front":            27,
      "Cabinet Side":            38,
    },
    automationOptions: [
      {
        name: "Automatic Loading / Unloading",
        description: "Conveyor-based panel feed and discharge — eliminates manual handling between operations.",
        priceEur: 25_000,
        oeeBoostPct: 10,
        operatorReduction: 0.5,
      },
      {
        name: "Real-time Production Monitoring",
        description: "OPC-UA integration with live dashboard for cycle times, downtime, and throughput.",
        priceEur: 8_000,
        oeeBoostPct: 5,
        operatorReduction: 0,
      },
    ],
  },

  {
    name: "Double Machine - Double Side Drilling",
    description: "Two parallel double-side drilling units running simultaneously. Manual In/outfeed.",
    image: "/solutions/double-machine-double-side.png",
    oeePercent: 60,
    operators: 2,
    investmentEur: 140_000,
    processingTimeSec: {
      "Special Milling Panel":   23,
      "Sliding Door":            30,
      "Hinge Door":              28,
      "Fixed Shelf":             15,
      "Tall Cabinet Side":       45,
      "Middle Base w/ Groove":   20,
      "Plinth Front":            13,
      "Drawer Front":            18,
      "Cabinet Side":            25,
    },
    automationOptions: [
      {
        name: "Automatic Loading / Unloading",
        description: "Conveyor-based panel feed and discharge — eliminates manual handling between operations.",
        priceEur: 35_000,
        oeeBoostPct: 10,
        operatorReduction: 1,
      },
      {
        name: "Real-time Production Monitoring",
        description: "OPC-UA integration with live dashboard for cycle times, downtime, and throughput.",
        priceEur: 8_000,
        oeeBoostPct: 5,
        operatorReduction: 0,
      },
    ],
  },

   {
     name: "Double Machine - Double Side Drilling, Full Automation",
     description: "Two parallel double-side drilling units running simultaneously. With full automized return transportation and robot in/outfeed",
     image: "/solutions/double-machine-double-side-drilling-Full-Automation.png",
     oeePercent: 80,
     operators: 1,
     investmentEur: 220_000,
     processingTimeSec: {
       "Special Milling Panel":   23,
       "Sliding Door":            30,
       "Hinge Door":              28,
       "Fixed Shelf":             15,
       "Tall Cabinet Side":       45,
       "Middle Base w/ Groove":   20,
       "Plinth Front":            13,
       "Drawer Front":            18,
       "Cabinet Side":            25,
     },
     automationOptions: [],
   },
];
