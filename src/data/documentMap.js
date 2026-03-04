// AFL Product Code Document Map
// Auto-generated from AFL_Product_Matrix_Real.xlsx — Document Map sheet
// Patterns use wildcards: any non-alphanumeric character matches any position

// ============================================================================
// DOCUMENT MAP — all pattern → document mappings
// Order matters: first match per document type wins
// ============================================================================

// Base URL for document hosting. Override via environment for Azure Blob, etc.
// Default: relative /docs/ path (served from public/docs/ by Vite)
const DOC_BASE_URL = '/docs'

export const documentMap = [
  // --- Stripping ---
  { pattern: 'K3M**********', type: 'Stripping', name: 'K3Mx CABLE STRIPPING INSTRUCTIONS', url: `${DOC_BASE_URL}/stripping/K3Mx%20CABLE%20STRIPPING%20INSTRUCTIONS.pdf` },
  { pattern: 'LMD**********', type: 'Stripping', name: 'LMDx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/LMDx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'LMH**********', type: 'Stripping', name: 'LMHx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/LMHx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'LQD**********', type: 'Stripping', name: 'LQDx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/LQDx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'LQH**********', type: 'Stripping', name: 'LQHx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/LQHx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'NLD**********', type: 'Stripping', name: 'NLDx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/NLDx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'NMD**********', type: 'Stripping', name: 'NMDx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/NMDx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'RLD**********', type: 'Stripping', name: 'RLD Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/RLD%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'SMJ**********', type: 'Stripping', name: 'SMJx Cable Stripping Instructions (Double Jacket)', url: `${DOC_BASE_URL}/stripping/SMJx%20Cable%20Stripping%20Instructions%20%28Double%20Jacket%29.pdf` },
  { pattern: 'SMM**********', type: 'Stripping', name: 'SMMx Cable Stripping Instructions (Single Jacket)', url: `${DOC_BASE_URL}/stripping/SMMx%20Cable%20Stripping%20Instructions%20%28Single%20Jacket%29.pdf` },
  { pattern: 'UTE**********', type: 'Stripping', name: 'UTEx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/UTEx%20Cable%20Stripping%20Instructions.pdf` },
  { pattern: 'UTN**********', type: 'Stripping', name: 'UTNx Cable Stripping Instructions', url: `${DOC_BASE_URL}/stripping/UTNx%20Cable%20Stripping%20Instructions.pdf` },

  // --- Installation ---
  { pattern: 'S************', type: 'Installation', name: 'ADSS Installation Instruction - Quick Reference Guide', url: `${DOC_BASE_URL}/installation/ADSS%20Installation%20Instruction%20-%20Quick%20Reference%20Guide.pdf` },
  { pattern: 'S************', type: 'Installation', name: 'ADSS Installation Instructions', url: `${DOC_BASE_URL}/installation/ADSS%20Installation%20Instructions.pdf` },
  { pattern: 'L************', type: 'Installation', name: 'Loose Tube Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/Loose%20Tube%20Installation%20%26%20Application%20Instructions.pdf` },
  { pattern: 'N************', type: 'Installation', name: 'Loose Tube Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/Loose%20Tube%20Installation%20%26%20Application%20Instructions.pdf` },
  { pattern: 'R************', type: 'Installation', name: 'Loose Tube Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/Loose%20Tube%20Installation%20%26%20Application%20Instructions.pdf` },
  { pattern: 'B************', type: 'Installation', name: 'Loose Tube Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/Loose%20Tube%20Installation%20%26%20Application%20Instructions.pdf` },
  { pattern: 'U************', type: 'Installation', name: 'MicroCore Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/MicroCore%20Installation%20%26%20Application%20Instructions.pdf` },
  { pattern: 'U************', type: 'Installation', name: 'MicroCore Cable Installation - Handling Tips', url: `${DOC_BASE_URL}/installation/MicroCore%20Cable%20Installation%20-%20Handling%20Tips.pdf` },
  { pattern: 'T************', type: 'Installation', name: 'Premise Cable Installation & Application Instructions', url: `${DOC_BASE_URL}/installation/Premise%20%28Tight%20Buffered%29%20Cable%20Installation%20%26%20Application%20Instructions.pdf` },

  // --- TDS ---
  { pattern: 'SMM4****048**', type: 'TDS', name: '48 Fibre Short Span ADSS Cable', url: `${DOC_BASE_URL}/tds/48%20Fibre%20Short%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMM6****072**', type: 'TDS', name: '72 Fibre Short Span ADSS Cable', url: `${DOC_BASE_URL}/tds/72%20Fibre%20Short%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMM8****096**', type: 'TDS', name: '96 Fibre Short Span ADSS Cable', url: `${DOC_BASE_URL}/tds/96%20Fibre%20Short%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMMC****144**', type: 'TDS', name: '144 Fibre Short Span ADSS Cable', url: `${DOC_BASE_URL}/tds/144%20Fibre%20Short%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMJ5****060**', type: 'TDS', name: '60 Fibre Mid Span ADSS Cable', url: `${DOC_BASE_URL}/tds/60%20Fibre%20Mid%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMJ6****072**', type: 'TDS', name: '72 Fibre Mid Span ADSS Cable', url: `${DOC_BASE_URL}/tds/72%20Fibre%20Mid%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMJ8****096**', type: 'TDS', name: '96 Fibre Mid Span ADSS Cable', url: `${DOC_BASE_URL}/tds/96%20Fibre%20Mid%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'SMJC****144**', type: 'TDS', name: '144 Fibre Mid Span ADSS Cable', url: `${DOC_BASE_URL}/tds/144%20Fibre%20Mid%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'S**5****060**', type: 'TDS', name: '60 Fibre Long Span ADSS Cable', url: `${DOC_BASE_URL}/tds/60%20Fibre%20Long%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'S**6****072**', type: 'TDS', name: '72 Fibre Long Span ADSS Cable', url: `${DOC_BASE_URL}/tds/72%20Fibre%20Long%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'S**8****096**', type: 'TDS', name: '96 Fibre Long Span ADSS Cable', url: `${DOC_BASE_URL}/tds/96%20Fibre%20Long%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'S**C****144**', type: 'TDS', name: '144 Fibre Long Span ADSS Cable', url: `${DOC_BASE_URL}/tds/144%20Fibre%20Long%20Span%20ADSS%20Cable.pdf` },
  { pattern: 'LLB1*********', type: 'TDS', name: 'Mini Axial LT Cable LSZH', url: `${DOC_BASE_URL}/tds/Mini%20Axial%20LT%20Cable%20LSZH.pdf` },
  { pattern: 'LLD1*********', type: 'TDS', name: 'Mini Axial LT Cable', url: `${DOC_BASE_URL}/tds/Mini%20Axial%20LT%20Cable.pdf` },
  { pattern: 'LQB1*********', type: 'TDS', name: 'Axial LT Cable LSZH', url: `${DOC_BASE_URL}/tds/Axial%20LT%20Cable%20LSZH.pdf` },
  { pattern: 'LQH1*********', type: 'TDS', name: 'Axial LT Cable with Sacrificial sheath', url: `${DOC_BASE_URL}/tds/Axial%20LT%20Cable%20with%20Sacrifical%20sheath.pdf` },
  { pattern: 'LQD1*********', type: 'TDS', name: 'Axial LT Cable', url: `${DOC_BASE_URL}/tds/Axial%20LT%20Cable.pdf` },
  { pattern: 'NLD1*********', type: 'TDS', name: 'Axial NMA LT Cable', url: `${DOC_BASE_URL}/tds/Axial%20NMA%20LT%20Cable.pdf` },
  { pattern: 'LMD6****072**', type: 'TDS', name: '72F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/72F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMD8****096**', type: 'TDS', name: '96F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/96F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMDC****144**', type: 'TDS', name: '144F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/144F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMDO****288**', type: 'TDS', name: '288F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/288F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMDQ****312**', type: 'TDS', name: '312F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/312F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LTDQ****624**', type: 'TDS', name: '624F Stranded LT Cable', url: `${DOC_BASE_URL}/tds/624F%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMH6****072**', type: 'TDS', name: '72F Stranded LT Cable with Sacrificial Sheath', url: `${DOC_BASE_URL}/tds/72F%20Stranded%20LT%20Cable%20with%20Sacrificial%20Sheath.pdf` },
  { pattern: 'LMH8****096**', type: 'TDS', name: '96F Stranded LT Cable with Sacrificial sheath', url: `${DOC_BASE_URL}/tds/96F%20Stranded%20LT%20Cable%20with%20Sacrificial%20sheath.pdf` },
  { pattern: 'LMHC****144**', type: 'TDS', name: '144F Stranded LT Cable with Sacrificial Sheath', url: `${DOC_BASE_URL}/tds/144F%20Stranded%20LT%20Cable%20with%20Sacrificial%20Sheath.pdf` },
  { pattern: 'LMD6***M072**', type: 'TDS', name: '72F Stranded LT Cable with LSZH Sheath', url: `${DOC_BASE_URL}/tds/72F%20Stranded%20LT%20Cable%20with%20LSZH%20Sheath.pdf` },
  { pattern: 'LMD8***M096**', type: 'TDS', name: '96F Stranded LT Cable with LSZH Sheath', url: `${DOC_BASE_URL}/tds/96F%20Stranded%20LT%20Cable%20with%20LSZH%20Sheath.pdf` },
  { pattern: 'LMDC***M144**', type: 'TDS', name: '144F Stranded LT Cable with LSZH Sheath', url: `${DOC_BASE_URL}/tds/144F%20Stranded%20LT%20Cable%20with%20LSZH%20Sheath.pdf` },
  { pattern: 'NMD6****072**', type: 'TDS', name: '72F Stranded NMA LT Cable', url: `${DOC_BASE_URL}/tds/72F%20Stranded%20NMA%20LT%20Cable.pdf` },
  { pattern: 'NMD8****096**', type: 'TDS', name: '96F Stranded NMA LT Cable', url: `${DOC_BASE_URL}/tds/96F%20Stranded%20NMA%20LT%20Cable.pdf` },
  { pattern: 'NMDC****144**', type: 'TDS', name: '144F Stranded NMA LT Cable', url: `${DOC_BASE_URL}/tds/144F%20Stranded%20NMA%20LT%20Cable.pdf` },
  { pattern: 'NMD6***M072**', type: 'TDS', name: '72 Stranded NMA LTC LSZH Sheath', url: `${DOC_BASE_URL}/tds/72%20Stranded%20NMA%20LTC%20LSZH%20Sheath.pdf` },
  { pattern: 'NMD8***M096**', type: 'TDS', name: '96 NMA Stranded LTC LSZH Sheath', url: `${DOC_BASE_URL}/tds/96%20NMA%20Stranded%20LTC%20LSZH%20Sheath.pdf` },
  { pattern: 'NMDC***M144**', type: 'TDS', name: '144 NMA Stranded LTC LSZH Sheath', url: `${DOC_BASE_URL}/tds/144%20NMA%20Stranded%20LTC%20LSZH%20Sheath.pdf` },
  { pattern: 'UTN6****144**', type: 'TDS', name: '144F MicroCore Stranded LT Cable', url: `${DOC_BASE_URL}/tds/144F%20MicroCore%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'UTE6****144**', type: 'TDS', name: '144F MicroCore Stranded LTC with Sacrificial Sheath', url: `${DOC_BASE_URL}/tds/144F%20MicroCore%20Stranded%20LTC%20with%20Sacrifical%20Sheath.pdf` },
  { pattern: 'UTNC****288**', type: 'TDS', name: '288F MicroCore Stranded LT Cable', url: `${DOC_BASE_URL}/tds/288F%20MicroCore%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'UTEC****288**', type: 'TDS', name: '288F MicroCore Stranded LT with Sacrificial Sheath', url: `${DOC_BASE_URL}/tds/288F%20MicroCore%20Stranded%20LT%20with%20Sacrificial%20Sheath.pdf` },
  { pattern: 'LMJ6****072**', type: 'TDS', name: '72F High Strength Stranded LT Cable', url: `${DOC_BASE_URL}/tds/72F%20High%20Strength%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMJ8****096**', type: 'TDS', name: '96F High Strength Stranded LT Cable', url: `${DOC_BASE_URL}/tds/96F%20High%20Strength%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMJC****144**', type: 'TDS', name: '144F High Strength Stranded LT Cable', url: `${DOC_BASE_URL}/tds/144F%20High%20Strength%20Stranded%20LT%20Cable.pdf` },
  { pattern: 'LMK6****072**', type: 'TDS', name: '72F High Strength Stranded Loose Tube Cable SS', url: `${DOC_BASE_URL}/tds/72F%20High%20Strength%20Stranded%20Loose%20Tube%20Cable%20SS.pdf` },
  { pattern: 'LMK8****096**', type: 'TDS', name: '96F High Strength Stranded Loose Tube Cable SS', url: `${DOC_BASE_URL}/tds/96F%20High%20Strength%20Stranded%20Loose%20Tube%20Cable%20SS.pdf` },
  { pattern: 'LMKC****144**', type: 'TDS', name: '144F High Strength Stranded Loose Tube Cable SS', url: `${DOC_BASE_URL}/tds/144F%20High%20Strength%20Stranded%20Loose%20Tube%20Cable%20SS.pdf` },
  { pattern: 'NMK6****072**', type: 'TDS', name: '72F High Strength Stranded NMA Loose Tube Cable', url: `${DOC_BASE_URL}/tds/72F%20High%20Strength%20Stranded%20NMA%20Loose%20Tube%20Cable.pdf` },
  { pattern: 'NMK8****096**', type: 'TDS', name: '96F High Strength Stranded NMA Loose Tube Cable', url: `${DOC_BASE_URL}/tds/96F%20High%20Strength%20Stranded%20NMA%20Loose%20Tube%20Cable.pdf` },
  { pattern: 'NMKC****144**', type: 'TDS', name: '144F High Strength Stranded NMA Loose Tube Cable', url: `${DOC_BASE_URL}/tds/144F%20High%20Strength%20Stranded%20NMA%20Loose%20Tube%20Cable.pdf` },
  { pattern: 'RMD8****096**', type: 'TDS', name: '96F NM Flat Rod Armoured LT Cable - RMD8', url: `${DOC_BASE_URL}/tds/96F%20NM%20Flat%20Rod%20Armoured%20LT%20Cable%20%20-%20RMD8.pdf` },
  { pattern: 'RMF6****144**', type: 'TDS', name: '144F NM Flat FRP Armoured LT Cable - RMF6', url: `${DOC_BASE_URL}/tds/144F%20NM%20Flat%20FRP%20Armoured%20LT%20Cable%20-%20RMF6.pdf` },
  { pattern: 'RLD1*********', type: 'TDS', name: 'Axial Non-Metallic Flat FRP Armoured LTC', url: `${DOC_BASE_URL}/tds/Axial%20Non-Metallic%20Flat%20FRP%20Armoured%20LTC.pdf` },
  { pattern: 'RLB1*********', type: 'TDS', name: 'Axial Non-Metallic Flat FRP Armoured LTC - LSZH Sheath', url: `${DOC_BASE_URL}/tds/Axial%20Non-Metallic%20Flat%20FRP%20Armoured%20LTC%20-%20LSZH%20Sheath.pdf` },
  { pattern: 'TVBQ*********', type: 'TDS', name: 'TVBQ - Indoor Outdoor Premise Tight Buffered Cable', url: `${DOC_BASE_URL}/tds/TVBQ%20-%20Indoor%20Outdoor%20Premise%20Tight%20Buffered%20Cable.pdf` },
  { pattern: 'S************', type: 'TDS', name: 'ADSS Accessories Selection Guide', url: `${DOC_BASE_URL}/tds/ADSS%20Accessories%20Selection%20Guide.pdf` },
  { pattern: 'S************', type: 'TDS', name: 'ADSS Product Line Reference Sheet', url: `${DOC_BASE_URL}/tds/ADSS%20Product%20Line%20Reference%20Sheet.pdf` },
  { pattern: 'S************', type: 'TDS', name: 'AFL ADSS Electrical Stress Report Summary', url: `${DOC_BASE_URL}/tds/AFL%20ADSS%20Electrical%20Stress%20Report%20Summary.pdf` },
  { pattern: 'S************', type: 'TDS', name: 'Electrical Stress Questionnaire', url: `${DOC_BASE_URL}/tds/Electrical%20Stress%20Questionnaire.pdf` },
  { pattern: 'S************', type: 'TDS', name: 'Part Number Overview - ADSS Cables', url: `${DOC_BASE_URL}/tds/Part%20Number%20Overview%20_ADSS%20Cables.pdf` },
  { pattern: 'T************', type: 'TDS', name: 'AFL Premise Competitor Cross Reference - INTERNAL USE ONLY', url: `${DOC_BASE_URL}/tds/AFL%20Premise%20Competitor%20Cross%20Reference%2012.21%20-%20INTERNAL%20USE%20ONLY.pdf` },
  { pattern: 'T************', type: 'TDS', name: 'AFL Riser Cables ANZ 0819 - TWB-AP', url: `${DOC_BASE_URL}/tds/AFL%20Riser%20Cables%20%20ANZ%200819%20-%20TWB-AP.pdf` },
  { pattern: 'T************', type: 'TDS', name: 'Part Number Overview Aust Manufactured Premise Cable', url: `${DOC_BASE_URL}/tds/Part%20Number%20Overview%20Aust%20Manufactured%20Premise%20Cable.pdf` },
  { pattern: 'L************', type: 'TDS', name: 'Part Number Overview - TLC Cables', url: `${DOC_BASE_URL}/tds/Part%20Number%20Overview%20_TLC%20Cables%2004.24.pdf` },
  { pattern: 'L************', type: 'TDS', name: 'Stock Cable lengths for 1200mm Drum', url: `${DOC_BASE_URL}/tds/Stock%20Cable%20lengths%20for%201200mm%20Drum.pdf` },

  // --- Test Certificate ---
  { pattern: 'SMM4**L*048**', type: 'Test Certificate', name: 'SMM4xxLx048 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/181220%20SMM4xxLx048.pdf` },
  { pattern: 'NMD61DPB048BK', type: 'Test Certificate', name: 'NMD61DPB048BK Test Certificate', url: `${DOC_BASE_URL}/test-certificates/191011%20NMD61DPB048BK.pdf` },
  { pattern: 'N3D**EB******', type: 'Test Certificate', name: 'N3DxxEB Test Certificate', url: `${DOC_BASE_URL}/test-certificates/210909%20N3DxxEB%20Test%20Certificate.pdf` },
  { pattern: 'LMD6**PA*****', type: 'Test Certificate', name: 'LMD6xxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/210917%20LMD6xxPA%20%28SZ7%29%20Test%20Certificate.pdf` },
  { pattern: 'LMH6**PA*****', type: 'Test Certificate', name: 'LMD6xxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/210917%20LMD6xxPA%20%28SZ7%29%20Test%20Certificate.pdf` },
  { pattern: 'LMDC**PA*****', type: 'Test Certificate', name: 'LMDCxxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/211217%20LMDCxxPA%20%28SZ7%29%20Test%20Certificate.pdf` },
  { pattern: 'LMHC**PA*****', type: 'Test Certificate', name: 'LMDCxxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/211217%20LMDCxxPA%20%28SZ7%29%20Test%20Certificate.pdf` },
  { pattern: 'BMMC**LC144BK', type: 'Test Certificate', name: 'BMMCxxLC144BK Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220124%20BMMCxxLC144BK%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA012**', type: 'Test Certificate', name: 'TVBQxxAAxx12 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220209%20TVBQxxAAxx12%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA024**', type: 'Test Certificate', name: 'TVBQxxAAxx24 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220209%20TVBQxxAAxx24%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA008**', type: 'Test Certificate', name: 'TVBQxxAAxx8 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220209%20TVBQxxAAxx8%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA002**', type: 'Test Certificate', name: 'TVBQxxAAxx2 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220210%20TVBQxxAAxx2%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA004**', type: 'Test Certificate', name: 'TVBQxxAAxx4 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220210%20TVBQxxAAxx4%20Test%20Certificate.pdf` },
  { pattern: 'LLB1**EA*****', type: 'Test Certificate', name: 'LLB1xxEA Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220216%20LLB1xxEA%20Test%20Certificate.pdf` },
  { pattern: 'LMK6**JA*****', type: 'Test Certificate', name: 'LMK6xxJA Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220216%20LMK6xxJA%20Test%20Certificate.pdf` },
  { pattern: 'LQB1**EA*****', type: 'Test Certificate', name: 'LQB1xxEA Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220216%20LQB1xxEA%20Test%20Certificate.pdf` },
  { pattern: 'UTE6**FD*****', type: 'Test Certificate', name: 'UTE6xxFD Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220216%20UTE6xxFD%20Test%20Certificate.pdf` },
  { pattern: 'UTNC**FD*****', type: 'Test Certificate', name: 'UTNCxxFD Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220216%20UTNCxxFD%20Test%20Certificate.pdf` },
  { pattern: 'TVBQ**AA006**', type: 'Test Certificate', name: 'TVBQxxAAxx6 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220224%20TVBQxxAAxx6%20Test%20Certificate.pdf` },
  { pattern: 'TVAQ**AA006**', type: 'Test Certificate', name: 'TVBQxxAAxx6 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220224%20TVBQxxAAxx6%20Test%20Certificate.pdf` },
  { pattern: 'TVAQ**AA012**', type: 'Test Certificate', name: 'TVBQxxAAxx12 Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220209%20TVBQxxAAxx12%20Test%20Certificate.pdf` },
  { pattern: 'LMDQ**PA*****', type: 'Test Certificate', name: 'LMDQxxPA Test Certificate', url: `${DOC_BASE_URL}/test-certificates/220331%20LMDQxxPA%20Test%20Certificate.pdf` },
  { pattern: 'SMM51DLL060BK', type: 'Test Certificate', name: 'SMM51DLL060BK Test Certificate', url: `${DOC_BASE_URL}/test-certificates/231024%20SMM51DLL060BK%20Test%20Certificate.pdf` },
  { pattern: 'BMJ51DLE048BK', type: 'Test Certificate', name: 'BMJ51DLE048BK Test Certificate', url: `${DOC_BASE_URL}/test-certificates/231025%20BMJ51DLE048BK%20Test%20Certificate.pdf` },
  { pattern: 'LTDQ**LA*****', type: 'Test Certificate', name: 'LTDQxxLA Test Certificate', url: `${DOC_BASE_URL}/test-certificates/231025%20LTDQxxLA%20Test%20Certificate.pdf` },
  { pattern: 'RLD1**F******', type: 'Test Certificate', name: 'RLD1xxF Test Certificate', url: `${DOC_BASE_URL}/test-certificates/240331%20RLD1xxF%20Test%20Certificate.pdf` },
  { pattern: 'NMDC1DPB144BK', type: 'Test Certificate', name: 'NMDC1DPB144BK Type Test Certificate', url: `${DOC_BASE_URL}/test-certificates/240506%20NMDC1DPB144BK%20Type%20Test%20Certificate.pdf` },
  { pattern: 'LMD8**PA*****', type: 'Test Certificate', name: 'LMD8xxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/240805%20LMD8xxPA%20%28SZ7%29%20Test%20Certificate.pdf` },
  { pattern: 'LMH8**PA*****', type: 'Test Certificate', name: 'LMD8xxPA (SZ7) Test Certificate', url: `${DOC_BASE_URL}/test-certificates/240805%20LMD8xxPA%20%28SZ7%29%20Test%20Certificate.pdf` },

]
// ============================================================================
// PATTERN MATCHING
// ============================================================================

/**
 * Check if a character is alphanumeric (A-Z, a-z, 0-9).
 * Non-alphanumeric characters in patterns act as wildcards.
 */
function isAlphanumeric(ch) {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) ||  // A-Z
         (code >= 97 && code <= 122) ||  // a-z
         (code >= 48 && code <= 57)      // 0-9
}

/**
 * Match a 13-character product code against a 13-character pattern.
 * Non-alphanumeric characters in the pattern are wildcards (match anything).
 * Comparison is case-insensitive.
 */
export function patternMatches(code, pattern) {
  if (code.length !== 13 || pattern.length !== 13) return false

  for (let i = 0; i < 13; i++) {
    const pc = pattern[i]
    if (!isAlphanumeric(pc)) continue // wildcard
    if (pc.toUpperCase() !== code[i].toUpperCase()) return false
  }
  return true
}

/**
 * Find all matching documents for a product code.
 * Returns first match per type for primary types (TDS, Stripping, Test Certificate),
 * plus ALL Installation matches and any additional matches as "Other".
 */
export function findDocuments(productCode) {
  const code = productCode.toUpperCase().trim()
  if (code.length !== 13) return []

  const found = {
    TDS: null,
    Stripping: null,
    'Test Certificate': null,
  }
  const installationDocs = []
  const otherDocs = []

  for (const entry of documentMap) {
    if (!patternMatches(code, entry.pattern)) continue

    if (entry.type === 'Installation') {
      installationDocs.push({ ...entry })
    } else if (found[entry.type] === undefined) {
      otherDocs.push({ ...entry })
    } else if (found[entry.type] === null) {
      found[entry.type] = { ...entry }
    }
    // skip duplicates of already-found primary types
  }

  const results = []
  if (found.TDS) results.push(found.TDS)
  if (found.Stripping) results.push(found.Stripping)
  if (found['Test Certificate']) results.push(found['Test Certificate'])
  results.push(...installationDocs)
  results.push(...otherDocs)

  return results
}

// ============================================================================
// PRODUCT CODE DECODE TABLES
// ============================================================================

const familyDecode = {
  L: 'Loose Tube',
  N: 'Non-Metallic Armour',
  R: 'FRP Flat Rod Armour',
  U: 'Microcore',
  T: 'Tight Buffer / Premise',
  S: 'Aerial (ADSS)',
}

const looseTubeFibresPerTube = {
  K: '6 Fibres/Tube',
  P: '8 Fibres/Tube',
  M: '12 Fibres/Tube',
  T: '24 Fibres/Tube',
  Q: 'Axial Tube (Std Strength)',
  L: 'Axial Tube (Light Strength)',
}

const premiseCoreType = {
  V: 'Indoor/Outdoor Premise (New)',
  W: 'Indoor/Outdoor Premise',
}

const adssFibresPerTube = {
  K: '6 Fibres Per Tube',
  M: '12 Fibres Per Tube',
  T: '24 Fibres Per Tube',
}

const looseTubeConstruction = {
  B: 'LSZH',
  C: 'PE',
  D: 'PE/Nylon',
  E: 'Nylon',
  F: 'Nylon/PE',
  H: 'PE/Nylon/Sacrificial Jacket',
  J: 'PE/Nylon (HS1)',
  K: 'PE/Nylon/PE (HS1)',
  N: 'Nylon/Thin PE (Microcore)',
}

const premiseOuterJacket = {
  A: 'PVC',
  B: 'LSZH',
}

const adssConstruction = {
  M: 'Aramid/PE',
  J: 'PE/Aramid/PE',
  N: 'Aramid/TR-PE',
  T: 'PE/Aramid/TR-PE',
  K: 'PE/FRP/PE',
  8: 'NY/Aramid/PE',
  9: 'NY/Aramid/TR-PE',
}

const looseTubeCoreStructure = {
  1: '1 Axial Tube (No CSM)',
  6: '6 Tubes Around CSM',
  8: '8 Tubes Around CSM',
  A: '10 Tubes Around CSM',
  C: '12 Tubes Around CSM',
  I: '18 Tubes Around CSM (Dual Layer)',
  O: '24 Tubes Around CSM (Dual Layer)',
  Q: '26 Tubes Around CSM (Dual Layer)',
}

const premiseTightBuffer = {
  Q: '900um LSZH',
  P: '900um PVC',
}

const adssCoreStructure = {
  4: '4 Tubes Around CSM',
  5: '5 Tubes Around CSM',
  6: '6 Tubes Around CSM',
  8: '8 Tubes Around CSM',
  C: '12 Tubes Around CSM',
}

const fibreType = {
  '1D': 'SM G.652.D',
  '1E': 'SM Premium Low Loss G.652.D',
  '1F': 'SM Bend Insensitive G.657.A1',
  '53': 'OM3',
  '55': 'OM4',
  '62': 'OM1',
  'D6': 'SM G.652.D + OM1',
  'D3': 'SM G.652.D + OM3',
  'D5': 'SM G.652.D + OM4',
}

const looseTubeTubeSize = {
  P: '2mm (Max 12F/Tube)',
  F: '2.3mm (Max 24F/Tube)',
  L: '2.7mm (Max 24F/Tube)',
  E: '3.2mm (Max 24F/Tube)',
  J: '3.2mm HS1 (Max 12F/Tube)',
}

const premiseSubUnit = {
  A: 'Standard (No Sub-Units)',
}

const adssTubeSize = {
  P: '2mm (Max 12F/Tube)',
  L: '2.7mm (Max 24F/Tube)',
}

const looseTubeVariation = {
  A: 'Standard',
  B: 'Nylon Only / PE Coloured Sacrificial',
  M: 'LSZH Outer Jacket',
  F: 'Additional Outer Nylon Jacket',
  D: 'Additional Thin PE Outer Jacket (Microcore)',
  L: 'MDPE',
}

const jacketColour = {
  BE: 'Blue',
  GY: 'Grey',
  WE: 'White',
  RD: 'Red',
  BK: 'Black',
  YW: 'Yellow',
  OE: 'Orange',
  GN: 'Green',
  BN: 'Brown',
  VT: 'Violet',
  PK: 'Pink',
  AQ: 'Aqua',
  EV: 'Erica Violet',
}

/**
 * Decode a 13-character AFL product code into human-readable fields.
 * Returns an array of { label, positions, code, description } objects.
 */
export function decodeProductCode(productCode) {
  const code = productCode.toUpperCase().trim()
  if (code.length !== 13) return []

  const family = code[0]
  const result = []

  const lookup = (table, key) => table[key] || `${key} (Unknown)`

  // Position 1: Product Family
  result.push({
    label: 'Product Family',
    positions: '1',
    code: code[0],
    description: lookup(familyDecode, code[0]),
  })

  if (family === 'T') {
    // Premise decode
    result.push({ label: 'Core Type', positions: '2', code: code[1], description: lookup(premiseCoreType, code[1]) })
    result.push({ label: 'Outer Jacket', positions: '3', code: code[2], description: lookup(premiseOuterJacket, code[2]) })
    result.push({ label: 'Tight Buffer', positions: '4', code: code[3], description: lookup(premiseTightBuffer, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Sub-Unit', positions: '7', code: code[6], description: lookup(premiseSubUnit, code[6]) })
    result.push({ label: 'Construction', positions: '8', code: code[7], description: 'Standard' })
  } else if (family === 'S') {
    // ADSS decode
    result.push({ label: 'Fibres Per Tube', positions: '2', code: code[1], description: lookup(adssFibresPerTube, code[1]) })
    result.push({ label: 'Cable Construction', positions: '3', code: code[2], description: lookup(adssConstruction, code[2]) })
    result.push({ label: 'Core Structure', positions: '4', code: code[3], description: lookup(adssCoreStructure, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Tube Size', positions: '7', code: code[6], description: lookup(adssTubeSize, code[6]) })
    result.push({ label: 'ADSS Strength', positions: '8', code: code[7], description: `Strength Code: ${code[7]}` })
  } else {
    // Loose Tube (L, N, R, U)
    result.push({ label: 'Fibres Per Tube', positions: '2', code: code[1], description: lookup(looseTubeFibresPerTube, code[1]) })
    result.push({ label: 'Cable Construction', positions: '3', code: code[2], description: lookup(looseTubeConstruction, code[2]) })
    result.push({ label: 'Core Structure', positions: '4', code: code[3], description: lookup(looseTubeCoreStructure, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Tube Size', positions: '7', code: code[6], description: lookup(looseTubeTubeSize, code[6]) })
    result.push({ label: 'Construction Variation', positions: '8', code: code[7], description: lookup(looseTubeVariation, code[7]) })
  }

  // Positions 9-11: Fibre Count (shared)
  const fibreCount = parseInt(code.slice(8, 11), 10)
  result.push({
    label: 'Fibre Count',
    positions: '9-11',
    code: code.slice(8, 11),
    description: `${fibreCount} Fibres`,
  })

  // Positions 12-13: Jacket Colour (shared)
  result.push({
    label: 'Jacket Colour',
    positions: '12-13',
    code: code.slice(11, 13),
    description: lookup(jacketColour, code.slice(11, 13)),
  })

  return result
}

// ============================================================================
// DOCUMENT TYPE METADATA (icons, colors)
// ============================================================================

export const docTypeInfo = {
  TDS: { label: 'Technical Data Sheet', color: '#003366', abbr: 'TDS' },
  Stripping: { label: 'Stripping Instructions', color: '#003366', abbr: 'STRIP' },
  'Test Certificate': { label: 'Test Certificate', color: '#003366', abbr: 'CERT' },
  'Final Test Certificate': { label: 'Final Test Certificate', color: '#003366', abbr: 'FTC' },
  Installation: { label: 'Installation Guide', color: '#003366', abbr: 'INST' },
  Other: { label: 'Other Document', color: '#003366', abbr: 'DOC' },
}
