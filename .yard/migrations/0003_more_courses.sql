-- Twenty more sample courses, across every subject. Like 0002_seed.sql this
-- runs once per database and uses INSERT OR IGNORE, so a re-run after a
-- mid-file failure is harmless and a course you delete stays deleted.
--
-- The same rules for the text apply: apostrophes are doubled (''), and no
-- literal contains a semicolon or two hyphens in a row.

INSERT OR IGNORE INTO courses (id, title, summary, subject, tier, published, position) VALUES
  ('atoms', 'Inside the Atom',
   'Protons, neutrons and electrons: what atoms are made of, what makes one element different from another, and why some atoms are restless.',
   'chemistry', 'free', 1, 5),
  ('probability', 'Probability Basics',
   'How to put a number on chance: counting outcomes, combining events, and working out what a game is really worth.',
   'math', 'free', 1, 6),
  ('cells', 'The Cell',
   'The smallest unit of life: what is inside a cell, how things get in and out, and why cells stay so small.',
   'biology', 'free', 1, 7),
  ('binary', 'Binary and Bits',
   'How computers count with only two digits, why a byte holds 256 values, and how text becomes numbers.',
   'cs', 'free', 1, 8),
  ('solar-system', 'Tour of the Solar System',
   'The planets in order, the real distances between them, and the rule Kepler found for how long each one takes to go around the Sun.',
   'astronomy', 'free', 1, 9),
  ('energy', 'Energy and Work',
   'What physicists mean by work, the two big kinds of mechanical energy, and the conservation law that ties them together.',
   'physics', 'free', 1, 10),
  ('circuits', 'Electric Circuits',
   'Current, voltage and resistance, the one law that connects them, and how to combine resistors in series and in parallel.',
   'engineering', 'free', 1, 11),
  ('exponents-logs', 'Exponents and Logarithms',
   'The rules of powers, logarithms as the question "what power?", and how they describe doubling, half-lives and growth.',
   'math', 'free', 1, 12),
  ('bonding', 'Chemical Bonds',
   'Why atoms stick together, the difference between giving electrons away and sharing them, and what that means for water.',
   'chemistry', 'free', 1, 13),
  ('evolution', 'Natural Selection',
   'The simple mechanism behind the variety of life: variation, inheritance and survival, and the evidence that it happens.',
   'biology', 'free', 1, 14),
  ('recursion', 'Thinking Recursively',
   'Functions that call themselves: how to write one that stops, what the call stack is doing, and how memoization rescues slow recursion.',
   'cs', 'free', 1, 15),
  ('waves', 'Waves and Sound',
   'What a wave carries, the equation that links speed, frequency and wavelength, and why a passing siren changes pitch.',
   'physics', 'free', 1, 16),
  ('dna', 'From DNA to Protein',
   'How a four-letter code stores the instructions for life, and how a cell reads a gene to build a protein.',
   'biology', 'premium', 1, 17),
  ('vectors', 'Vectors in the Plane',
   'Quantities with a direction: how to add them, how long they are, and what the dot product says about the angle between two of them.',
   'math', 'premium', 1, 18),
  ('stars', 'How Stars Live and Die',
   'Where stars get their energy, why heavy stars burn out fast, and how their deaths made the atoms you are built from.',
   'astronomy', 'premium', 1, 19),
  ('acids-bases', 'Acids, Bases and pH',
   'What makes something an acid or a base, how the pH scale works, and what happens when the two meet.',
   'chemistry', 'premium', 1, 20),
  ('ecology', 'Energy in Ecosystems',
   'Who eats whom, why only a tenth of the energy makes it up each level, and how matter keeps cycling while energy flows through.',
   'biology', 'free', 1, 21),
  ('sorting', 'Sorting Algorithms',
   'Three ways to put a list in order, why some are hugely faster than others, and what Python does when you call sorted().',
   'cs', 'premium', 1, 22),
  ('structures', 'How Structures Stand Up',
   'The forces inside bridges and buildings: tension and compression, why triangles are everywhere, and how the shape of a beam decides its strength.',
   'engineering', 'premium', 1, 23),
  ('integrals', 'Integrals: Area Under a Curve',
   'The other half of calculus: adding up infinitely many thin slices, and the theorem that turns it into subtraction.',
   'math', 'premium', 1, 24);

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('atoms-parts', 'atoms', 'Three kinds of particle', 0,
'Every atom is built from three particles.

| particle | charge | where it lives |
| - | :-: | - |
| proton | $+1$ | the nucleus |
| neutron | $0$ | the nucleus |
| electron | $-1$ | around the nucleus |

The nucleus holds almost all of the mass but takes up almost none of the space. If an atom were the size of a football stadium, its nucleus would be about the size of a marble on the centre spot.

> [!NOTE]
> A proton is about 1,836 times heavier than an electron, which is why chemists usually ignore electron mass.'),

  ('atoms-numbers', 'atoms', 'Atomic number and mass number', 1,
'The number of protons decides which element an atom is. That count is the **atomic number** $Z$. Every carbon atom has $Z = 6$. Change the proton count and it is no longer carbon.

The **mass number** $A$ counts protons and neutrons together:

$$A = Z + N$$

Atoms of the same element with different neutron counts are **isotopes**.

| isotope | protons | neutrons | mass number |
| - | -: | -: | -: |
| carbon-12 | 6 | 6 | 12 |
| carbon-14 | 6 | 8 | 14 |

Carbon-14 is slightly unstable, and the steady rate at which it decays is what makes radiocarbon dating work.'),

  ('atoms-shells', 'atoms', 'Electron shells', 2,
'In the simple shell model, electrons fill shells from the inside out. The first shell holds 2 electrons and the next holds 8.

- Neon, with 10 electrons, fills both shells exactly: $2, 8$. It reacts with almost nothing.
- Sodium has 11: $2, 8, 1$. That single outer electron is easy to lose.
- Chlorine has 17: $2, 8, 7$. It is one electron short of a full shell.

An atom that loses an electron becomes a positive **ion**, like $\mathrm{Na^+}$. One that gains an electron becomes a negative ion, like $\mathrm{Cl^-}$.

> [!TIP]
> Most of chemistry is atoms trading or sharing outer electrons to reach a full shell. Keep that in mind and bonding makes sense.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('probability-counting', 'probability', 'Counting outcomes', 0,
'When every outcome is equally likely, probability is a fraction:

$$P(\text{event}) = \frac{\text{outcomes in the event}}{\text{all possible outcomes}}$$

Roll a fair six-sided die.

- $P(\text{a five}) = \tfrac{1}{6}$
- $P(\text{an even number}) = \tfrac{3}{6} = \tfrac{1}{2}$

A probability is always between 0 (impossible) and 1 (certain). The probability that something does **not** happen is its complement:

$$P(\text{not } A) = 1 - P(A)$$'),

  ('probability-and-or', 'probability', 'And, or', 1,
'**And.** For independent events, where one tells you nothing about the other, multiply:

$$P(A \text{ and } B) = P(A) \times P(B)$$

Two coin flips both landing heads: $\tfrac{1}{2} \times \tfrac{1}{2} = \tfrac{1}{4}$.

**Or.** For events that cannot both happen, add:

$$P(A \text{ or } B) = P(A) + P(B)$$

Rolling a 1 or a 2: $\tfrac{1}{6} + \tfrac{1}{6} = \tfrac{1}{3}$.

When the events can overlap, subtract the overlap so it is not counted twice:

$$P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B)$$'),

  ('probability-at-least', 'probability', 'At least one', 2,
'What is the chance of rolling at least one six in four rolls? Counting every way to get one, two, three or four sixes is painful. The complement is easy: the chance of **no** sixes is $\left(\tfrac{5}{6}\right)^4$.

$$P(\text{at least one six}) = 1 - \left(\tfrac{5}{6}\right)^4 = 1 - \tfrac{625}{1296} \approx 0.518$$

Slightly better than even. In the 1650s a French gambler, the Chevalier de Méré, won steadily on this bet, and his questions about it helped start probability theory.

> [!TIP]
> Whenever a question says "at least one", try the complement first.'),

  ('probability-expected', 'probability', 'Expected value', 3,
'The **expected value** of a game is the average result per play over the long run:

$$E = \sum x \cdot P(x)$$

A fair die has expected value $\tfrac{1 + 2 + 3 + 4 + 5 + 6}{6} = 3.5$, even though you can never roll 3.5.

Say a game costs \$1 to play and pays \$5 when you roll a six. The expected payout is $5 \times \tfrac{1}{6} \approx 0.83$, so on average you lose about 17 cents every time you play.

> [!NOTE]
> Every casino game is built so that the expected value favours the house. Individual players win, but the average cannot.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('cells-theory', 'cells', 'The unit of life', 0,
'**Cell theory** rests on three ideas:

1. Every living thing is made of one or more cells.
2. The cell is the basic unit of life.
3. New cells only come from existing cells.

There are two broad kinds of cell.

| | prokaryotic | eukaryotic |
| - | - | - |
| examples | bacteria | plants, animals, fungi |
| nucleus | no | yes |
| typical size | 1 to 5 micrometres | 10 to 100 micrometres |

A micrometre is a thousandth of a millimetre, so about 100 typical human cells side by side would span a single millimetre.'),

  ('cells-organelles', 'cells', 'What is inside', 1,
'Eukaryotic cells are divided into compartments called **organelles**, each with a job.

- **Nucleus**: holds the DNA, the cell''s instructions.
- **Mitochondria**: release energy from food as ATP, the cell''s energy currency.
- **Ribosomes**: build proteins.
- **Cell membrane**: controls what enters and leaves.

Plant cells add a few more:

- **Chloroplasts**: capture light for photosynthesis.
- **Cell wall**: a rigid outer layer of cellulose.
- **Large vacuole**: stores water and keeps the cell firm.

> [!NOTE]
> Mitochondria have their own small loop of DNA, a clue that they began as free-living bacteria that were swallowed by another cell.'),

  ('cells-transport', 'cells', 'In and out', 2,
'The membrane is a double layer of fat-like molecules. Small molecules such as oxygen slip through it by **diffusion**, moving from high concentration to low with no energy needed. **Osmosis** is the same idea for water.

Moving something against its gradient takes energy. The sodium-potassium pump uses ATP to push sodium out of the cell and potassium in, and your nerves depend on it.

## Why cells are small

As a cell grows, its volume grows faster than its surface:

| side of a cube | surface area | volume | surface per volume |
| -: | -: | -: | -: |
| 1 | 6 | 1 | 6 |
| 2 | 24 | 8 | 3 |
| 4 | 96 | 64 | 1.5 |

A big cell would have too little membrane to feed its insides, so organisms grow by adding more cells, not bigger ones.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('binary-base-two', 'binary', 'Counting in base 2', 0,
'In base 10 each place is worth ten times the one to its right: ones, tens, hundreds. In **base 2** each place is worth twice as much: ones, twos, fours, eights.

$$1101_2 = 1 \cdot 8 + 1 \cdot 4 + 0 \cdot 2 + 1 \cdot 1 = 13$$

To go the other way, divide by 2 repeatedly and keep the remainders:

| step | quotient | remainder |
| - | -: | -: |
| 13 / 2 | 6 | 1 |
| 6 / 2 | 3 | 0 |
| 3 / 2 | 1 | 1 |
| 1 / 2 | 0 | 1 |

Read the remainders from the bottom up: $1101$.'),

  ('binary-bytes', 'binary', 'Bits and bytes', 1,
'One binary digit is a **bit**: 0 or 1, off or on. With $n$ bits you can write $2^n$ different values.

| bits | values | range |
| -: | -: | - |
| 1 | 2 | 0 to 1 |
| 4 | 16 | 0 to 15 |
| 8 | 256 | 0 to 255 |
| 16 | 65,536 | 0 to 65,535 |

Eight bits make a **byte**, which is why so many old limits stop at 255.

## Hexadecimal

Long binary strings are hard to read, so programmers often use base 16. The digits are 0 to 9 and then A to F, and one hex digit stands for exactly four bits:

$$1111\,1111_2 = \mathrm{FF}_{16} = 255$$

That is why web colours look like `#FF8800`: one byte each for red, green and blue.'),

  ('binary-text', 'binary', 'Text as numbers', 2,
'A computer stores letters as numbers too. In the **ASCII** table, capital A is 65:

$$65 = 0100\,0001_2$$

```python
print(ord("A"))       # 65
print(chr(97))        # a
print(bin(65))        # 0b1000001
```

ASCII only covers 128 characters, enough for English but not for most of the world. **Unicode** gives every character in every script its own number, over a million possible in all, and **UTF-8** stores them using one to four bytes each.

> [!TIP]
> Capital and lowercase letters in ASCII differ by exactly 32, a single bit. Flipping that bit changes the case.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('solar-system-scale', 'solar-system', 'A sense of scale', 0,
'Astronomers measure the solar system in **astronomical units**. One AU is the average distance from Earth to the Sun, about 150 million km.

Light covers that distance in about 8.3 minutes, so the sunlight you see left the Sun over eight minutes ago.

| planet | distance from the Sun (AU) |
| - | -: |
| Mercury | 0.39 |
| Venus | 0.72 |
| Earth | 1.00 |
| Mars | 1.52 |
| Jupiter | 5.2 |
| Saturn | 9.5 |
| Uranus | 19.2 |
| Neptune | 30.1 |

Light from the Sun takes about four hours to reach Neptune.'),

  ('solar-system-planets', 'solar-system', 'Rocky worlds and giants', 1,
'The planets fall into two families.

**The rocky planets**, Mercury, Venus, Earth and Mars, are small and dense, with solid surfaces.

**The giants** are much larger. Jupiter and Saturn are mostly hydrogen and helium. Uranus and Neptune hold more water, ammonia and methane ices, so they are often called ice giants.

Between Mars and Jupiter lies the asteroid belt, rocky leftovers that never formed a planet.

> [!NOTE]
> Jupiter is more than twice as massive as all the other planets put together. Over 1,300 Earths would fit inside it.'),

  ('solar-system-kepler', 'solar-system', 'Kepler''s third law', 2,
'In 1619 Johannes Kepler found a simple rule linking a planet''s distance from the Sun to its year. With the period $T$ in Earth years and the distance $a$ in AU:

$$T^2 = a^3$$

For Mars, $a = 1.52$:

$$T = 1.52^{3/2} \approx 1.87 \text{ years}$$

For Jupiter, $a = 5.2$, so $T = 5.2^{3/2} \approx 11.9$ years.

## Why Earth has seasons

Not because of distance. Earth is actually closest to the Sun in early January. Seasons come from the tilt of Earth''s axis, about 23.4 degrees, which changes how directly sunlight hits each hemisphere through the year.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('energy-work', 'energy', 'Work', 0,
'In physics, **work** is done when a force moves something along the direction of the force:

$$W = F d \cos\theta$$

where $\theta$ is the angle between the force and the motion. Work is measured in **joules** (J).

- Push a box with 50 N across 4 m of floor: $W = 50 \times 4 = 200$ J.
- Carry a bag across a room at steady height: your force points up, the motion is sideways, $\cos 90^\circ = 0$, so no work is done on the bag.

> [!NOTE]
> Your arms still get tired carrying the bag. Your muscles are doing work internally, just not on the bag.'),

  ('energy-kinds', 'energy', 'Kinetic and potential energy', 1,
'Moving things have **kinetic energy**:

$$E_k = \tfrac{1}{2} m v^2$$

A 1,000 kg car at 20 m/s has $\tfrac{1}{2} \times 1000 \times 20^2 = 200{,}000$ J. Because speed is squared, doubling your speed quadruples the energy, and the braking distance with it.

Lifted things have **gravitational potential energy**:

$$E_p = m g h$$

Lifting a 2 kg book onto a 1.5 m shelf stores $2 \times 9.8 \times 1.5 \approx 29$ J.'),

  ('energy-conservation', 'energy', 'Conservation of energy', 2,
'Energy is never created or destroyed, only changed from one form to another. Drop something and its potential energy turns into kinetic energy:

$$m g h = \tfrac{1}{2} m v^2 \quad\Rightarrow\quad v = \sqrt{2 g h}$$

The mass cancels, so from a 20 m drop anything reaches $\sqrt{2 \times 9.8 \times 20} \approx 19.8$ m/s, ignoring air resistance.

## Power

**Power** is how fast work is done, measured in watts:

$$P = \frac{W}{t}$$

A 60 kg person climbing 3 m of stairs in 4 s does $60 \times 9.8 \times 3 \approx 1{,}764$ J of work, a power of about 440 W. One horsepower is about 746 W.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('circuits-basics', 'circuits', 'Current, voltage, resistance', 0,
'Three quantities describe a circuit.

| quantity | symbol | unit | what it means |
| - | :-: | - | - |
| current | $I$ | ampere (A) | charge flowing past a point each second |
| voltage | $V$ | volt (V) | energy given to each unit of charge |
| resistance | $R$ | ohm | how strongly a part resists current |

A water analogy helps: voltage is like pressure, current is like the flow rate, and resistance is like a narrow pipe.'),

  ('circuits-ohm', 'circuits', 'Ohm''s law', 1,
'For many components, current is proportional to voltage:

$$V = I R$$

A 9 V battery across a 3-ohm resistor drives $I = 9 / 3 = 3$ A.

## Sizing a resistor

An LED needs about 2 V and 20 mA. On a 9 V supply, the resistor in series must drop the other 7 V:

$$R = \frac{V}{I} = \frac{7}{0.020} = 350 \text{ ohms}$$

Without it the LED would draw far more current and burn out.

> [!WARNING]
> Mains electricity is dangerous. Practise with batteries and low-voltage kits.'),

  ('circuits-combining', 'circuits', 'Series and parallel', 2,
'**In series**, components share one path. The current is the same through each, and resistances add:

$$R = R_1 + R_2$$

**In parallel**, each component has its own branch. The voltage across each is the same, and the combined resistance is lower than either:

$$\frac{1}{R} = \frac{1}{R_1} + \frac{1}{R_2}$$

Two 6-ohm resistors give 12 ohms in series and 3 ohms in parallel.

## Power

The power used by a component is

$$P = V I$$

A 60 W bulb on a 120 V supply draws $60 / 120 = 0.5$ A. Houses are wired in parallel so every appliance gets the full voltage and one can be switched off without cutting the rest.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('exponents-logs-rules', 'exponents-logs', 'The rules of exponents', 0,
'An exponent says how many times to multiply a number by itself: $2^5 = 32$. A few rules follow from that.

$$a^m \cdot a^n = a^{m+n} \qquad (a^m)^n = a^{mn} \qquad \frac{a^m}{a^n} = a^{m-n}$$

They also explain the odd-looking cases:

- $a^0 = 1$, because $a^n / a^n = a^{n-n}$.
- $a^{-n} = \dfrac{1}{a^n}$, so $2^{-3} = \tfrac{1}{8}$.
- $a^{1/2} = \sqrt{a}$, because $a^{1/2} \cdot a^{1/2} = a^1$.'),

  ('exponents-logs-logs', 'exponents-logs', 'Logarithms', 1,
'A logarithm answers the question "what power?"

$$\log_b x = y \quad\text{means}\quad b^y = x$$

- $\log_2 8 = 3$, because $2^3 = 8$.
- $\log_{10} 1000 = 3$, because $10^3 = 1000$.

Logarithms turn multiplication into addition, which is why slide rules worked:

$$\log(xy) = \log x + \log y \qquad \log(x^k) = k \log x$$

> [!NOTE]
> Many everyday scales are logarithmic: decibels for sound, pH for acidity, the magnitude scale for earthquakes. One step means a multiple, not an addition.'),

  ('exponents-logs-growth', 'exponents-logs', 'Doubling and halving', 2,
'Something that doubles every $T$ minutes grows as

$$N = N_0 \cdot 2^{t / T}$$

Bacteria that double every 20 minutes go through 6 doublings in two hours, a factor of $2^6 = 64$.

How long until they have grown 1,000 times? Solve with a logarithm:

$$t = T \log_2 1000 \approx 20 \times 9.97 \approx 199 \text{ minutes}$$

Decay works the same way in reverse. Carbon-14 has a half-life of about 5,730 years, so after 11,460 years a quarter of it remains, and after 17,190 years an eighth.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('bonding-ionic', 'bonding', 'Ionic bonds', 0,
'Sodium has one outer electron it would happily lose. Chlorine is one electron short of a full shell. When they meet, sodium gives its electron to chlorine:

$$\mathrm{Na} + \mathrm{Cl} \longrightarrow \mathrm{Na^+} + \mathrm{Cl^-}$$

The two ions now have opposite charges and attract strongly. That attraction is an **ionic bond**.

Ionic compounds form huge regular crystals rather than separate molecules. The bonds are strong in every direction, so table salt does not melt until 801 degrees Celsius.'),

  ('bonding-covalent', 'bonding', 'Covalent bonds', 1,
'Atoms that both want electrons can **share** them instead. A shared pair of electrons is a **covalent bond**.

In water, $\mathrm{H_2O}$, the oxygen atom shares one pair with each hydrogen. Oxygen ends up with a full outer shell of 8, and each hydrogen with 2.

Atoms can share more than one pair:

| molecule | bond | shared pairs |
| - | - | -: |
| $\mathrm{H_2}$ | single | 1 |
| $\mathrm{O_2}$ | double | 2 |
| $\mathrm{N_2}$ | triple | 3 |

The triple bond in nitrogen is so strong that the nitrogen in air hardly reacts at all.'),

  ('bonding-polarity', 'bonding', 'Why water is special', 2,
'Oxygen pulls on shared electrons harder than hydrogen does. That pull is called **electronegativity**. So the electrons in water spend more time near the oxygen, leaving it slightly negative and the hydrogens slightly positive.

Water is also bent, at an angle of about 104.5 degrees, so the charges do not cancel out. The molecule is **polar**.

That one fact explains a lot:

- Water dissolves salt, because its charged ends pull ions apart.
- Water molecules cling to each other through **hydrogen bonds**, so it boils at 100 degrees Celsius. Similar-sized molecules without them are gases at room temperature.
- Ice is less dense than liquid water, so lakes freeze from the top down.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('evolution-mechanism', 'evolution', 'Four ingredients', 0,
'Charles Darwin realised that four ordinary facts, taken together, change populations over time:

1. **Variation**: individuals differ from one another.
2. **Inheritance**: many of those differences are passed on to offspring.
3. **Overproduction**: more offspring are born than can survive.
4. **Selection**: individuals whose traits suit the environment survive and reproduce more.

Over many generations, helpful traits become more common. No plan or goal is involved, only which individuals leave the most offspring.

> [!NOTE]
> Individuals do not evolve during their lifetimes. Populations do, as the mix of traits shifts from one generation to the next.'),

  ('evolution-examples', 'evolution', 'Selection in action', 1,
'**Peppered moths.** Before the 1800s most peppered moths in England were pale, well hidden on light tree bark. As soot from factories darkened the trees, dark moths survived bird attacks better and became common near cities. After clean air laws in the 1950s the pale form returned.

**Antibiotic resistance.** When a patient takes an antibiotic, most bacteria die. Any that happen to carry resistance survive and multiply. Stopping a course of antibiotics early or using them when they are not needed gives resistant bacteria more chances to spread.

> [!TIP]
> "Survival of the fittest" means fitting the environment, not being the strongest. A trait that helps in one place can be a handicap in another.'),

  ('evolution-evidence', 'evolution', 'The evidence', 2,
'Several independent lines of evidence point to the same story.

- **Fossils** show a sequence of changing forms, such as whales descending from land mammals with legs.
- **Homologous structures**: the arm of a human, the wing of a bat and the flipper of a whale have the same set of bones, rearranged for different jobs.
- **DNA** comparisons show that species that look related share more of their genetic code. Humans and chimpanzees share about 98.8 percent of their DNA.
- **Observation**: we can watch evolution happen in fast-breeding species like bacteria and fruit flies.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('recursion-idea', 'recursion', 'A function that calls itself', 0,
'A **recursive** function solves a problem by solving a smaller copy of the same problem. Every one needs two parts:

- a **base case** that answers directly, and
- a **recursive case** that moves closer to the base case.

The factorial $n! = n \times (n-1) \times \dots \times 1$ is the classic example:

```python
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)
```

`factorial(3)` becomes `3 * factorial(2)`, then `3 * 2 * factorial(1)`, then `3 * 2 * 1 * factorial(0)`, which is 6.

> [!WARNING]
> Forget the base case and the function never stops calling itself.'),

  ('recursion-stack', 'recursion', 'The call stack', 1,
'Each call has to wait for the call inside it to finish. The computer keeps track of all the waiting calls on the **call stack**.

| stack while computing factorial(3) |
| - |
| factorial(0) returns 1 |
| factorial(1) waiting |
| factorial(2) waiting |
| factorial(3) waiting |

Once the base case returns, the waiting calls finish one by one from the top.

The stack is not infinite. Python stops at about 1,000 nested calls by default and raises a `RecursionError`. For very deep problems a plain loop is often the better tool.'),

  ('recursion-memo', 'recursion', 'Memoization', 2,
'Fibonacci numbers are defined recursively, and the direct translation is short:

```python
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

It is also painfully slow. `fib(30)` makes about 2.7 million calls, because it works out the same smaller values over and over.

The fix is to remember answers. **Memoization** stores each result the first time it is computed:

```python
from functools import cache

@cache
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

Now each value from 0 to 30 is computed only once, and `fib(300)` returns instantly.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('waves-what', 'waves', 'What a wave is', 0,
'A wave carries **energy** from place to place without carrying the material along with it. A cork on a pond bobs up and down as ripples pass, but it stays roughly where it is.

There are two main kinds.

- **Transverse** waves shake at right angles to their travel, like a wave sent along a rope. Light is transverse.
- **Longitudinal** waves squeeze and stretch along their direction of travel, like a push sent along a spring. Sound is longitudinal.

Every wave has an **amplitude** (how big), a **wavelength** $\lambda$ (distance between peaks) and a **frequency** $f$ (peaks per second, in hertz).'),

  ('waves-speed', 'waves', 'Speed, frequency, wavelength', 1,
'All waves obey one equation:

$$v = f \lambda$$

Sound travels through air at about 343 m/s at 20 degrees Celsius. The note A above middle C has a frequency of 440 Hz, so its wavelength is

$$\lambda = \frac{343}{440} \approx 0.78 \text{ m}$$

Human hearing runs from about 20 Hz to 20,000 Hz, wavelengths from 17 m down to under 2 cm.

> [!TIP]
> Light arrives almost instantly but thunder travels at the speed of sound. Count the seconds between the flash and the bang and divide by 3 to get the distance in kilometres.'),

  ('waves-loudness', 'waves', 'Pitch and loudness', 2,
'**Pitch** is how we hear frequency. Doubling the frequency raises a note by one octave.

**Loudness** is measured in **decibels**, a logarithmic scale. Every 10 dB step means ten times more sound intensity.

| sound | level (dB) |
| - | -: |
| whisper | 30 |
| conversation | 60 |
| busy traffic | 85 |
| rock concert | 110 |

A rock concert carries about 100,000 times the intensity of normal conversation.

> [!WARNING]
> Long exposure to sound above about 85 dB can permanently damage hearing.'),

  ('waves-doppler', 'waves', 'The Doppler effect', 3,
'When a source of sound moves toward you, its waves bunch up and the pitch rises. As it moves away, they spread out and the pitch drops. For a source moving at speed $v_s$ toward a still listener:

$$f'' = f \, \frac{v}{v - v_s}$$

An ambulance siren at 700 Hz, driving at 30 m/s:

- approaching: $700 \times \tfrac{343}{313} \approx 767$ Hz
- moving away: $700 \times \tfrac{343}{373} \approx 644$ Hz

The same effect in light lets astronomers measure how fast galaxies are moving away from us, by how much their light is shifted toward red.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('dna-structure', 'dna', 'The double helix', 0,
'DNA is a long chain of **nucleotides**, each carrying one of four bases: adenine (A), thymine (T), cytosine (C) and guanine (G).

Two chains wind around each other in a **double helix**, held together by pairs of bases. The pairing always follows the same rule:

- A pairs with T
- C pairs with G

So if one strand reads `ATGC`, the other must read `TACG`. Either strand can be used to rebuild the other, which is how DNA is copied.

> [!NOTE]
> The human genome holds about 3 billion base pairs. Printed as letters, it would fill around 1,000 thick books.'),

  ('dna-transcription', 'dna', 'Transcription', 1,
'A **gene** is a stretch of DNA that codes for a protein. The DNA stays in the nucleus, so the cell first makes a working copy called **messenger RNA** (mRNA).

RNA uses the same bases as DNA except one: **uracil** (U) takes the place of thymine. The mRNA is built as the partner of the gene''s template strand:

| DNA template | T | A | C | G | G | A |
| - | - | - | - | - | - | - |
| mRNA | A | U | G | C | C | U |

The finished mRNA leaves the nucleus and travels to a ribosome.'),

  ('dna-translation', 'dna', 'Translation', 2,
'A **ribosome** reads mRNA three bases at a time. Each triplet, a **codon**, stands for one amino acid.

With four bases there are $4^3 = 64$ possible codons, more than enough for the 20 amino acids. Most amino acids have several codons.

- `AUG` means **start** and codes for methionine.
- `UAA`, `UAG` and `UGA` mean **stop**.

So the mRNA `AUG CCU UAA` builds methionine, then proline, then stops. The chain of amino acids folds into a protein, and its shape decides its job.'),

  ('dna-mutations', 'dna', 'Mutations', 3,
'A **mutation** is a change in the DNA sequence.

**Substitutions** swap one base for another. Often this changes nothing, or one amino acid. In sickle cell anaemia a single change in the haemoglobin gene, `GAG` to `GTG`, swaps glutamic acid for valine, and the protein clumps together inside red blood cells.

**Insertions and deletions** are usually worse, because every codon after them shifts. Think of the sentence `THE CAT ATE THE RAT`. Delete the C and read in threes again: `THE ATA TET HER AT`. Every word after the change is nonsense.

> [!NOTE]
> Mutations are also the raw material of evolution. Without them there would be no variation for natural selection to act on.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('vectors-what', 'vectors', 'Magnitude and direction', 0,
'A **vector** has a size and a direction. Speed is just a number, but velocity says which way too. Force, displacement and acceleration are all vectors.

In the plane we write a vector by its components, $\mathbf{v} = (3, 4)$: three steps along $x$ and four along $y$. Its length, or **magnitude**, comes from Pythagoras:

$$|\mathbf{v}| = \sqrt{3^2 + 4^2} = 5$$

Walk 3 km east and then 4 km north and you end up 5 km from where you started.'),

  ('vectors-arithmetic', 'vectors', 'Adding and scaling', 1,
'Vectors add component by component:

$$(3, 4) + (1, -2) = (4, 2)$$

Picture it as following one arrow and then the next, tip to tail.

Multiplying by a number scales the length and keeps the direction, or reverses it for a negative number:

$$2 \, (3, 4) = (6, 8) \qquad -1 \, (3, 4) = (-3, -4)$$

Dividing a vector by its own magnitude gives a **unit vector**, length 1, pointing the same way:

$$\frac{(3, 4)}{5} = (0.6, 0.8)$$'),

  ('vectors-dot', 'vectors', 'The dot product', 2,
'The **dot product** multiplies matching components and adds them:

$$\mathbf{a} \cdot \mathbf{b} = a_1 b_1 + a_2 b_2$$

It is also connected to the angle $\theta$ between the vectors:

$$\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}|\,|\mathbf{b}| \cos\theta$$

That gives a quick test for right angles. $(3, 4) \cdot (4, -3) = 12 - 12 = 0$, and $\cos 90^\circ = 0$, so the two are perpendicular.

For $(1, 0)$ and $(1, 1)$: the dot product is 1, the magnitudes are $1$ and $\sqrt{2}$, so $\cos\theta = \tfrac{1}{\sqrt{2}}$ and $\theta = 45^\circ$.

> [!TIP]
> Work in physics is a dot product: $W = \mathbf{F} \cdot \mathbf{d}$. Only the part of the force along the motion counts.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('stars-fusion', 'stars', 'Fusion', 0,
'A star is born when a cloud of gas and dust collapses under its own gravity. The core heats up until, at around 10 million degrees, hydrogen nuclei slam together hard enough to fuse.

In the Sun, four hydrogen nuclei end up as one helium nucleus. The helium weighs about 0.7 percent less than the hydrogen that made it, and that missing mass becomes energy:

$$E = m c^2$$

Because $c^2$ is enormous, a little mass makes a lot of energy. The Sun turns about 4 million tonnes of matter into energy every second.'),

  ('stars-lives', 'stars', 'Long and short lives', 1,
'For most of its life a star is in balance: gravity pulls inward, and the pressure from fusion pushes outward. This stage is the **main sequence**.

Heavier stars have stronger gravity, so their cores run hotter and burn fuel far faster.

| star | colour | surface temperature | lifetime |
| - | - | -: | - |
| red dwarf | red | about 3,000 K | trillions of years |
| the Sun | yellow white | about 5,800 K | about 10 billion years |
| 10 times the Sun | blue white | about 25,000 K | a few tens of millions of years |

The Sun is about 4.6 billion years old, a little under halfway through.'),

  ('stars-deaths', 'stars', 'How stars die', 2,
'When the hydrogen in the core runs out, the balance breaks.

**Stars like the Sun** swell into **red giants**, then gently shed their outer layers as a glowing shell called a planetary nebula. The core left behind is a **white dwarf**: about the size of Earth, so dense that a teaspoon of it would weigh several tonnes.

**Stars above about 8 times the Sun''s mass** end violently. Their core collapses in under a second and the star explodes as a **supernova**, briefly outshining its whole galaxy. What remains is a **neutron star**, about 20 km across, or if it is heavy enough, a **black hole**.'),

  ('stars-elements', 'stars', 'Made of star stuff', 3,
'The Big Bang made almost nothing but hydrogen and helium. Nearly every other element was made later, inside stars.

- Fusion in stars builds carbon, oxygen and the other elements up to iron.
- Fusing iron releases no energy, so a star''s fusion stops there.
- Heavier elements like gold and uranium are made in supernovae and in collisions between neutron stars.

When stars die they scatter these elements into space, where they end up in new stars, planets and people.

> [!NOTE]
> The carbon in your cells and the oxygen you breathe were made inside stars that died before the Sun was born.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('acids-bases-definitions', 'acids-bases', 'Giving and taking protons', 0,
'A hydrogen atom that has lost its electron is just a proton, written $\mathrm{H^+}$. In the Brønsted definition:

- an **acid** gives away $\mathrm{H^+}$
- a **base** accepts $\mathrm{H^+}$

Hydrochloric acid gives its proton to water:

$$\mathrm{HCl} + \mathrm{H_2O} \longrightarrow \mathrm{H_3O^+} + \mathrm{Cl^-}$$

Ammonia is a base. It takes a proton from water, leaving hydroxide behind:

$$\mathrm{NH_3} + \mathrm{H_2O} \longrightarrow \mathrm{NH_4^+} + \mathrm{OH^-}$$'),

  ('acids-bases-ph', 'acids-bases', 'The pH scale', 1,
'**pH** measures how much acid is in a solution:

$$\mathrm{pH} = -\log_{10}\,[\mathrm{H_3O^+}]$$

where the square brackets mean concentration in moles per litre. Pure water at 25 degrees Celsius has $10^{-7}$ mol/L, so its pH is 7.

| substance | pH |
| - | -: |
| lemon juice | 2 |
| coffee | 5 |
| pure water | 7 |
| blood | 7.4 |
| baking soda solution | 8.3 |
| household bleach | 12.5 |

Because the scale is logarithmic, each step is a factor of ten. A solution at pH 3 is ten times more acidic than pH 4 and a thousand times more acidic than pH 6.'),

  ('acids-bases-neutralisation', 'acids-bases', 'Neutralisation', 2,
'An acid and a base cancel each other out, making a salt and water:

$$\mathrm{HCl} + \mathrm{NaOH} \longrightarrow \mathrm{NaCl} + \mathrm{H_2O}$$

## A titration

How much 0.100 mol/L sodium hydroxide neutralises 25.0 mL of 0.100 mol/L hydrochloric acid?

1. Moles of acid: $0.0250 \text{ L} \times 0.100 \text{ mol/L} = 0.00250$ mol
2. The equation is one to one, so we need 0.00250 mol of NaOH.
3. Volume of base: $0.00250 / 0.100 = 0.0250$ L, which is 25.0 mL.

An indicator added to the flask changes colour right at that point.'),

  ('acids-bases-strength', 'acids-bases', 'Strong and weak', 3,
'A **strong** acid gives up essentially all of its protons in water. Hydrochloric acid is strong.

A **weak** acid gives up only a few. In ordinary vinegar, fewer than 1 in 100 acetic acid molecules are ionised at any moment.

> [!WARNING]
> Strong is not the same as concentrated. A very dilute strong acid can be gentler than a concentrated weak one.

Weak acids make **buffers**, mixtures that resist changes in pH. Your blood uses carbonic acid and bicarbonate as a buffer to hold its pH close to 7.4. A shift of a few tenths of a unit can be life-threatening.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('ecology-roles', 'ecology', 'Producers and consumers', 0,
'Almost every ecosystem runs on sunlight. **Producers**, mostly plants and algae, capture it through photosynthesis:

$$6\,\mathrm{CO_2} + 6\,\mathrm{H_2O} \xrightarrow{\text{light}} \mathrm{C_6H_{12}O_6} + 6\,\mathrm{O_2}$$

Everything else gets its energy by eating.

- **Primary consumers** eat producers: rabbits, caterpillars, cows.
- **Secondary consumers** eat them: foxes, birds, spiders.
- **Decomposers**, like fungi and bacteria, break down dead matter from every level.

A **food chain** follows one path, grass to rabbit to fox. A **food web** shows all the overlapping chains at once.'),

  ('ecology-ten-percent', 'ecology', 'The ten percent rule', 1,
'Only about **10 percent** of the energy at one level of a food chain reaches the next. The rest is used for moving, growing and keeping warm, or is lost as heat.

| level | energy available |
| - | -: |
| grass | 10,000 kcal |
| rabbits | 1,000 kcal |
| foxes | 100 kcal |
| eagles | 10 kcal |

This is why food chains rarely have more than four or five links, and why large predators are always rare.

> [!NOTE]
> The same rule applies to people. Land used to grow crops that we eat directly feeds far more people than land used to grow feed for animals.'),

  ('ecology-cycles', 'ecology', 'Matter goes round', 2,
'Energy flows through an ecosystem in one direction and leaves as heat. **Matter** is different: the same atoms are used again and again.

In the **carbon cycle**, plants take carbon dioxide from the air and build it into sugars. Animals eat the plants and breathe the carbon back out. Decomposers release carbon from dead matter. Some carbon gets buried for millions of years as coal, oil and gas, and burning those fuels returns it to the air far faster than it was stored.

Nitrogen cycles too. Plants cannot use the nitrogen gas that makes up most of the air, so they depend on bacteria in the soil that **fix** it into forms they can absorb.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('sorting-selection', 'sorting', 'Selection sort', 0,
'The simplest idea: find the smallest item, put it first, and repeat on the rest.

```python
def selection_sort(items):
    for i in range(len(items)):
        smallest = i
        for j in range(i + 1, len(items)):
            if items[j] < items[smallest]:
                smallest = j
        items[i], items[smallest] = items[smallest], items[i]
    return items
```

The inner loop looks at every remaining item each time, so the number of comparisons is

$$(n-1) + (n-2) + \dots + 1 = \frac{n(n-1)}{2}$$

That is $O(n^2)$, fine for ten items and hopeless for a million.'),

  ('sorting-merge', 'sorting', 'Merge sort', 1,
'**Merge sort** splits the list in half, sorts each half, and merges the two sorted halves:

```python
def merge_sort(items):
    if len(items) <= 1:
        return items
    mid = len(items) // 2
    return merge(merge_sort(items[:mid]), merge_sort(items[mid:]))

def merge(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]
```

Halving takes about $\log_2 n$ levels, and each level does about $n$ work merging, so merge sort is $O(n \log n)$.'),

  ('sorting-compare', 'sorting', 'How much faster', 2,
'Counting comparisons roughly:

| items | selection sort | merge sort |
| -: | -: | -: |
| 1,000 | 500,000 | 10,000 |
| 1,000,000 | 500,000,000,000 | 20,000,000 |

At a million items the difference is minutes against a fraction of a second.

It can be proved that any sort that works only by comparing items needs about $n \log n$ comparisons in the worst case, so merge sort is as good as that kind of algorithm gets.

> [!NOTE]
> Python''s built-in `sorted()` uses **Timsort**, a blend of merge sort and insertion sort that runs especially fast on data that is already partly in order.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('structures-forces', 'structures', 'Tension and compression', 0,
'A structure stands still when every force on it balances. Engineers call this **equilibrium**: the forces add to zero and nothing turns.

Inside the structure, each part is doing one of two jobs.

- **Tension** pulls a member apart, like the cables of a suspension bridge.
- **Compression** squeezes it, like the columns holding up a roof.

Materials are not equally good at both. Stone and concrete are strong in compression and weak in tension, so concrete that must bend is reinforced with steel bars where it will be stretched.

> [!NOTE]
> Roman arches are built so that every stone is in compression. That is why so many still stand after two thousand years.'),

  ('structures-triangles', 'structures', 'Why triangles', 1,
'Push on the corner of a square frame with pinned joints and it folds into a parallelogram without any side changing length. A triangle cannot do that. Its shape is fixed by its three sides.

That is why triangles are everywhere in structures: roof trusses, bridge girders, crane arms, bicycle frames. A **truss** is a framework of triangles in which every member is in pure tension or pure compression, which lets light members carry heavy loads.

> [!TIP]
> Look at a pylon or a crane next time you pass one and try to find a square panel without a diagonal brace across it.'),

  ('structures-beams', 'structures', 'Bending beams', 2,
'Load a beam from above and it bends. The top edge is squeezed, the bottom edge is stretched, and the middle hardly works at all.

So the material far from the middle matters most. For a rectangular beam, stiffness grows with the **cube** of its depth $h$:

$$I = \frac{b h^3}{12}$$

A plank 2 cm by 10 cm is $\tfrac{2 \times 10^3}{10 \times 2^3} = 25$ times stiffer standing on its edge than lying flat. That is why floor joists are set on edge, and why steel **I-beams** put most of their metal in two wide flanges at the top and bottom.'),

  ('structures-safety', 'structures', 'Safety factors', 3,
'Engineers never design a part to be just strong enough. They divide what it can carry by the largest load it is expected to see:

$$\text{safety factor} = \frac{\text{failure load}}{\text{design load}}$$

A factor of 2 means the part could carry twice the expected load before failing.

The margin covers what cannot be known exactly: variation in materials, loads nobody predicted, wear and corrosion over the years, and mistakes. The factor is larger where failure would be catastrophic, such as lift cables, and where loads are hard to predict.');

INSERT OR IGNORE INTO sections (id, course_id, title, position, body) VALUES
  ('integrals-area', 'integrals', 'Distance as area', 0,
'A car drives at a steady 10 m/s for 5 seconds. Draw its speed against time and you get a flat line. The distance, $10 \times 5 = 50$ m, is the **area** of the rectangle under that line.

This works for any speed graph: the area under the velocity curve is the distance travelled. When the speed keeps changing the shape is not a rectangle, and we need a way to find curved areas.

That is what an **integral** does. The area under $f(x)$ from $a$ to $b$ is written

$$\int_a^b f(x)\,dx$$'),

  ('integrals-riemann', 'integrals', 'Slicing into rectangles', 1,
'Approximate the area under $y = x^2$ from 0 to 3 with three rectangles, each 1 wide.

| heights taken at | sum of areas |
| - | -: |
| left edges: 0, 1, 4 | 5 |
| right edges: 1, 4, 9 | 14 |
| midpoints: 0.25, 2.25, 6.25 | 8.75 |

The left sum is too small, the right sum too big. With more and thinner rectangles all three close in on the same number. That limit is the integral:

$$\int_0^3 x^2\,dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i)\,\Delta x$$'),

  ('integrals-ftc', 'integrals', 'The fundamental theorem', 2,
'Adding up infinitely many slices sounds hopeless, but there is a shortcut. If $F$ is an **antiderivative** of $f$, meaning $F'' = f$, then

$$\int_a^b f(x)\,dx = F(b) - F(a)$$

This is the **fundamental theorem of calculus**. It links integrals to derivatives.

Running the power rule backwards gives antiderivatives of powers:

$$\int x^n\,dx = \frac{x^{n+1}}{n+1} + C \qquad (n \neq -1)$$

So for our example:

$$\int_0^3 x^2\,dx = \frac{3^3}{3} - \frac{0^3}{3} = 9$$

right between the left and right sums, as expected.'),

  ('integrals-use', 'integrals', 'Putting it to work', 3,
'A rocket sled''s velocity is $v(t) = 3t^2$ m/s. How far does it go in the first 2 seconds?

$$\int_0^2 3t^2\,dt = \Big[\, t^3 \,\Big]_0^2 = 8 - 0 = 8 \text{ m}$$

The same idea finds areas between curves, volumes of solids, the work done by a changing force, and the average value of a quantity that changes over time:

$$\text{average of } f \text{ on } [a, b] = \frac{1}{b - a} \int_a^b f(x)\,dx$$

> [!TIP]
> Derivatives break a quantity into rates. Integrals add rates back up into a total. Most of calculus is moving between the two.');
