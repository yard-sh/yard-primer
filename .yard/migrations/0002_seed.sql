-- Sample courses, so a new Primer has something in its catalog. Edit or delete
-- them from the admin panel: this file runs once per database (Yard records it
-- in _yard_migrations), so a course you delete never comes back. INSERT OR
-- IGNORE makes a re-run after a mid-file failure harmless.
--
-- Rules for the text below, which keep it safe for any statement splitter:
-- apostrophes are doubled (''), and no literal contains a semicolon or two
-- hyphens in a row. Tables use single hyphens in their divider rows.
--
-- Times are a fixed moment, 2026-09-28 00:00 UTC, in milliseconds since the
-- epoch.

INSERT OR IGNORE INTO courses (id, title, summary, subject, tier, published, position, created_at, updated_at) VALUES
  ('motion', 'Motion in a Straight Line',
   'Position, velocity and acceleration, and the four equations that describe anything speeding up at a steady rate.',
   'physics', 'free', 1, 0, 1790553600000, 1790553600000),
  ('derivatives', 'Derivatives from Scratch',
   'What a derivative actually measures, built up from slopes you can draw, all the way to the power rule.',
   'math', 'free', 1, 1, 1790553600000, 1790553600000),
  ('moles', 'Counting Atoms with Moles',
   'Why chemists count in moles, how to weigh them out, and how a balanced equation becomes a recipe.',
   'chemistry', 'premium', 1, 2, 1790553600000, 1790553600000),
  ('inheritance', 'Mendel''s Peas',
   'Genes, alleles and the Punnett square, worked through with the same pea plants Gregor Mendel grew.',
   'biology', 'free', 1, 3, 1790553600000, 1790553600000),
  ('algorithms', 'Thinking in Algorithms',
   'How to count the work a program does, what Big-O really says, and why binary search feels like a trick.',
   'cs', 'premium', 1, 4, 1790553600000, 1790553600000);

