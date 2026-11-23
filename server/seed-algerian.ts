import type { DatabaseSync } from 'node:sqlite';

interface CycleDef {
  id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  sort_order: number;
}

interface YearDef {
  id: string;
  cycle_id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  has_streams: number;
  sort_order: number;
}

interface StreamDef {
  id: string;
  year_id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  sort_order: number;
}

interface SubjectDef {
  id: string;
  cycle_id: string;
  year_id: string;
  stream_id: string | null;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  coefficient: number;
}

const CYCLES: CycleDef[] = [
  {
    id: 'cycle-primary',
    code: 'primary',
    name_ar: 'التعليم الابتدائي',
    name_fr: 'Enseignement Primaire',
    name_en: 'Primary Education',
    sort_order: 1,
  },
  {
    id: 'cycle-middle',
    code: 'middle',
    name_ar: 'التعليم المتوسط',
    name_fr: 'Enseignement Moyen',
    name_en: 'Middle School',
    sort_order: 2,
  },
  {
    id: 'cycle-secondary',
    code: 'secondary',
    name_ar: 'التعليم الثانوي',
    name_fr: 'Enseignement Secondaire',
    name_en: 'Secondary Education',
    sort_order: 3,
  },
];

const YEARS: YearDef[] = [
  { id: 'year-1ap', cycle_id: 'cycle-primary', code: '1AP', name_ar: 'السنة الأولى ابتدائي', name_fr: '1ère Année Primaire', name_en: '1st Year Primary', has_streams: 0, sort_order: 1 },
  { id: 'year-2ap', cycle_id: 'cycle-primary', code: '2AP', name_ar: 'السنة الثانية ابتدائي', name_fr: '2ème Année Primaire', name_en: '2nd Year Primary', has_streams: 0, sort_order: 2 },
  { id: 'year-3ap', cycle_id: 'cycle-primary', code: '3AP', name_ar: 'السنة الثالثة ابتدائي', name_fr: '3ème Année Primaire', name_en: '3rd Year Primary', has_streams: 0, sort_order: 3 },
  { id: 'year-4ap', cycle_id: 'cycle-primary', code: '4AP', name_ar: 'السنة الرابعة ابتدائي', name_fr: '4ème Année Primaire', name_en: '4th Year Primary', has_streams: 0, sort_order: 4 },
  { id: 'year-5ap', cycle_id: 'cycle-primary', code: '5AP', name_ar: 'السنة الخامسة ابتدائي', name_fr: '5ème Année Primaire', name_en: '5th Year Primary', has_streams: 0, sort_order: 5 },

  { id: 'year-1am', cycle_id: 'cycle-middle', code: '1AM', name_ar: 'السنة الأولى متوسط', name_fr: '1ère Année Moyenne', name_en: '1st Year Middle', has_streams: 0, sort_order: 1 },
  { id: 'year-2am', cycle_id: 'cycle-middle', code: '2AM', name_ar: 'السنة الثانية متوسط', name_fr: '2ème Année Moyenne', name_en: '2nd Year Middle', has_streams: 0, sort_order: 2 },
  { id: 'year-3am', cycle_id: 'cycle-middle', code: '3AM', name_ar: 'السنة الثالثة متوسط', name_fr: '3ème Année Moyenne', name_en: '3rd Year Middle', has_streams: 0, sort_order: 3 },
  { id: 'year-4am', cycle_id: 'cycle-middle', code: '4AM', name_ar: 'السنة الرابعة متوسط (BEM)', name_fr: '4ème Année Moyenne (BEM)', name_en: '4th Year Middle (BEM)', has_streams: 0, sort_order: 4 },

  { id: 'year-1as', cycle_id: 'cycle-secondary', code: '1AS', name_ar: 'السنة الأولى ثانوي', name_fr: '1ère Année Secondaire', name_en: '1st Year Secondary', has_streams: 1, sort_order: 1 },
  { id: 'year-2as', cycle_id: 'cycle-secondary', code: '2AS', name_ar: 'السنة الثانية ثانوي', name_fr: '2ème Année Secondaire', name_en: '2nd Year Secondary', has_streams: 1, sort_order: 2 },
  { id: 'year-3as', cycle_id: 'cycle-secondary', code: '3AS', name_ar: 'السنة الثالثة ثانوي (البكالوريا)', name_fr: '3ème Année Secondaire (BAC)', name_en: '3rd Year Secondary (BAC)', has_streams: 1, sort_order: 3 },
];

