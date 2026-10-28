/* Stories, historic sky objects and human-made objects for Galaxy Overhead.
   STORIES is keyed by object id, planet name or star name; each entry is a list of short paragraphs. */
const STORIES = {
  /* ---- galactic landmarks and deep sky ---- */
  gc: [
    "In 1932 Karl Jansky, a Bell Labs engineer chasing static on transatlantic radio calls, traced a steady hiss to Sagittarius. It was the first radio signal from space, and the start of radio astronomy.",
    "Reinhard Genzel and Andrea Ghez spent decades tracking stars whipping around an invisible point here. Their orbits proved a black hole sits at the center, and won them the 2020 Nobel Prize in Physics. In 2022 the Event Horizon Telescope released the first image of its shadow."
  ],
  fwd: [
    "In 1918 Harlow Shapley mapped globular clusters and found they center on a point in Sagittarius, far from us. That knocked the Sun out of the middle of the galaxy, just as Copernicus had knocked Earth out of the middle of the Solar System.",
    "In 1927 Jan Oort showed from the motions of nearby stars that the galaxy rotates, carrying us toward this part of Cygnus."
  ],
  ngp: [
    "Coma Berenices, the constellation around the pole, is Queen Berenice's hair. She vowed her locks to the gods if her husband returned safely from war, around 245 BC. When the hair vanished from the temple, the court astronomer Conon of Samos declared it had been set among the stars. The poet Callimachus wrote about it, and Catullus translated the poem into Latin."
  ],
  sgp: [
    "Sculptor is one of fourteen constellations created by Nicolas-Louis de Lacaille, who mapped the southern sky from the Cape of Good Hope in 1751–52. He named most of his figures after instruments of art and science; this one was first called the sculptor's studio."
  ],
  apex: [
    "In 1783 William Herschel noticed that nearby stars seem to spread apart in one part of the sky and crowd together in the opposite one, the way trees do as you walk through a forest. From that he worked out that the Sun is moving toward Hercules."
  ],
  m8: [
    "Giovanni Battista Hodierna logged it before 1654. Charles Messier added it to his catalog in 1764; he listed fuzzy objects so comet hunters like himself would not mistake them for comets."
  ],
  m16: [
    "In 1995 the Hubble Space Telescope photographed three dark columns of gas inside it. The image, the Pillars of Creation, became one of the most famous science pictures ever taken. The James Webb Space Telescope photographed them again in infrared in 2022, showing new stars forming inside."
  ],
  m24: [
    "Messier recorded it in 1764 as a large patch of nebulosity. It is one of the few entries in his catalog that is not a single object at all, but a window through the dust onto a crowd of distant stars."
  ],
  baade: [
    "Walter Baade studied this window at Mount Wilson in the 1940s. As a German citizen in wartime he was kept out of war work, and the blackouts of Los Angeles gave him unusually dark skies. The variable stars he measured here helped fix the distance to the center of the galaxy."
  ],
  rift: [
    "William Herschel wondered whether dark patches like these were holes in the heavens. In the early 1900s E. E. Barnard's wide-field photographs helped show they are clouds of dust blocking the starlight behind them."
  ],
  cygx: [
    "Radio astronomers named it in the 1950s, when the region showed up as a bright radio source in Cygnus. In visible light it is mostly hidden behind the Great Rift's dust. Radio and infrared telescopes see thousands of massive young stars forming there."
  ],
  h_chi: [
    "Hipparchus recorded it as a cloudy spot around 130 BC. In the old star pictures it marks the sword hand of Perseus, the hero who beheaded Medusa."
  ],
  m1: [
    "On 4 July 1054 Chinese astronomers recorded a guest star here, bright enough to see in daylight for 23 days. A rock painting at Chaco Canyon in New Mexico may show the same star beside a crescent Moon.",
    "In 1968 astronomers found a pulsar at its heart: the collapsed core of the star, spinning about 30 times a second."
  ],
  m42: [
    "It is visible to the eye, yet no one wrote it down as a nebula until Nicolas-Claude Fabri de Peiresc in 1610. In 1880 Henry Draper took the first photograph ever made of a nebula, and this was it."
  ],
  m45: [
    "Homer describes the Pleiades on the shield of Achilles in the Iliad. Hesiod told farmers to start the harvest when they rose before dawn, and sailors to stay ashore when they set.",
    "The Nebra sky disc, buried in Germany about 3,600 years ago, seems to show them. In Japan the cluster is called Subaru, and the carmaker's badge shows its stars."
  ],
  carina: [
    "In 1843 its star Eta Carinae flared to become the second-brightest star in the sky during its Great Eruption. The outburst threw off the Homunculus Nebula. By the early 1900s it had faded below naked-eye view. It is likely to end as a supernova."
  ],
  coal: [
    "Aboriginal Australians see the Coalsack as the head of the Emu in the Sky, whose long neck and body are the dark lanes stretching toward Scorpius. For the Incas it was Yutu, a partridge-like bird, one of the dark-cloud animals in Mayu, the river of the sky."
  ],
  ocen: [
    "Ptolemy listed it as a single star nearly 2,000 years ago. Edmond Halley saw it was a fuzzy cluster in 1677 while mapping the southern sky from St Helena.",
    "In 2024 astronomers reported fast-moving stars near its center, evidence of a black hole of at least 8,000 solar masses."
  ],
  m13: [
    "Edmond Halley found it in 1714. On 16 November 1974 the Arecibo radio telescope beamed a short picture message toward it. The message will take about 22,000 years to arrive, and the cluster will have moved by then."
  ],
  tuc47: [
    "Lacaille catalogued it as a nebula in 1751. Its name comes from a later star catalog, where it was simply star number 47 in the Toucan."
  ],
  m31: [
    "The Persian astronomer al-Sufi described a little cloud here in 964. In 1923 Edwin Hubble found a pulsating Cepheid star in it, wrote 'VAR!' on the photographic plate, and used it to show Andromeda is a separate galaxy far beyond our own. That settled the debate over whether the Milky Way was the whole universe."
  ],
  m33: [
    "Charles Messier logged it in 1764. Under a very dark sky it may be the most distant object a human eye can see without help, about 2.7 million light-years away."
  ],
  lmc: [
    "Long known in the Southern Hemisphere, the Magellanic Clouds were described by the crew of Ferdinand Magellan's 1519–22 voyage around the world.",
    "In February 1987 a star exploded here: Supernova 1987A, the nearest seen since 1604. Detectors in Japan and the United States caught about two dozen of its neutrinos, the first ever detected from beyond the Sun."
  ],
  smc: [
    "Henrietta Swan Leavitt studied its pulsating Cepheid stars at Harvard and found in 1912 that brighter ones pulse more slowly. That rule let Edwin Hubble measure the distances to other galaxies."
  ],
  virgo: [
    "Messier and his colleague Pierre Méchain found many of its galaxies in the 1770s and 1780s. In 2019 the Event Horizon Telescope published the first image of a black hole: M87*, at the heart of this cluster's giant galaxy M87."
  ],
  /* ---- historic objects ---- */
  sn1572: [
    "In November 1572 Tycho Brahe saw a new star here, briefly brighter than Venus. His measurements showed it did not shift against the background stars, so it lay far beyond the Moon. That broke the old belief that the heavens never change. His book De Nova Stella gave us the word nova."
  ],
  sn1604: [
    "Johannes Kepler watched this star blaze up in October 1604 and followed it for a year. It is the last supernova in our own galaxy that anyone has seen with the naked eye."
  ],
  sn1006: [
    "The brightest stellar explosion in recorded history. Observers in China, Japan, Egypt, Iraq and Europe wrote about it; the Egyptian physician Ali ibn Ridwan said it shone with about a quarter of the Moon's light."
  ],
  cyg61: [
    "In 1838 Friedrich Bessel measured its tiny yearly shift as Earth circles the Sun: the first distance ever measured to a star. Its fast drift across the sky had earned it the nickname Flying Star."
  ],
  mira: [
    "In 1596 David Fabricius saw this star fade and vanish, then later return. It was the first star known to vary. Johannes Hevelius named it Mira, 'wonderful', in 1662."
  ],
  cygx1: [
    "Discovered as an X-ray source in 1964, Cygnus X-1 became the first object widely accepted as a black hole. In 1974 Stephen Hawking bet Kip Thorne it was not a black hole, as insurance against his life's work being wrong. He conceded in 1990."
  ],

  /* ---- Sun, Moon and planets ---- */
  Sun: [
    "On 1 September 1859 Richard Carrington watched a brilliant flare on the Sun. The magnetic storm that followed lit auroras as far south as the Caribbean and set telegraph lines sparking.",
    "Around 240 BC Eratosthenes compared the Sun's shadows in Syene and Alexandria and worked out the size of the Earth. Parker Solar Probe has since flown closer to the Sun than anything else we have built."
  ],
  Moon: [
    "Galileo's telescope sketches of 1609–10 showed mountains and craters, ending the idea of a perfect heavenly sphere. Jules Verne's From the Earth to the Moon (1865) launched its crew from Florida, as Apollo later did.",
    "Twelve people walked on it between July 1969 and December 1972. Tides have locked its spin so it always shows us the same face."
  ],
  Mercury: [
    "Mercury's orbit slowly swings around the Sun, 43 arcseconds per century more than Newton's gravity allows. In 1915 Einstein's general relativity explained the gap exactly, the theory's first success."
  ],
  Venus: [
    "The Maya tracked its 584-day cycle in the Dresden Codex. In 1769 James Cook sailed to Tahiti to time Venus crossing the Sun's face, part of a worldwide effort to measure the size of the Solar System.",
    "Galileo's 1610 discovery that Venus shows phases like the Moon was strong evidence that it circles the Sun."
  ],
  Mars: [
    "Johannes Kepler used Tycho Brahe's careful Mars observations to discover in 1609 that planets move in ellipses.",
    "In 1877 Giovanni Schiaparelli mapped 'canali', channels, on Mars. Translated as canals, the word fed Percival Lowell's Martian civilization and H. G. Wells' The War of the Worlds (1898). Its red color is rust in the dust."
  ],
  Jupiter: [
    "In January 1610 Galileo saw four little stars moving around Jupiter: the first proof that not everything circles the Earth. In 1676 Ole Rømer timed the eclipses of its moon Io to make the first measurement of the speed of light.",
    "In July 1994 the fragments of comet Shoemaker–Levy 9 slammed into it, the first collision between Solar System bodies ever watched."
  ],
  Saturn: [
    "Galileo saw something odd beside Saturn in 1610 and thought it had two companions, like ears. Christiaan Huygens explained them as a ring in 1659 and found its moon Titan in 1655.",
    "The Cassini spacecraft orbited Saturn for 13 years and ended its mission by diving into the planet on 15 September 2017. Saturday is named after it."
  ],

  /* ---- named stars ---- */
  Sirius: [
    "The ancient Egyptian year was tied to Sirius rising just before dawn, around the time the Nile flooded. The dog days of summer are named after it, the Dog Star.",
    "In 1844 Friedrich Bessel predicted an unseen companion from Sirius's wobble. Alvan Graham Clark spotted it in 1862: Sirius B, later recognized as one of the first known white dwarfs."
  ],
  Canopus: [
    "Named for the helmsman of King Menelaus' fleet in Greek legend. Spacecraft including Mariner and Voyager used it as a guide star to hold their orientation."
  ],
  Arcturus: [
    "In 1718 Edmond Halley noticed that Arcturus, Sirius and Aldebaran had moved since Ptolemy's time: the discovery that stars drift across the sky.",
    "In 1933 its light, caught by a telescope, switched on the lights of the Chicago World's Fair. It was chosen because that light was thought to have left the star during the city's previous fair, in 1893."
  ],
  "Rigil Kentaurus": [
    "The nearest star system to the Sun. Its faint companion Proxima Centauri is the closest star of all, at 4.2 light-years. Thomas Henderson measured its distance from the Cape in 1832–33.",
    "In Liu Cixin's novel The Three-Body Problem, the alien Trisolarans live here."
  ],
  Vega: [
    "In 1850 Vega became the first star other than the Sun to be photographed. About 14,000 years ago it was the North Star, and it will be again in about 12,000 years.",
    "In Carl Sagan's novel Contact, the first message from aliens comes from Vega. In the Chinese Qixi legend, Vega is the weaver girl, kept apart from the cowherd Altair by the river of the Milky Way except for one night a year."
  ],
  Altair: [
    "The cowherd of the Qixi legend, and Hikoboshi in Japan's Tanabata festival, who may cross the Milky Way to meet the weaver Vega once a year.",
    "Altair spins so fast, once every nine hours or so, that it is visibly squashed. It was one of the first stars other than the Sun to have its surface imaged, in 2007."
  ],
  Capella: [
    "Its name means little she-goat. In Greek myth it is Amalthea, the goat that nursed the infant Zeus."
  ],
  Rigel: [
    "Its name comes from the Arabic for foot: it is Orion's left foot. A blue supergiant, it gives off around 100,000 times as much light as the Sun."
  ],
  Procyon: [
    "Its name means 'before the dog' in Greek, because it rises just before Sirius, the Dog Star."
  ],
  Achernar: [
    "One of the flattest stars known. It spins so fast that its equator bulges about 50% wider than its poles, as measured in 2003."
  ],
  Betelgeuse: [
    "Between late 2019 and early 2020 it faded dramatically in the Great Dimming, which turned out to be a cloud of dust it had thrown off. Someday it will explode as a supernova, possibly as bright as a half Moon.",
    "In The Hitchhiker's Guide to the Galaxy, Ford Prefect comes from a small planet somewhere near Betelgeuse."
  ],
  Acrux: [
    "Acrux is the foot of the Southern Cross, which appears on the flags of Australia, New Zealand, Brazil, Papua New Guinea and Samoa. Sailors used the Cross's long axis to find south."
  ],
  Aldebaran: [
    "Its name means 'the follower' in Arabic, because it follows the Pleiades across the sky. It is the red eye of Taurus the bull. Pioneer 10 is drifting in its general direction and would need about two million years to get there."
  ],
  Spica: [
    "Around 130 BC Hipparchus compared Spica's position with older records and found it had shifted. That led him to the precession of the equinoxes, the slow wobble of Earth's axis."
  ],
  Antares: [
    "Its name means 'rival of Mars', because its red glow can match the planet's when they pass near each other. It is a red supergiant hundreds of times wider than the Sun."
  ],
  Pollux: [
    "Pollux and Castor are the twins of Greek myth. Sailors took the glowing electric discharges on their masts, St Elmo's fire, as a sign the twins were watching over them."
  ],
  Castor: [
    "To the eye it is one star, but Castor is a family of six: three pairs of stars orbiting each other."
  ],
  Fomalhaut: [
    "In 2008 the Hubble Space Telescope imaged what looked like a planet, Fomalhaut b, inside the star's dust ring. Later observations suggest it was an expanding cloud of debris from a collision instead."
  ],
  Deneb: [
    "The tail of Cygnus, the swan, and a corner of the Summer Triangle with Vega and Altair. It is one of the most luminous stars you can see, shining across about 2,600 light-years."
  ],
  Regulus: [
    "Copernicus gave it its name, Latin for 'little king'. It sits almost on the Sun's path, so the Moon and planets often pass close to it."
  ],
  Polaris: [
    "It is the pole star only for now: Earth's axis traces a circle over about 26,000 years. Polaris is also a Cepheid, a star that pulses in brightness.",
    "'But I am constant as the northern star, of whose true-fixed and resting quality there is no fellow in the firmament.' — Julius Caesar, in Shakespeare's play."
  ],
  Mizar: [
    "With Alcor beside it, Mizar was a traditional eyesight test. In 1617 Benedetto Castelli saw through a telescope that Mizar itself is double, and in 1889 it became the first star shown to be double from its spectrum alone."
  ],
  Alcor: [
    "The faint companion to Mizar, the rider to Mizar's horse in folk tradition. Seeing it was a test of good eyesight."
  ],
  Algol: [
    "Its name comes from the Arabic for 'the demon's head': it is the eye of Medusa in Perseus's hand. In 1782–83 John Goodricke, a deaf amateur aged 18, timed its dimming every 2.87 days and suggested a companion star passes in front of it. He was right."
  ],
  Albireo: [
    "The beak of the swan. A small telescope splits it into a gold star and a blue one, one of the prettiest color pairs in the sky."
  ],
  Thuban: [
    "Thuban was the pole star when the Egyptian pyramids were built, around 2700 BC. Earth's slowly wobbling axis has since moved the pole away from it."
  ],
  Eltanin: [
    "In 1725 James Bradley set out to measure its distance and instead found the aberration of starlight, a tiny yearly shift caused by Earth's motion. It was the first direct proof that Earth moves around the Sun."
  ],
  Dubhe: [
    "Dubhe and Merak are the Pointers: follow the line from Merak through Dubhe and it leads to Polaris, the North Star."
  ]
};

