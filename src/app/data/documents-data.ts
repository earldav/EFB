export type DocCategory = 'COMPANY' | 'OPERATIONS' | 'CREW' | 'AIRCRAFT' | 'GROUND OPERATIONS';

export const CATEGORY_ORDER: DocCategory[] = [
  'COMPANY',
  'OPERATIONS',
  'CREW',
  'AIRCRAFT',
  'GROUND OPERATIONS',
];

/** Un bloque de contenido. Segun `type` se usa un campo u otro:
 *  heading / paragraph / note -> text; list -> items; table -> rows. */
export interface DocBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'note';
  text?: string;
  items?: string[];
  rows?: { k: string; v: string }[];
}

export interface DocumentDef {
  id: string;
  title: string;
  category: DocCategory;
  revision: string;
  effective: string;
  issuer: string;
  /** Si es true, el documento no aparece en la lista (ni bloqueado) hasta
   *  que su regla de desbloqueo se cumple (ver unlock-engine.ts). */
  restricted?: boolean;
  blocks: DocBlock[];
}

export const documentsRegistry: DocumentDef[] = [
  {
    id: 'COM-EFB-001',
    title: 'EFB ADMINISTRATION AND DATA CURRENCY',
    category: 'COMPANY',
    revision: 'REV 03',
    effective: '01 MAR 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'This document describes the administration of the Electronic Flight Bag (EFB) and the currency of the data it presents.',
      },
      { type: 'heading', text: 'DATA STATUS INDICATORS' },
      {
        type: 'table',
        rows: [
          { k: 'LIVE', v: 'Data retrieved from its source at the time of display.' },
          { k: 'STATIC', v: 'Stored reference data. Not to be used for flight planning.' },
        ],
      },
      { type: 'heading', text: 'NAVIGATION DATABASE' },
      {
        type: 'paragraph',
        text: 'The navigation database is updated every 28 days, following the AIRAC cycle. The cycle in use is shown on the start-up screen. Crews must confirm that the database is current before departure.',
      },
      { type: 'heading', text: 'DOCUMENT REVISIONS' },
      {
        type: 'list',
        items: [
          'Each document shows its revision number and effective date.',
          'Documents are replaced, not edited. Superseded revisions are removed at the next synchronisation.',
          'In case of discrepancy between an EFB document and the Operations Manual, the Operations Manual prevails.',
        ],
      },
      {
        type: 'note',
        text: 'Report any EFB malfunction or data discrepancy to Flight Operations before departure.',
      },
    ],
  },
  {
    id: 'COM-SAF-002',
    title: 'SAFETY REPORTING',
    category: 'COMPANY',
    revision: 'REV 02',
    effective: '15 JAN 2027',
    issuer: 'SAFETY DEPARTMENT',
    blocks: [
      {
        type: 'paragraph',
        text: 'All crew members are encouraged to report hazards, incidents and occurrences. Reports are handled under just culture principles.',
      },
      { type: 'heading', text: 'MANDATORY REPORTING' },
      {
        type: 'paragraph',
        text: 'Occurrences defined by Regulation (EU) No 376/2014 must be reported within 72 hours of the occurrence becoming known to the reporter.',
      },
      { type: 'heading', text: 'WHAT TO REPORT' },
      {
        type: 'list',
        items: [
          'Technical defects or unexpected system behaviour.',
          'ATC or airspace related events.',
          'Weather encounters: turbulence, wind shear, lightning.',
          'Ground handling, loading and fuelling discrepancies.',
          'Fatigue or crew performance concerns.',
        ],
      },
      {
        type: 'note',
        text: 'Reports submitted in good faith will not lead to disciplinary action, except in cases of wilful misconduct or gross negligence.',
      },
    ],
  },
  {
    id: 'OPS-NOTICE-002',
    title: 'GROUND HANDLING STANDARDS',
    category: 'OPERATIONS',
    revision: 'REV 04',
    effective: '01 FEB 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Ground handling procedures at all served stations follow IATA Airport Handling Manual (AHM) standard practices unless otherwise noted in station-specific documentation.',
      },
      { type: 'heading', text: 'CREW RESPONSIBILITIES' },
      {
        type: 'list',
        items: [
          'Verify ground handling confirmation status via the applicable airport information module prior to departure planning.',
          'Confirm that loading, fuelling and boarding are coordinated with the handling agent.',
          'Report any handling discrepancy (loading, fuelling, pushback) to Flight Operations.',
        ],
      },
      {
        type: 'note',
        text: 'The PIC may refuse any ground service that does not meet safety standards.',
      },
    ],
  },
  {
    id: 'OPS-FUEL-003',
    title: 'FUEL POLICY SUMMARY',
    category: 'OPERATIONS',
    revision: 'REV 05',
    effective: '01 MAR 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Block fuel is calculated as the sum of the components below and is shown in the OFP fuel block.',
      },
      {
        type: 'table',
        rows: [
          { k: 'TAXI', v: 'Planned taxi-out time at standard consumption for the type.' },
          { k: 'TRIP', v: 'From take-off to landing at the destination, along the planned route and level.' },
          { k: 'CONTINGENCY', v: '5% of trip fuel.' },
          { k: 'ALTERNATE', v: 'From missed approach at the destination to landing at the alternate aerodrome.' },
          { k: 'FINAL RESERVE', v: '30 minutes at holding speed, 1,500 ft above aerodrome elevation.' },
          { k: 'EXTRA', v: 'Additional fuel at the discretion of the PIC.' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Take-off fuel is block fuel less taxi fuel. The PIC may request additional fuel; the final decision rests with the PIC.',
      },
    ],
  },
  {
    id: 'OPS-WX-004',
    title: 'WEATHER INFORMATION AND FLIGHT CATEGORIES',
    category: 'OPERATIONS',
    revision: 'REV 02',
    effective: '15 FEB 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Weather information in the EFB is presented as METAR and TAF style reports. The reports issued by the meteorological authority always prevail.',
      },
      { type: 'heading', text: 'FLIGHT CATEGORIES' },
      {
        type: 'table',
        rows: [
          { k: 'VFR', v: 'Visibility 5 SM or more and ceiling above 3,000 ft.' },
          { k: 'MVFR', v: 'Visibility 3 to 5 SM, or ceiling 1,000 to 3,000 ft.' },
          { k: 'IFR', v: 'Visibility 1 to less than 3 SM, or ceiling 500 to less than 1,000 ft.' },
          { k: 'LIFR', v: 'Visibility below 1 SM, or ceiling below 500 ft.' },
        ],
      },
      { type: 'heading', text: 'LIMITATIONS' },
      {
        type: 'list',
        items: [
          'Flight category indications are derived from visibility and cloud cover and are advisory only.',
          'Where cloud base is not reported, the EFB shows an estimated value. It must not be used as a reported ceiling.',
          'Forecast tables labelled DERIVED are generated from model data and do not replace the official TAF.',
        ],
      },
    ],
  },
  {
    id: 'OPS-MASS-005',
    title: 'MASS AND LOAD CLOSEOUT',
    category: 'OPERATIONS',
    revision: 'REV 03',
    effective: '01 MAR 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      { type: 'heading', text: 'STANDARD MASSES' },
      {
        type: 'table',
        rows: [
          { k: 'ADULT PASSENGER', v: '84 KG, including hand baggage.' },
          { k: 'CHECKED BAGGAGE', v: 'Actual weight, or the standard value in Operations Manual Part B.' },
        ],
      },
      { type: 'heading', text: 'LOAD CLOSEOUT' },
      {
        type: 'paragraph',
        text: 'The load closeout is issued once boarding and loading are complete. It confirms the final take-off weight, fuel on board, zero fuel weight and centre of gravity.',
      },
      {
        type: 'list',
        items: [
          'TOW: take-off weight (ZFW + fuel on board).',
          'FOB: fuel on board at departure.',
          'ZFW: zero fuel weight (EOW + payload).',
          'CG: centre of gravity, in percent MAC.',
          'TSOB: total souls on board (passengers, infants and crew).',
        ],
      },
      {
        type: 'note',
        text: 'If the closeout differs from the OFP by more than the tolerance in the Operations Manual, the PIC must be informed before pushback.',
      },
    ],
  },
  {
    id: 'OPS-CREW-001',
    title: 'CREW OPERATING PROCEDURES — GENERAL NOTICE',
    category: 'CREW',
    revision: 'REV 06',
    effective: '01 JAN 2027',
    issuer: 'FLIGHT OPERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'All crew members are reminded to complete pre-flight documentation review prior to EOBT. Any discrepancy between the OFP and the ATC filed flight plan must be reported to dispatch immediately.',
      },
      { type: 'heading', text: 'PRE-FLIGHT' },
      {
        type: 'list',
        items: [
          'Report time for flight crew is 60 minutes before STD, unless otherwise stated in the roster.',
          'Review the OFP and compare it with the ATC flight plan.',
          'Check NOTAMs and weather for departure, destination and alternate.',
          'Check fuel and weights against the load closeout.',
          'Verify the navigation database is current.',
          'Complete the crew briefing before boarding.',
        ],
      },
      {
        type: 'note',
        text: 'This document is for general reference and does not require acknowledgement.',
      },
    ],
  },
  {
    id: 'CREW-FTL-006',
    title: 'FLIGHT AND DUTY TIME LIMITATIONS',
    category: 'CREW',
    revision: 'REV 04',
    effective: '01 JAN 2027',
    issuer: 'FLIGHT CREW TRAINING',
    blocks: [
      {
        type: 'paragraph',
        text: 'Summary of the main limits. Reference: Regulation (EU) No 965/2012, Annex III (Part-ORO), Subpart FTL. Operations Manual Part A prevails.',
      },
      {
        type: 'table',
        rows: [
          { k: 'MAX DAILY FDP', v: '13:00 basic (start 06:00 to 13:29, 1 to 2 sectors).' },
          { k: 'MIN REST (HOME BASE)', v: '12:00, or the length of the preceding duty if longer.' },
          { k: 'MIN REST (AWAY)', v: '10:00.' },
          { k: 'DUTY PERIODS', v: '60 H / 7 DAYS · 110 H / 14 DAYS · 190 H / 28 DAYS.' },
          { k: 'FLIGHT TIME', v: '100 H / 28 DAYS · 900 H / CALENDAR YEAR · 1,000 H / 12 MONTHS.' },
        ],
      },
      {
        type: 'note',
        text: 'A crew member who considers themselves unfit to operate due to fatigue must declare it. The PIC has final authority.',
      },
    ],
  },
  {
    id: 'CREW-PAIR-007',
    title: 'CREW PAIRING AND CRM',
    category: 'CREW',
    revision: 'REV 02',
    effective: '15 FEB 2027',
    issuer: 'FLIGHT CREW TRAINING',
    blocks: [
      {
        type: 'paragraph',
        text: 'Each flight is operated by a PIC and a COP. The PIC has final authority for the safe conduct of the flight. The COP supports monitoring, cross-checks and standard callouts.',
      },
      { type: 'heading', text: 'BRIEFING' },
      {
        type: 'list',
        items: [
          'A crew briefing is held before every flight.',
          'Crew members flying together for the first time hold an extended briefing.',
          'Any crew member may call for a go-around or a stop at any time.',
        ],
      },
      { type: 'heading', text: 'COMPATIBILITY INDICATOR' },
      {
        type: 'paragraph',
        text: 'The PIC/COP compatibility indicator in the crew manifest is an internal planning aid based on previous joint operations. It is advisory only and does not replace the crew briefing.',
      },
    ],
  },
  {
    id: 'AC-A21N-008',
    title: 'A321NEO DATA SUMMARY',
    category: 'AIRCRAFT',
    revision: 'REV 03',
    effective: '01 MAR 2027',
    issuer: 'TECHNICAL DEPARTMENT',
    blocks: [
      {
        type: 'table',
        rows: [
          { k: 'TYPE', v: 'AIRBUS A321NEO (ICAO: A21N)' },
          { k: 'WAKE CATEGORY', v: 'M' },
          { k: 'SEATING', v: '239' },
          { k: 'MAX TAKEOFF WEIGHT', v: '97,000 KG' },
          { k: 'MAX LANDING WEIGHT', v: '79,200 KG' },
          { k: 'MAX ZERO FUEL WEIGHT', v: '75,600 KG' },
          { k: 'CRUISE', v: 'MACH 0.78' },
          { k: 'MAX OPERATING ALTITUDE', v: 'FL390' },
          { k: 'MIN FLIGHT CREW', v: '2' },
        ],
      },
      {
        type: 'paragraph',
        text: 'The registration of the aircraft assigned to each flight is confirmed closer to departure, according to fleet availability.',
      },
    ],
  },
  {
    id: 'GND-4471',
    title: 'POST-FLIGHT GROUND ARRANGEMENTS',
    category: 'GROUND OPERATIONS',
    revision: 'REV 02',
    effective: '14 MAY 2027',
    issuer: 'GROUND OPERATIONS',
    restricted: true,
    blocks: [
      {
        type: 'table',
        rows: [
          { k: 'ARRIVAL AIRPORT', v: 'LIMC — MILANO MALPENSA' },
          { k: 'GROUND VEHICLE', v: 'CAMPERVAN' },
          { k: 'COLLECTION', v: 'MILAN MALPENSA' },
          { k: 'CREW', v: '2' },
          { k: 'RENTAL PERIOD', v: '7 DAYS' },
          { k: 'PICK-UP DATE', v: '05 JUN 2027' },
          { k: 'RETURN', v: 'MILAN MALPENSA' },
          { k: 'RETURN DATE', v: '12 JUN 2027' },
          { k: 'STATUS', v: 'CONFIRMED' },
        ],
      },
      {
        type: 'note',
        text: 'AFTER LANDING — PROCEED TO VEHICLE COLLECTION POINT.',
      },
    ],
  },
];