const STREAMS: StreamDef[] = [
  { id: 'stream-1as-st', year_id: 'year-1as', code: 'TC-ST', name_ar: 'جذع مشترك علوم وتكنولوجيا', name_fr: 'Tronc Commun Sciences et Technologie', name_en: 'Common Core Science & Technology', sort_order: 1 },
  { id: 'stream-1as-lit', year_id: 'year-1as', code: 'TC-L', name_ar: 'جذع مشترك آداب', name_fr: 'Tronc Commun Lettres', name_en: 'Common Core Humanities & Letters', sort_order: 2 },

  { id: 'stream-2as-se', year_id: 'year-2as', code: 'SE', name_ar: 'علوم تجريبية', name_fr: 'Sciences Expérimentales', name_en: 'Experimental Sciences', sort_order: 1 },
  { id: 'stream-2as-math', year_id: 'year-2as', code: 'M', name_ar: 'رياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', sort_order: 2 },
  { id: 'stream-2as-tm', year_id: 'year-2as', code: 'TM', name_ar: 'تقني رياضي', name_fr: 'Technique Mathématique', name_en: 'Technical Mathematics', sort_order: 3 },
  { id: 'stream-2as-ge', year_id: 'year-2as', code: 'GE', name_ar: 'تسيير واقتصاد', name_fr: 'Gestion et Économie', name_en: 'Management & Economics', sort_order: 4 },
  { id: 'stream-2as-lp', year_id: 'year-2as', code: 'LP', name_ar: 'آداب وفلسفة', name_fr: 'Lettres et Philosophie', name_en: 'Letters & Philosophy', sort_order: 5 },
  { id: 'stream-2as-le', year_id: 'year-2as', code: 'LE', name_ar: 'لغات أجنبية', name_fr: 'Langues Étrangères', name_en: 'Foreign Languages', sort_order: 6 },

  { id: 'stream-3as-se', year_id: 'year-3as', code: 'SE', name_ar: 'علوم تجريبية', name_fr: 'Sciences Expérimentales', name_en: 'Experimental Sciences', sort_order: 1 },
  { id: 'stream-3as-math', year_id: 'year-3as', code: 'M', name_ar: 'رياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', sort_order: 2 },
  { id: 'stream-3as-tm', year_id: 'year-3as', code: 'TM', name_ar: 'تقني رياضي', name_fr: 'Technique Mathématique', name_en: 'Technical Mathematics', sort_order: 3 },
  { id: 'stream-3as-ge', year_id: 'year-3as', code: 'GE', name_ar: 'تسيير واقتصاد', name_fr: 'Gestion et Économie', name_en: 'Management & Economics', sort_order: 4 },
  { id: 'stream-3as-lp', year_id: 'year-3as', code: 'LP', name_ar: 'آداب وفلسفة', name_fr: 'Lettres et Philosophie', name_en: 'Letters & Philosophy', sort_order: 5 },
  { id: 'stream-3as-le', year_id: 'year-3as', code: 'LE', name_ar: 'لغات أجنبية', name_fr: 'Langues Étrangères', name_en: 'Foreign Languages', sort_order: 6 },
];

