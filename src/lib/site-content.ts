import type { Language } from './types';

type AboutContent = {
  title: string;
  motto: string;
  sections: { id: string; title: string; paragraphs: string[]; statement?: string }[];
  contact: string;
};

// Organisation copy in both languages. Section labels are used by the page's contents links.
export const aboutContent = {
  en: {
    title: 'What is ASHT?',
    motto: 'ASHT is what the bone is!',
    sections: [
      {
        id: 'purpose', title: 'Our purpose',
        paragraphs: [
          'ASHT can be seen as many things. At its core, it represents two aims:',
          'A forum where leaders can share their opinions on a wide range of issues—or, in other words, a political and scholarly position taken by its leaders—and an effort to encourage the Albanian academic spirit, especially in Albanian lands outside Albania.',
        ],
      },
      {
        id: 'origins', title: 'The spirit of the assembly',
        paragraphs: [
          'In the old northern Albania, the village was summoned to regular assemblies by the Abbot, the village’s Catholic leader, to discuss the village’s problems and broader regional plans. These assemblies were called Abaci. In a similar spirit, but in a secular and broader form, ASHT aims to create assemblies to discuss the state of the nation, plan broader national movements, and illuminate the country’s academic spirit, especially in Albanian lands outside Albania.',
        ],
        statement: 'Thus, ASHT is an Abaci for the Enlightenment of the Lands!',
      },
      {
        id: 'perspectives', title: 'Two perspectives',
        paragraphs: [
          'ASHT has two perspectives: the global and the national. Its national character is more pronounced because of its leaders’ origins and because the country needs movements of this kind, as we believe. But ASHT is also interested in global issues, whether political or historical, and more generally in other fields such as philosophy, metaphysics, science, and technology.',
        ],
      },
      {
        id: 'principles', title: 'Principles & interests',
        paragraphs: [
          'ASHT has several principles: it believes in republicanism and intellectualism, in fundamental human rights, in equality before the law, in freedom of speech, and in citizens’ participation in the country’s politics. ASHT takes a fundamentally anti-corporate and anti-consumerist position.',
          'ASHT is a friend of the sciences, whether technical or humanistic, and is a student of theology, natural philosophy, and linguistics. It also supports the principle: “Albania for Albanians, death to traitors!”',
        ],
      },
      {
        id: 'membership', title: 'Membership',
        paragraphs: [
          'Anyone may become a member of ASHT, provided they have awareness, will, and action. All friends of the nation and of knowledge are welcome.',
        ],
      },
    ],
    contact: 'For more information, contact us at the official email address.',
  },
  sq: {
    title: "Ç'është ASHT?",
    motto: 'ASHT asht çka ashti asht!',
    sections: [
      {
        id: 'purpose', title: 'Qëllimi ynë',
        paragraphs: [
          'ASHT-i mund të shihet si shumë gjëra. Në thelb, ai përfaqëson dy qëllime:',
          'Një rubrikë ku prijësit mund të japin mendimet e tyre për çështje nga më të ndryshmet, ose thënë ndryshe, një qëndrim politiko-shkencor i prijësve, dhe një përpjekje për ta nxitur frymën akademike shqiptare, sidomos në viset jashtë Shqipërisë.',
        ],
      },
      {
        id: 'origins', title: 'Fryma e kuvendit',
        paragraphs: [
          'Në Shqipërinë e vjetër të veriut, katundi thirreshte në kuvende të rregullta nga Abati, prijësi katolik i katundit, për të diskutuar problemet e katundit dhe plane më të gjëra rajonale. Këto kuvende quheshin Abaci. Në një frymë të njëjtë, por laike dhe më të gjërë, ASHT synon krijimin e kuvendeve për të diskutuar gjendjen e kombit, për të planifikuar lëvizje më të gjëra kombëtare dhe për të shndritur shpirtin akademik të vendit, sidomos të trojeve jashtë Shqipërisë.',
        ],
        statement: 'Pra ASHT është një Abaci për Shndritjen e Trojeve!',
      },
      {
        id: 'perspectives', title: 'Dy pikëpamje',
        paragraphs: [
          'ASHT ka dy pikëpamje, ajo botërore dhe ajo kombëtare. Karakteri kombëtar i ASHT është më i theksuar për shkak të origjinës së prijësve si dhe për shkak të nevojës për lëvizje të tilla për të cilat ne besojmë se ka nevojë vendi, por ASHT është i interesuar edhe për çështje botërore, qofshin politike ose historike, dhe në përgjithësi edhe për degë tjera si filozofia, metafizika, shkenca dhe teknologjia.',
        ],
      },
      {
        id: 'principles', title: 'Parimet dhe interesat',
        paragraphs: [
          'ASHT ka disa parime: ASHT beson në republikanizëm, intelektualizëm, në të drejtat themelore të njeriut, në barazinë e tij para ligjit, në lirinë e fjalës dhe në kyçjen e qytetarit në politikën e vendit. ASHT ka një qëndrim thelbësor anti-korporat dhe anti-konzumativë.',
          'ASHT është dashamirës i shkencave, qofshin teknike ose humane, dhe është student i teologjisë, filozofisë natyrale dhe gjuhësisë. Përkrah gjithashtu parimin "Shqipëria shqiptarëve, vdekje tradhtarëve!".',
        ],
      },
      {
        id: 'membership', title: 'Anëtarësimi',
        paragraphs: [
          'Çdo njeri mund të bëhet anëtar i ASHT, përderisa ata kanë vetëdije, vullnet dhe veprim. Të gjithë dashamirësit e kombit dhe të dijes janë të mikpritur.',
        ],
      },
    ],
    contact: 'Për më shumë na kontaktoni në e-mail-in zyrtar.',
  },
} satisfies Record<Language, AboutContent>;