INSERT OR IGNORE INTO sections (id, course_id, title, position, created_at, updated_at, body) VALUES
  ('motion-position', 'motion', 'Where is it?', 0, 1790553600000, 1790553600000,
'Before we can talk about motion we need a way to say *where* something is. Pick a straight line, mark a zero point, and choose which way counts as positive. A position $x$ is then just a signed distance from zero, in metres.

## Distance and displacement

Walk 5 m east, then 2 m back west.

- The **distance** you covered is $5 + 2 = 7$ m. Distance only ever adds up.
- Your **displacement** is where you ended minus where you started:

$$\Delta x = x_{\text{final}} - x_{\text{initial}} = 3 - 0 = +3\ \text{m}$$

The sign carries the direction. A displacement of $-3$ m would mean three metres the *other* way.

> [!TIP]
> The Greek letter $\Delta$ (delta) always means "change in". You will see it everywhere in this course.'),

  ('motion-velocity', 'motion', 'How fast, and which way', 1, 1790553600000, 1790553600000,
'**Velocity** is how quickly position changes. Over a stretch of time, the average velocity is

$$\bar{v} = \frac{\Delta x}{\Delta t}$$

A sprinter who covers 120 m in 8 s has an average velocity of

$$\bar{v} = \frac{120\ \text{m}}{8\ \text{s}} = 15\ \text{m/s}$$

## Speed is not velocity

Speed is how fast. Velocity is how fast *and which way*. Run a full lap of a 400 m track in 80 s and your average speed is 5 m/s, but your average velocity is zero: you ended where you started, so $\Delta x = 0$.

> [!NOTE]
> On a position against time graph, velocity is the slope. Steep line, high speed. Flat line, standing still.'),

  ('motion-acceleration', 'motion', 'Speeding up', 2, 1790553600000, 1790553600000,
'**Acceleration** is how quickly velocity changes:

$$a = \frac{\Delta v}{\Delta t}$$

Its unit is metres per second, per second: $\text{m/s}^2$.

## The constant acceleration equations

When $a$ does not change, three equations cover everything. Here $v_0$ and $x_0$ are the starting velocity and position:

$$v = v_0 + at$$

$$x = x_0 + v_0 t + \tfrac{1}{2} a t^2$$

$$v^2 = v_0^2 + 2a\,\Delta x$$

## Worked example

A cyclist starts from rest and accelerates at $3\ \text{m/s}^2$ for 4 s.

1. Final velocity: $v = 0 + 3 \times 4 = 12\ \text{m/s}$
2. Distance covered: $\Delta x = \tfrac{1}{2} \times 3 \times 4^2 = 24\ \text{m}$
3. Check with the third equation: $12^2 = 144$ and $2 \times 3 \times 24 = 144$. It agrees.

> [!TIP]
> Pick the equation that contains the three things you know and the one thing you want. You never need all three at once.'),

  ('motion-free-fall', 'motion', 'Falling', 3, 1790553600000, 1790553600000,
'Near the Earth''s surface, anything falling freely accelerates downward at about

$$g \approx 9.8\ \text{m/s}^2$$

no matter how heavy it is. Galileo argued this four hundred years ago, and it holds as long as air resistance is small.

## How long does a fall take?

Drop a stone from a 20 m bridge. It starts at rest, so the second equation becomes $h = \tfrac{1}{2} g t^2$. Solving for $t$:

$$t = \sqrt{\frac{2h}{g}} = \sqrt{\frac{2 \times 20}{9.8}} \approx 2.02\ \text{s}$$

It hits the water at $v = g t \approx 19.8\ \text{m/s}$, a little over 70 km/h.

> [!WARNING]
> A feather and a hammer only land together in a vacuum. Apollo 15 astronaut David Scott tried it on the Moon, and they did.'),

  ('derivatives-secant', 'derivatives', 'The slope between two points', 0, 1790553600000, 1790553600000,
'The slope of a straight line is rise over run. A curve has no single slope, but we can still ask how steep it is *between two points*.

Take $f(x) = x^2$. Between $x = 1$ and $x = 3$:

$$\frac{f(3) - f(1)}{3 - 1} = \frac{9 - 1}{2} = 4$$

That number is the **average rate of change**, the slope of the straight line (a *secant*) joining the two points on the curve.

> [!NOTE]
> If $x$ were time in seconds and $f(x)$ a distance in metres, this would be an average velocity: 4 m/s.'),

  ('derivatives-limit', 'derivatives', 'Shrinking the gap', 1, 1790553600000, 1790553600000,
'To get the slope *at* a single point, slide the second point closer and closer. Call the gap $h$:

$$\frac{f(x + h) - f(x)}{h}$$

For $f(x) = x^2$ at $x = 3$, watch what happens as $h$ shrinks:

| $h$ | slope of the secant |
| -: | -: |
| 1 | 7 |
| 0.1 | 6.1 |
| 0.01 | 6.01 |
| 0.001 | 6.001 |

The slopes close in on 6. That limiting value is the **derivative**:

$$f''(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}$$

## Doing it with algebra

$$\frac{(x + h)^2 - x^2}{h} = \frac{2xh + h^2}{h} = 2x + h$$

As $h \to 0$ this becomes $2x$. So the derivative of $x^2$ is $2x$, and at $x = 3$ it is 6, exactly as the table suggested.'),

  ('derivatives-power', 'derivatives', 'The power rule', 2, 1790553600000, 1790553600000,
'Working out every derivative from the limit gets old fast. Luckily, powers of $x$ follow one pattern:

$$\frac{d}{dx}\, x^n = n\,x^{n-1}$$

Bring the power down in front, then take one off the power.

- $x^3$ becomes $3x^2$
- $x^{10}$ becomes $10x^9$
- $\sqrt{x} = x^{1/2}$ becomes $\tfrac{1}{2}x^{-1/2} = \dfrac{1}{2\sqrt{x}}$
- a constant, like $7$, becomes $0$ (a flat line has no slope)

Derivatives also split over sums and let constants ride along:

$$\frac{d}{dx}\left(4x^3 + 5x\right) = 12x^2 + 5$$

> [!TIP]
> The rule works for any real power, negative and fractional ones included.'),

  ('derivatives-reading', 'derivatives', 'Reading a derivative', 3, 1790553600000, 1790553600000,
'A derivative is a rate, so it has units: the units of $f$ divided by the units of $x$. If $s(t)$ is a position in metres and $t$ is in seconds, then $s''(t)$ is in metres per second. It is the velocity.

## The tangent line

At $x = 3$ the curve $y = x^2$ has height 9 and slope $2 \times 3 = 6$. The straight line through $(3, 9)$ with slope 6 is

$$y = 6x - 9$$

That line just grazes the curve. Zoom in far enough on any smooth curve and it looks like its tangent.

## What the sign tells you

- $f''(x) > 0$: the function is rising
- $f''(x) < 0$: the function is falling
- $f''(x) = 0$: it is momentarily flat, often at a peak or a valley

Finding where a derivative is zero is how you find the best, the biggest or the cheapest of anything, which is most of what calculus gets used for.'),

  ('moles-why', 'moles', 'A chemist''s dozen', 0, 1790553600000, 1790553600000,
'Atoms are far too small to count one by one, so chemists count them in bundles. The bundle is called a **mole**, and it holds exactly

$$N_A = 6.022\,140\,76 \times 10^{23}$$

particles. That number is the [Avogadro constant](https://en.wikipedia.org/wiki/Avogadro_constant).

Why such an odd number? It was chosen so that one mole of carbon-12 atoms weighs almost exactly 12 grams. That makes the mass of a mole of anything easy to read off the periodic table.

> [!NOTE]
> A mole of grains of sand would bury a large country kilometres deep. A mole of water molecules fits in a tablespoon.'),

  ('moles-mass', 'moles', 'Molar mass', 1, 1790553600000, 1790553600000,
'The **molar mass** $M$ of a substance is the mass of one mole of it, in grams per mole. Add up the atomic masses from the periodic table.

For water, $\mathrm{H_2O}$:

$$M = 2(1.008) + 16.00 = 18.02\ \text{g/mol}$$

## Grams to moles

$$n = \frac{m}{M}$$

So 36 g of water is

$$n = \frac{36\ \text{g}}{18.02\ \text{g/mol}} \approx 2.0\ \text{mol}$$

which is about $2.0 \times 6.022 \times 10^{23} \approx 1.2 \times 10^{24}$ molecules.

> [!TIP]
> Always carry the units through. If they do not cancel to what you want, the setup is wrong.'),

  ('moles-recipes', 'moles', 'Equations as recipes', 2, 1790553600000, 1790553600000,
'A balanced equation is a recipe written in moles:

$$2\,\mathrm{H_2} + \mathrm{O_2} \longrightarrow 2\,\mathrm{H_2O}$$

Read it as "2 mol of hydrogen and 1 mol of oxygen make 2 mol of water". The numbers in front are ratios between moles, not between grams.

## How much water from 4.0 g of hydrogen?

1. Grams to moles: $n_{\mathrm{H_2}} = 4.0 / 2.016 \approx 1.98\ \text{mol}$
2. Use the ratio: 2 mol $\mathrm{H_2}$ gives 2 mol $\mathrm{H_2O}$, so $n_{\mathrm{H_2O}} \approx 1.98\ \text{mol}$
3. Moles to grams: $1.98 \times 18.02 \approx 35.7\ \text{g}$

> [!WARNING]
> Never compare grams across an equation directly. Convert to moles, use the ratio, then convert back.'),

  ('moles-limiting', 'moles', 'The limiting reagent', 3, 1790553600000, 1790553600000,
'Real reactions rarely get ingredients in exactly the right ratio. Whatever runs out first is the **limiting reagent**, and it decides how much product you get.

## Example

Mix 4.0 g of $\mathrm{H_2}$ with 16.0 g of $\mathrm{O_2}$.

| | grams | moles |
| - | -: | -: |
| $\mathrm{H_2}$ | 4.0 | 1.98 |
| $\mathrm{O_2}$ | 16.0 | 0.500 |

Burning all 1.98 mol of hydrogen would need $1.98 / 2 = 0.99$ mol of oxygen. We only have 0.500 mol, so **oxygen is limiting**.

- Water made: $2 \times 0.500 = 1.00$ mol, which is 18.0 g
- Hydrogen used: 1.00 mol, leaving $0.98$ mol (about 2.0 g) behind

Mass is conserved: $4.0 + 16.0 = 20.0$ g went in and $18.0 + 2.0 = 20.0$ g came out.'),

  ('inheritance-alleles', 'inheritance', 'Genes and alleles', 0, 1790553600000, 1790553600000,
'A **gene** is a stretch of DNA that affects a trait, such as flower colour. Different versions of the same gene are called **alleles**. Pea plants carry two copies of each gene, one from each parent.

Gregor Mendel studied pea flowers that were either purple or white. Write the purple allele as $P$ and the white one as $p$.

| genotype | flower |
| - | - |
| $PP$ | purple |
| $Pp$ | purple |
| $pp$ | white |

One $P$ is enough for purple, so purple is **dominant** and white is **recessive**. The pair of alleles is the *genotype*. The colour you can see is the *phenotype*.

> [!NOTE]
> Read more about [Gregor Mendel](https://en.wikipedia.org/wiki/Gregor_Mendel), a monk whose pea experiments in the 1850s and 60s went unnoticed for thirty years.'),

  ('inheritance-punnett', 'inheritance', 'Crossing two hybrids', 1, 1790553600000, 1790553600000,
'Cross two purple plants that are both $Pp$. Each parent passes on one allele at random, so a **Punnett square** lists every combination:

| | $P$ | $p$ |
| :-: | :-: | :-: |
| $P$ | $PP$ | $Pp$ |
| $p$ | $Pp$ | $pp$ |

Four equally likely outcomes: one $PP$, two $Pp$, one $pp$. Three of the four are purple, so we expect a **3 : 1** ratio of purple to white.

Mendel counted 705 purple and 224 white plants in exactly this cross. That is a ratio of $705 / 224 \approx 3.15$, very close to 3.

> [!TIP]
> Each box is a probability of $\tfrac{1}{4}$. The chance of a white flower is the number of $pp$ boxes times $\tfrac{1}{4}$.'),

  ('inheritance-dihybrid', 'inheritance', 'Two genes at once', 2, 1790553600000, 1790553600000,
'Mendel also tracked two traits together: seed shape (round $R$ over wrinkled $r$) and seed colour (yellow $Y$ over green $y$).

Crossing two $RrYy$ plants gives a 16 box square. Because the two genes are inherited independently, you can multiply the separate probabilities instead of drawing it:

$$P(\text{wrinkled and green}) = P(rr) \times P(yy) = \tfrac{1}{4} \times \tfrac{1}{4} = \tfrac{1}{16}$$

The full pattern is **9 : 3 : 3 : 1**.

| seeds | expected | Mendel counted |
| - | -: | -: |
| round, yellow | 9 | 315 |
| round, green | 3 | 108 |
| wrinkled, yellow | 3 | 101 |
| wrinkled, green | 1 | 32 |

> [!NOTE]
> Independent assortment only holds for genes on different chromosomes, or far apart on the same one. Genes close together tend to travel as a pair.'),

  ('algorithms-steps', 'algorithms', 'Counting steps', 0, 1790553600000, 1790553600000,
'How long does a program take? Seconds depend on the machine, so instead we count **steps**, and ask how that count grows with the size of the input, $n$.

Here is a linear search. It looks at each item in turn:

```python
def find(items, target):
    for i, item in enumerate(items):
        if item == target:
            return i
    return -1
```

- Best case: the target is first. One comparison.
- Worst case: the target is last, or missing. $n$ comparisons.

Double the list and the worst case doubles too. The work grows in a straight line with $n$, which is why this is called **linear** time.'),

  ('algorithms-big-o', 'algorithms', 'Big-O notation', 1, 1790553600000, 1790553600000,
'Big-O is a way of saying how fast the step count grows, ignoring constant factors and small inputs. Formally, $f(n) = O(g(n))$ if there are constants $c > 0$ and $n_0$ with

$$f(n) \le c \cdot g(n) \quad \text{for all } n \ge n_0$$

So $3n + 20$ is $O(n)$: once $n \ge 20$, it is never more than $4n$.

## Why it matters

| $n$ | $\log_2 n$ | $n \log_2 n$ | $n^2$ |
| -: | -: | -: | -: |
| 10 | 3 | 33 | 100 |
| 1,000 | 10 | 10,000 | 1,000,000 |
| 1,000,000 | 20 | 20,000,000 | $10^{12}$ |

At a million items the difference between $n \log n$ and $n^2$ is the difference between a blink and a coffee break.

> [!TIP]
> Constants still matter in practice. Big-O tells you which approach wins *eventually*, not which is faster on ten items.'),

  ('algorithms-binary', 'algorithms', 'Binary search', 2, 1790553600000, 1790553600000,
'If the list is **sorted**, you can do far better than checking every item. Look at the middle: if the target is bigger, throw away the left half, otherwise throw away the right half. Repeat.

```python
def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

Every step halves what is left, so the number of steps is about

$$\lceil \log_2 n \rceil$$

A million sorted items take at most 20 steps. A billion take 30. That is $O(\log n)$.

> [!WARNING]
> Binary search on an unsorted list silently returns wrong answers. Sorting first costs $O(n \log n)$, which only pays off if you search many times.'),

  ('algorithms-quadratic', 'algorithms', 'When quadratic hurts', 3, 1790553600000, 1790553600000,
'Does a list contain a duplicate? The obvious answer compares every pair:

```python
def has_duplicate_slow(items):
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                return True
    return False
```

That is $\tfrac{n(n-1)}{2}$ comparisons, which is $O(n^2)$. For a million items it is about $5 \times 10^{11}$ comparisons: minutes of work.

## Trade memory for time

Remember what you have seen in a set, where checking membership takes roughly constant time:

```python
def has_duplicate(items):
    seen = set()
    for item in items:
        if item in seen:
            return True
        seen.add(item)
    return False
```

One pass, $O(n)$. The same million items now take a fraction of a second.

> [!NOTE]
> Nested loops over the same data are the most common source of accidental $O(n^2)$ code. When you spot one, ask whether a set or a dictionary could replace the inner loop.');