function buildOfficialSubjects(): SubjectDef[] {
  const list: SubjectDef[] = [];

  const primaryYears = ['year-1ap', 'year-2ap', 'year-3ap', 'year-4ap', 'year-5ap'];
  for (const yearId of primaryYears) {
    const num = Number(yearId.replace('year-', '').replace('ap', ''));
    list.push(
      { id: `subj-${yearId}-ar`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'AR', name_ar: 'اللغة العربية', name_fr: 'Langue Arabe', name_en: 'Arabic Language', coefficient: 1 },
      { id: `subj-${yearId}-math`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'MATH', name_ar: 'الرياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', coefficient: 1 },
      { id: `subj-${yearId}-isl`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'ISL', name_ar: 'التربية الإسلامية', name_fr: 'Éducation Islamique', name_en: 'Islamic Education', coefficient: 1 },
      { id: `subj-${yearId}-civ`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'CIV', name_ar: 'التربية المدنية', name_fr: 'Éducation Civique', name_en: 'Civic Education', coefficient: 1 },
      { id: `subj-${yearId}-sci`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'SCI', name_ar: 'التربية العلمية والتكنولوجية', name_fr: 'Éducation Scientifique', name_en: 'Scientific Education', coefficient: 1 }
    );
    if (num >= 3) {
      list.push(
        { id: `subj-${yearId}-fr`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'FR', name_ar: 'اللغة الفرنسية', name_fr: 'Langue Française', name_en: 'French Language', coefficient: 1 },
        { id: `subj-${yearId}-en`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'EN', name_ar: 'اللغة الإنجليزية', name_fr: 'Langue Anglaise', name_en: 'English Language', coefficient: 1 },
        { id: `subj-${yearId}-hg`, cycle_id: 'cycle-primary', year_id: yearId, stream_id: null, code: 'HG', name_ar: 'التاريخ والجغرافيا', name_fr: 'Histoire et Géographie', name_en: 'History & Geography', coefficient: 1 }
      );
    }
  }

  const middleYears = ['year-1am', 'year-2am', 'year-3am', 'year-4am'];
  for (const yearId of middleYears) {
    const isBem = yearId === 'year-4am';
    list.push(
      { id: `subj-${yearId}-ar`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'AR', name_ar: 'اللغة العربية', name_fr: 'Langue Arabe', name_en: 'Arabic Language', coefficient: isBem ? 5 : 3 },
      { id: `subj-${yearId}-math`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'MATH', name_ar: 'الرياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', coefficient: isBem ? 4 : 3 },
      { id: `subj-${yearId}-phys`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'PHYS', name_ar: 'العلوم الفيزيائية والتكنولوجيا', name_fr: 'Sciences Physiques', name_en: 'Physical Sciences', coefficient: isBem ? 2 : 2 },
      { id: `subj-${yearId}-snv`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'SNV', name_ar: 'علوم الطبيعة والحياة', name_fr: 'Sciences Naturelles', name_en: 'Natural & Life Sciences', coefficient: isBem ? 2 : 2 },
      { id: `subj-${yearId}-fr`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'FR', name_ar: 'اللغة الفرنسية', name_fr: 'Langue Française', name_en: 'French Language', coefficient: isBem ? 3 : 2 },
      { id: `subj-${yearId}-en`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'EN', name_ar: 'اللغة الإنجليزية', name_fr: 'Langue Anglaise', name_en: 'English Language', coefficient: isBem ? 2 : 1 },
      { id: `subj-${yearId}-hg`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'HG', name_ar: 'التاريخ والجغرافيا', name_fr: 'Histoire et Géographie', name_en: 'History & Geography', coefficient: isBem ? 3 : 2 },
      { id: `subj-${yearId}-isl`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'ISL', name_ar: 'التربية الإسلامية', name_fr: 'Éducation Islamique', name_en: 'Islamic Education', coefficient: isBem ? 2 : 1 },
      { id: `subj-${yearId}-civ`, cycle_id: 'cycle-middle', year_id: yearId, stream_id: null, code: 'CIV', name_ar: 'التربية المدنية', name_fr: 'Éducation Civique', name_en: 'Civic Education', coefficient: 1 }
    );
  }

  // 1AS
  list.push(
    { id: 'subj-1as-st-math', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'MATH', name_ar: 'الرياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', coefficient: 5 },
    { id: 'subj-1as-st-phys', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'PHYS', name_ar: 'العلوم الفيزيائية', name_fr: 'Sciences Physiques', name_en: 'Physics & Chemistry', coefficient: 4 },
    { id: 'subj-1as-st-snv', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'SNV', name_ar: 'علوم الطبيعة والحياة', name_fr: 'Sciences de la Nature et de la Vie', name_en: 'Natural Sciences', coefficient: 4 },
    { id: 'subj-1as-st-ar', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'AR', name_ar: 'اللغة العربية وآدابها', name_fr: 'Langue Arabe', name_en: 'Arabic Literature', coefficient: 3 },
    { id: 'subj-1as-st-fr', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'FR', name_ar: 'اللغة الفرنسية', name_fr: 'Français', name_en: 'French', coefficient: 2 },
    { id: 'subj-1as-st-en', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'EN', name_ar: 'اللغة الإنجليزية', name_fr: 'Anglais', name_en: 'English', coefficient: 2 },
    { id: 'subj-1as-st-isl', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'ISL', name_ar: 'العلوم الإسلامية', name_fr: 'Sciences Islamiques', name_en: 'Islamic Sciences', coefficient: 2 },
    { id: 'subj-1as-st-hg', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-st', code: 'HG', name_ar: 'التاريخ والجغرافيا', name_fr: 'Histoire et Géographie', name_en: 'History & Geography', coefficient: 2 },

    { id: 'subj-1as-lit-ar', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'AR', name_ar: 'اللغة العربية وآدابها', name_fr: 'Langue Arabe', name_en: 'Arabic Literature', coefficient: 5 },
    { id: 'subj-1as-lit-hg', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'HG', name_ar: 'التاريخ والجغرافيا', name_fr: 'Histoire et Géographie', name_en: 'History & Geography', coefficient: 3 },
    { id: 'subj-1as-lit-fr', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'FR', name_ar: 'اللغة الفرنسية', name_fr: 'Français', name_en: 'French', coefficient: 3 },
    { id: 'subj-1as-lit-en', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'EN', name_ar: 'اللغة الإنجليزية', name_fr: 'Anglais', name_en: 'English', coefficient: 3 },
    { id: 'subj-1as-lit-isl', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'ISL', name_ar: 'العلوم الإسلامية', name_fr: 'Sciences Islamiques', name_en: 'Islamic Sciences', coefficient: 2 },
    { id: 'subj-1as-lit-math', cycle_id: 'cycle-secondary', year_id: 'year-1as', stream_id: 'stream-1as-lit', code: 'MATH', name_ar: 'الرياضيات', name_fr: 'Mathématiques', name_en: 'Mathematics', coefficient: 2 }
  );

  // 2AS & 3AS across the 6 official BAC streams
  for (const yearCode of ['2as', '3as'] as const) {
    const yearId = `year-${yearCode}`;
    const streamsConfig: Array<{
      streamCode: string;
      items: Array<[string, string, string, string, number]>;
    }> = [
      {
        streamCode: 'se',
        items: [
          ['SNV', 'علوم الطبيعة والحياة', 'Sciences de la Nature et de la Vie', 'Natural & Life Sciences', 6],
          ['PHYS', 'العلوم الفيزيائية', 'Sciences Physiques', 'Physics & Chemistry', 5],
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 5],
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe', 'Arabic Literature', 3],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 2],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 2],
          ['FR', 'اللغة الفرنسية', 'Français', 'French', 2],
          ['EN', 'اللغة الإنجليزية', 'Anglais', 'English', 2],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
        ],
      },
      {
        streamCode: 'math',
        items: [
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 7],
          ['PHYS', 'العلوم الفيزيائية', 'Sciences Physiques', 'Physics & Chemistry', 6],
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe', 'Arabic Literature', 3],
          ['SNV', 'علوم الطبيعة والحياة', 'Sciences de la Nature', 'Natural Sciences', 2],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 2],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 2],
          ['FR', 'اللغة الفرنسية', 'Français', 'French', 2],
          ['EN', 'اللغة الإنجليزية', 'Anglais', 'English', 2],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
        ],
      },
      {
        streamCode: 'tm',
        items: [
          ['TECH', 'التكنولوجيا (الهندسة)', 'Technologie (Génie)', 'Engineering Technology', 7],
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 6],
          ['PHYS', 'العلوم الفيزيائية', 'Sciences Physiques', 'Physics & Chemistry', 6],
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe', 'Arabic Literature', 3],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 2],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 2],
          ['FR', 'اللغة الفرنسية', 'Français', 'French', 2],
          ['EN', 'اللغة الإنجليزية', 'Anglais', 'English', 2],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
        ],
      },
      {
        streamCode: 'ge',
        items: [
          ['ACC', 'التسيير المحاسبي والمالي', 'Gestion Comptable et Financière', 'Accounting & Finance', 6],
          ['ECO', 'الاقتصاد والمناجمنت', 'Économie et Management', 'Economics & Management', 5],
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 5],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 4],
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe', 'Arabic Literature', 3],
          ['LAW', 'القانون', 'Droit', 'Law', 2],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 2],
          ['FR', 'اللغة الفرنسية', 'Français', 'French', 2],
          ['EN', 'اللغة الإنجليزية', 'Anglais', 'English', 2],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
        ],
      },
      {
        streamCode: 'lp',
        items: [
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe et Littérature', 'Arabic Literature', 6],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 6],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 4],
          ['FR', 'اللغة الفرنسية', 'Français', 'French', 3],
          ['EN', 'اللغة الإنجليزية', 'Anglais', 'English', 3],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 2],
        ],
      },
      {
        streamCode: 'le',
        items: [
          ['AR', 'اللغة العربية وآدابها', 'Langue Arabe', 'Arabic Literature', 5],
          ['FR', 'اللغة الفرنسية', 'Langue Française', 'French Language', 5],
          ['EN', 'اللغة الإنجليزية', 'Langue Anglaise', 'English Language', 5],
          ['LANG3', 'اللغة الأجنبية الثالثة (إسبانية/ألمانية/إيطالية)', '3ème Langue Étrangère', '3rd Foreign Language', 4],
          ['HG', 'التاريخ والجغرافيا', 'Histoire et Géographie', 'History & Geography', 2],
          ['PHIL', 'الفلسفة', 'Philosophie', 'Philosophy', 2],
          ['ISL', 'العلوم الإسلامية', 'Sciences Islamiques', 'Islamic Sciences', 2],
          ['MATH', 'الرياضيات', 'Mathématiques', 'Mathematics', 2],
        ],
      },
    ];

    for (const s of streamsConfig) {
      const streamId = `stream-${yearCode}-${s.streamCode}`;
      for (const [code, ar, fr, en, coef] of s.items) {
        list.push({
          id: `subj-${yearCode}-${s.streamCode}-${code.toLowerCase()}`,
          cycle_id: 'cycle-secondary',
          year_id: yearId,
          stream_id: streamId,
          code,
          name_ar: ar,
          name_fr: fr,
          name_en: en,
          coefficient: coef,
        });
      }
    }
  }

  return list;
}

