/**
 * Gotras offered in the booking form. Add a name here to offer it; `aliases` are other common spellings so
 * a search for either finds it. The chosen `name` is what the booking stores and the astrologer reads.
 */
export interface Gotra {
  name: string;
  aliases?: string[];
}

/** By tradition a pooja is performed in Kashyap gotra when the family gotra is not known. */
export const UNKNOWN_GOTRA_VALUE = 'Kashyap (gotra not known)';

export const GOTRAS: readonly Gotra[] = [
  // Rishi gotras
  { name: 'Agastya', aliases: ['Agasthya'] },
  { name: 'Alambayan', aliases: ['Alambayana'] },
  { name: 'Angiras', aliases: ['Angirasa'] },
  { name: 'Atreya', aliases: ['Atrey', 'Atri'] },
  { name: 'Bharadwaj', aliases: ['Bhardwaj', 'Bharadvaja', 'Bharadwaja'] },
  { name: 'Bhargav', aliases: ['Bhargava'] },
  { name: 'Bhrigu' },
  { name: 'Chyavan', aliases: ['Chyavana', 'Chyawan'] },
  { name: 'Dadhich', aliases: ['Dadhichi', 'Dadhichya'] },
  { name: 'Dhananjay', aliases: ['Dhananjaya'] },
  { name: 'Dhaumya', aliases: ['Dhoumya'] },
  { name: 'Galav', aliases: ['Galava'] },
  { name: 'Garg', aliases: ['Garga', 'Gargya'] },
  { name: 'Gautam', aliases: ['Gautama', 'Gotam'] },
  { name: 'Harit', aliases: ['Harita'] },
  { name: 'Jamadagni', aliases: ['Jamdagni'] },
  { name: 'Kanva', aliases: ['Kanwa'] },
  { name: 'Kapil', aliases: ['Kapila'] },
  { name: 'Kashyap', aliases: ['Kashyapa', 'Kasyap', 'Kashyab'] },
  { name: 'Katyayan', aliases: ['Katyayana'] },
  { name: 'Kaundinya', aliases: ['Kaundilya', 'Koundinya'] },
  { name: 'Kaushik', aliases: ['Koushik', 'Kaushika'] },
  { name: 'Krishnatreya', aliases: ['Krishnatrey'] },
  { name: 'Kutsa', aliases: ['Kautsa'] },
  { name: 'Lohit', aliases: ['Lohita'] },
  { name: 'Mandavya' },
  { name: 'Markandeya', aliases: ['Markandey'] },
  { name: 'Mudgal', aliases: ['Maudgalya', 'Moudgalya'] },
  { name: 'Naidhruv', aliases: ['Naidhruva'] },
  { name: 'Parashar', aliases: ['Parasar', 'Parashara'] },
  { name: 'Pulastya', aliases: ['Paulastya'] },
  { name: 'Sankrit', aliases: ['Sankriti', 'Sankrityayan'] },
  { name: 'Shandilya', aliases: ['Sandilya', 'Shandily'] },
  { name: 'Shaunak', aliases: ['Shaunaka', 'Saunak'] },
  { name: 'Shrivatsa', aliases: ['Srivatsa'] },
  { name: 'Upamanyu' },
  { name: 'Vadhul', aliases: ['Vadhula'] },
  { name: 'Vashishtha', aliases: ['Vasishtha', 'Vashisht', 'Vasistha'] },
  { name: 'Vatsa', aliases: ['Vats', 'Vatsya'] },
  { name: 'Vishwamitra', aliases: ['Vishvamitra', 'Viswamitra'] },
  // Agrawal gotras
  { name: 'Airan', aliases: ['Eran', 'Aeran'] },
  { name: 'Bansal' },
  { name: 'Bhandal' },
  { name: 'Bindal', aliases: ['Vindal'] },
  { name: 'Dharan', aliases: ['Deran'] },
  { name: 'Goyal', aliases: ['Goel'] },
  { name: 'Goyan', aliases: ['Gangal'] },
  { name: 'Jindal' },
  { name: 'Kansal' },
  { name: 'Kuchhal', aliases: ['Kuchal'] },
  { name: 'Madhukul', aliases: ['Madhukal'] },
  { name: 'Mangal' },
  { name: 'Mittal', aliases: ['Mital'] },
  { name: 'Nangal', aliases: ['Nagal'] },
  { name: 'Singhal', aliases: ['Singla'] },
  { name: 'Tayal' },
  { name: 'Tingal', aliases: ['Tingle'] },
];

/** Case-insensitive match on the name or any alias. */
export function matchGotras(query: string): Gotra[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...GOTRAS];
  return GOTRAS.filter((g) => [g.name, ...(g.aliases ?? [])].some((s) => s.toLowerCase().includes(q)));
}