/* historic stars and supernova sites, shown with the deep-sky layer */
const EXTRA_OBJS = [
  { id: 'sn1572', n: "Tycho's Supernova", k: 'hist', kl: 'Supernova remnant', ra: 6.33, dec: 64.14, c: 'Cassiopeia', d: null,
    t: 'Site of the supernova Tycho Brahe watched in 1572. Today only a faint shell of gas remains, invisible to the eye.' },
  { id: 'sn1604', n: "Kepler's Supernova", k: 'hist', kl: 'Supernova remnant', ra: 262.68, dec: -21.49, c: 'Ophiuchus', d: null,
    t: 'Site of the 1604 supernova, the last one seen in our galaxy with the naked eye.' },
  { id: 'sn1006', n: 'SN 1006', k: 'hist', kl: 'Supernova remnant', ra: 225.71, dec: -41.94, c: 'Lupus', d: 7200,
    t: 'Site of the brightest supernova in recorded history, in the year 1006.' },
  { id: 'cyg61', n: '61 Cygni', k: 'hist', kl: 'Historic star', ra: 316.73, dec: 38.75, c: 'Cygnus', d: 11.4,
    t: 'A pair of orange dwarf stars, faint but visible to the eye from a dark site. The first star whose distance was measured.' },
  { id: 'mira', n: 'Mira', k: 'hist', kl: 'Variable star', ra: 34.84, dec: -2.98, c: 'Cetus', d: 300,
    t: 'A red giant that swells and shrinks over about 11 months, swinging from easily visible to far too faint to see.' },
  { id: 'cygx1', n: 'Cygnus X-1', k: 'hist', kl: 'Black hole', ra: 299.59, dec: 35.20, c: 'Cygnus', d: 7200,
    t: 'A black hole of about 21 solar masses pulling gas off a blue supergiant companion. The companion is just visible in binoculars.' }
];