export function seedOfficialAlgerianTaxonomy(db: DatabaseSync): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM cycles').get() as { cnt: number };
  if (existing.cnt > 0) return;

  const insertCycle = db.prepare(
    'INSERT INTO cycles (id, code, name_ar, name_fr, name_en, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const c of CYCLES) {
    insertCycle.run(c.id, c.code, c.name_ar, c.name_fr, c.name_en, c.sort_order);
  }

  const insertYear = db.prepare(
    'INSERT INTO years (id, cycle_id, code, name_ar, name_fr, name_en, has_streams, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const y of YEARS) {
    insertYear.run(y.id, y.cycle_id, y.code, y.name_ar, y.name_fr, y.name_en, y.has_streams, y.sort_order);
  }

  const insertStream = db.prepare(
    'INSERT INTO streams (id, year_id, code, name_ar, name_fr, name_en, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const s of STREAMS) {
    insertStream.run(s.id, s.year_id, s.code, s.name_ar, s.name_fr, s.name_en, s.sort_order);
  }

  const insertSubject = db.prepare(
    'INSERT INTO subjects (id, cycle_id, year_id, stream_id, code, name_ar, name_fr, name_en, coefficient) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const subj of buildOfficialSubjects()) {
    insertSubject.run(
      subj.id,
      subj.cycle_id,
      subj.year_id,
      subj.stream_id,
      subj.code,
      subj.name_ar,
      subj.name_fr,
      subj.name_en,
      subj.coefficient
    );
  }
}

export function seedSampleOfficialUnitsForAdmin(db: DatabaseSync, adminId: string): { coursesCreated: number; lessonsCreated: number; quizzesCreated: number } {
  const now = new Date().toISOString();
  const existingCourse = db.prepare('SELECT id FROM courses WHERE id = ?').get('course-3as-se-math-exp') as { id: string } | undefined;
  if (existingCourse) {
    return { coursesCreated: 0, lessonsCreated: 0, quizzesCreated: 0 };
  }

  const insertCourse = db.prepare(
    'INSERT INTO courses (id, subject_id, teacher_id, title, description, access_tier, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertUnit = db.prepare(
    'INSERT INTO units (id, course_id, title, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertLesson = db.prepare(
    `INSERT INTO lessons (
      id, unit_id, course_id, title, objectives, explanation, key_concepts_json,
      applied_examples_json, exercises_solutions_json, summary, resources_json,
      media_url, access_tier, sort_order, is_published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (id, course_id, lesson_id, teacher_id, title, description, duration_minutes, pass_score, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO quiz_questions (id, quiz_id, prompt, options_json, correct_index, explanation, points, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Course 1: 3AS Sciences Expérimentales - Mathématiques (الدوال الأسية واللوغاريتمية)
  insertCourse.run(
    'course-3as-se-math-exp',
    'subj-3as-se-math',
    adminId,
    'الدوال الأسية واللوغاريتمية — السنة الثالثة ثانوي علوم تجريبية',
    'دورة منهجية وفق البرنامج الرسمي لوزارة التربية الوطنية: دراسة الدالة الأسية النيبيرية، اللوغاريتم النيبيري، النهايات، والاشتقاق.',
    'free',
    1,
    now,
    now
  );
  insertUnit.run('unit-3as-exp-1', 'course-3as-se-math-exp', 'الوحدة الأولى: الدالة الأسية النيبيرية', 1, now);
  insertLesson.run(
    'lesson-3as-exp-1',
    'unit-3as-exp-1',
    'course-3as-se-math-exp',
    'تعريف الدالة الأسية وخواصها الجبرية',
    'التعرف على الدالة الأسية كحل وحيد للمعادلة التفاضلية y\' = y مع y(0) = 1، وتوظيف خواصها الجبرية في تبسيط العبارات وحل المعادلات.',
    'توجد دالة وحيدة f قابلة للاشتقاق على ℝ تحقق: f\'(x) = f(x) و f(0) = 1، نرمز لها بالرمز exp ونكتب exp(x) = e^x حيث e ≈ 2.718.\n\nمن أهم خصائصها أنها موجبة تماماً على ℝ (e^x > 0 مهما يكن x من ℝ)، ومتزايدة تماماً على ℝ.',
    JSON.stringify([
      'e^0 = 1 و e^1 = e ≈ 2.718',
      'e^(a + b) = e^a · e^b',
      'e^(a - b) = e^a / e^b',
      'e^(-a) = 1 / e^a',
      'مهما يكن x من ℝ: e^x > 0',
    ]),
    JSON.stringify([
      'مثال 1: حل المعادلة e^(2x - 1) = e^3. بما أن الدالة الأسية متزايدة تماماً، فإن 2x - 1 = 3 ومنه x = 2.',
      'مثال 2: تبسيط العبارة A = (e^x · e^(-2x)) / e^(-x) = e^(x - 2x + x) = e^0 = 1.',
    ]),
    JSON.stringify([
      { question: 'حل في ℝ المتراجحة: e^(3x - 6) ≥ 1', solution: 'بما أن 1 = e^0 والدالة الأسية متزايدة تماماً، فإن 3x - 6 ≥ 0 أي x ≥ 2. مجموعة الحلول: [2 ; +∞[.' },
      { question: 'احسب مشتقة الدالة f(x) = e^(x^2 + 1)', solution: 'باستعمال قاعدة مشتق الدالة المركبة (e^u)\' = u\' · e^u نجد: f\'(x) = 2x · e^(x^2 + 1).' },
    ]),
    'الدالة الأسية موجبة تماماً على ℝ، متزايدة تماماً، ومشتقتها هي نفسها. تحويل الضرب إلى جمع في الأس يسهل حل المعادلات الأسية.',
    JSON.stringify([
      { label: 'وزارة التربية الوطنية — المناهج الرسمية', url: 'https://www.education.gov.dz/' },
      { label: 'الديوان الوطني للمطبوعات المدرسية', url: 'https://www.onps.dz/' },
    ]),
    null,
    'free',
    1,
    1,
    now,
    now
  );

  insertQuiz.run(
    'quiz-3as-exp-1',
    'course-3as-se-math-exp',
    'lesson-3as-exp-1',
    adminId,
    'اختبار تقييمي: خواص الدالة الأسية',
    'تحقق من تمكنك من الخواص الجبرية وحل المعادلات والمتراجحات الأسية.',
    10,
    60,
    1,
    now,
    now
  );
  insertQuestion.run(
    'q-3as-exp-1',
    'quiz-3as-exp-1',
    'ما هو حل المعادلة e^(2x - 4) = 1 في ℝ؟',
    JSON.stringify(['x = 0', 'x = 2', 'x = 4', 'لا توجد حلول']),
    1,
    'بما أن 1 = e^0، فإن 2x - 4 = 0 ومنه x = 2.',
    2,
    1
  );
  insertQuestion.run(
    'q-3as-exp-2',
    'quiz-3as-exp-1',
    'ما هي إشارة العبارة e^x + 2 على ℝ؟',
    JSON.stringify(['موجبة تماماً على ℝ', 'سالبة تماماً على ℝ', 'تنعدم عند x = -2', 'تتغير إشارتها']),
    0,
    'بما أن e^x > 0 مهما يكن x من ℝ، فإن e^x + 2 > 2 > 0 دائماً.',
    2,
    2
  );
  insertQuestion.run(
    'q-3as-exp-3',
    'quiz-3as-exp-1',
    'مشتقة الدالة f(x) = e^(3x) هي:',
    JSON.stringify(['e^(3x)', '3e^(3x)', '3xe^(3x)', 'e^3']),
    1,
    'مشتقة e^(u(x)) هي u\'(x) · e^(u(x))، وهنا u\'(x) = 3.',
    2,
    3
  );

  // Course 2: 4AM BEM - Mathematics (القاسم المشترك الأكبر PGCD)
  insertCourse.run(
    'course-4am-math-pgcd',
    'subj-year-4am-math',
    adminId,
    'الحساب على الجذور والقاسم المشترك الأكبر — الرابعة متوسط (BEM)',
    'وحدة أساسية للتحضير لشهادة التعليم المتوسط وفق المنهاج الرسمي الجزائري: خوارزمية إقليدس، الكسور غير القابلة للاختزال، وحل مسائل التوظيف.',
    'free',
    1,
    now,
    now
  );
  insertUnit.run('unit-4am-pgcd-1', 'course-4am-math-pgcd', 'الوحدة الأولى: الأعداد الطبيعية والأعداد الناطقة', 1, now);
  insertLesson.run(
    'lesson-4am-pgcd-1',
    'unit-4am-pgcd-1',
    'course-4am-math-pgcd',
    'حساب القاسم المشترك الأكبر (PGCD) بخوارزمية إقليدس',
    'إتقان حساب PGCD(a, b) باستعمال القسمة الإقليدية المتتابعة وتوظيفه في اختزال الكسور.',
    'نعتمد في خوارزمية إقليدس على سلسلة من القسمات الإقليدية المتتالية: نقسم العدد الأكبر على الأصغر، ثم نقسم القاسم على باقي القسمة حتى نحصل على باقٍ معدوم. آخر باقٍ غير معدوم هو القاسم المشترك الأكبر.',
    JSON.stringify([
      'PGCD(a, b) هو أكبر قاسم مشترك للعددين الطبيعيين غير المعدومين a و b.',
      'يكون العددان أوليين فيما بينهما إذا كان PGCD(a, b) = 1.',
      'لجعل الكسر a/b غير قابل للاختزال نقسم كلاً من البسط والمقام على PGCD(a, b).',
    ]),
    JSON.stringify([
      'مثال: حساب PGCD(252, 198): 252 = 198 × 1 + 54؛ ثم 198 = 54 × 3 + 36؛ ثم 54 = 36 × 1 + 18؛ ثم 36 = 18 × 2 + 0. إذن PGCD(252, 198) = 18.',
    ]),
    JSON.stringify([
      { question: 'اكتب الكسر 198 / 252 على شكل كسر غير قابل للاختزال.', solution: 'بقسمة البسط والمقام على PGCD(252, 198) = 18 نحصل على: (198 ÷ 18) / (252 ÷ 18) = 11 / 14.' },
    ]),
    'خوارزمية إقليدس هي الطريقة الأسرع لإيجاد PGCD للعددين الكبيرين واختزال الكسور بدقة.',
    JSON.stringify([
      { label: 'وزارة التربية الوطنية', url: 'https://www.education.gov.dz/' },
    ]),
    null,
    'free',
    1,
    1,
    now,
    now
  );

  insertQuiz.run(
    'quiz-4am-pgcd-1',
    'course-4am-math-pgcd',
    'lesson-4am-pgcd-1',
    adminId,
    'اختبار سريع: القاسم المشترك الأكبر PGCD',
    'أسئلة تطبيقية من نمط شهادة التعليم المتوسط.',
    8,
    60,
    1,
    now,
    now
  );
  insertQuestion.run(
    'q-4am-pgcd-1',
    'quiz-4am-pgcd-1',
    'ما هو القاسم المشترك الأكبر للعددين 45 و 30؟',
    JSON.stringify(['5', '10', '15', '30']),
    2,
    '45 = 30 × 1 + 15، ثم 30 = 15 × 2 + 0، إذن PGCD(45, 30) = 15.',
    2,
    1
  );
  insertQuestion.run(
    'q-4am-pgcd-2',
    'quiz-4am-pgcd-1',
    'متى نقول عن عددين طبيعيين أنهما أوليان فيما بينهما؟',
    JSON.stringify(['إذا كان مجموعهما أولياً', 'إذا كان PGCD لهما يساوي 1', 'إذا كان كلاهما عدداً فردياً', 'إذا كان أحدهما يقبل القسمة على الآخر']),
    1,
    'العددان أوليان فيما بينهما يعني أن القاسم المشترك الوحيد لهما هو 1.',
    2,
    2
  );

  return { coursesCreated: 2, lessonsCreated: 2, quizzesCreated: 2 };
}