/* human-made objects. t: sat (Earth orbit, live orbit data) | probe (escaping the Solar System) | l2 | at (on another body) | signal */
const TECH = [
  { id: 'iss', n: 'ISS', full: 'International Space Station', t: 'sat', norad: 25544, kl: 'Space station',
    d: 'A crewed laboratory about 400 km up, circling Earth every 92 minutes. When it catches the sunlight it is often the brightest thing in the sky after the Moon and Venus.',
    s: ["People have lived on board without a break since 2 November 2000. Five space agencies built it from parts launched over more than 40 flights, and astronauts from more than 20 countries have visited. It is due to be retired around 2030."] },
  { id: 'hst', n: 'Hubble', full: 'Hubble Space Telescope', t: 'sat', norad: 20580, kl: 'Space telescope',
    d: 'The space telescope, about 530 km up. Sometimes visible to the eye as a moving star.',
    s: ["Launched from the Space Shuttle in April 1990 with a flawed mirror, it saw blurry images until astronauts fitted corrective optics in December 1993. Five servicing missions kept it working.",
        "Its 1995 Hubble Deep Field stared at a tiny, empty-looking patch of sky for ten days and found about 3,000 galaxies."] },
  { id: 'css', n: 'Tiangong', full: 'Tiangong space station', t: 'sat', norad: 48274, kl: 'Space station',
    d: "China's space station, about 390 km up. Often bright enough to see.",
    s: ["Its core module, Tianhe, launched in April 2021, and the station was completed in late 2022. Tiangong means 'heavenly palace'."] },
  { id: 'van1', n: 'Vanguard 1', full: 'Vanguard 1', t: 'sat', norad: 5, kl: 'Satellite',
    d: 'A 16 cm aluminium sphere, far too small to see, still circling Earth after more than 65 years.',
    s: ["Launched on 17 March 1958, it is the oldest human-made object still in orbit. It fell silent in 1964. Tracking its orbit showed that Earth is slightly pear-shaped."] },
  { id: 'voy1', n: 'Voyager 1', t: 'probe', kl: 'Interstellar probe', ra: 258.4, dec: 12.0, c: 'Ophiuchus', d0: 121.6, y0: 2012.65, au: 3.58,
    d: 'The most distant human-made object, heading out of the Solar System at about 17 km/s.',
    s: ["Launched on 5 September 1977, it flew past Jupiter and Saturn. On 14 February 1990, at Carl Sagan's urging, it turned around and photographed Earth as a Pale Blue Dot. In August 2012 it became the first spacecraft in interstellar space.",
        "It carries the Golden Record of sounds, music and greetings from Earth. Around November 2026 it reaches one light-day from Earth."] },
  { id: 'voy2', n: 'Voyager 2', t: 'probe', kl: 'Interstellar probe', ra: 301.4, dec: -58.9, c: 'Pavo', d0: 119.0, y0: 2018.85, au: 3.25,
    d: 'Heading south out of the Solar System at about 15 km/s.',
    s: ["Launched on 20 August 1977, two weeks before its twin, it is the only spacecraft to have visited Uranus (1986) and Neptune (1989). It crossed into interstellar space in November 2018 and carries its own copy of the Golden Record."] },
  { id: 'pio10', n: 'Pioneer 10', t: 'probe', kl: 'Silent probe', ra: 78.0, dec: 26.0, c: 'Taurus', d0: 80.2, y0: 2003.06, au: 2.54,
    d: 'Drifting toward Taurus, silent since 2003.',
    s: ["Launched on 2 March 1972, it was the first spacecraft to cross the asteroid belt and to fly past Jupiter, in December 1973. Its last signal reached Earth on 23 January 2003.",
        "It carries the Pioneer plaque, designed by Carl Sagan and Frank Drake and drawn by Linda Salzman Sagan: a man and a woman, and a map locating the Sun among 14 pulsars."] },
  { id: 'pio11', n: 'Pioneer 11', t: 'probe', kl: 'Silent probe', ra: 282.6, dec: -8.7, c: 'Scutum', d0: 44.7, y0: 1995.9, au: 2.40,
    d: 'Drifting toward Scutum and Aquila, silent since 1995.',
    s: ["The first spacecraft to fly past Saturn, on 1 September 1979, scouting the route the Voyagers would follow. Contact was lost in 1995. It carries the same plaque as Pioneer 10."] },
  { id: 'nh', n: 'New Horizons', t: 'probe', kl: 'Deep-space probe', ra: 291.5, dec: -20.5, c: 'Sagittarius', d0: 43.4, y0: 2019.0, au: 2.92,
    d: 'Heading out through the Kuiper Belt at about 14 km/s.',
    s: ["It flew past Pluto on 14 July 2015, revealing a heart-shaped plain of nitrogen ice, then past Arrokoth on 1 January 2019, the most distant world ever explored up close. It carries some of the ashes of Clyde Tombaugh, who discovered Pluto in 1930."] },
  { id: 'l2', n: 'L2: Webb, Euclid', t: 'l2', kl: 'Space telescopes',
    d: 'The Sun–Earth L2 point, 1.5 million km away on the night side, directly opposite the Sun. The Webb and Euclid telescopes loop around it in wide orbits, so they can sit tens of degrees from this spot.',
    s: ["The James Webb Space Telescope launched on 25 December 2021. Its sunshield, the size of a tennis court, keeps its mirror at about −230 °C. Euclid joined it in 2023 to map billions of galaxies."] },
  { id: 'apollo', n: 'Apollo landing sites', t: 'at', body: 'Moon', kl: 'On the Moon',
    d: 'Six crewed landings, 1969–72, left lander bases, three lunar rovers, flags and laser mirrors on the Moon.',
    s: ["Neil Armstrong and Buzz Aldrin landed at Tranquility Base on 20 July 1969. Mirrors left by Apollo 11, 14 and 15 still reflect lasers fired from Earth, measuring the Moon's distance to within millimetres. It is moving away from us by about 3.8 cm a year."] },
  { id: 'rovers', n: 'Mars rovers', t: 'at', body: 'Mars', kl: 'On Mars',
    d: 'Curiosity landed in Gale Crater in August 2012 and Perseverance in Jezero Crater in February 2021.',
    s: ["Perseverance is collecting rock samples for a future return to Earth. The helicopter it carried, Ingenuity, made the first powered flight on another planet on 19 April 2021 and flew 72 times."] },
  { id: 'arecibo', n: 'Arecibo message', t: 'signal', kl: 'Radio message', ra: 250.42, dec: 36.46, c: 'Hercules',
    d: 'A radio message sent toward the M13 star cluster in 1974. It has travelled about 52 light-years so far, out of 22,000.',
    s: ["On 16 November 1974 the Arecibo radio telescope in Puerto Rico broadcast 1,679 bits that form a small picture: numbers, DNA, a human figure, the Solar System and the telescope itself. Frank Drake designed it with Carl Sagan and others. The telescope collapsed in 2020."] }
];
