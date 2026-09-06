# Demo sandbox

Open [the sample demo](/demo) or add `?demo=1` to the home URL. The landing-page action uses `/demo?fresh=1` so each try starts with the complete sample.

The demo contains six recent Barbell bench press sessions using a 3 × 8–12 rule, a 2 RIR floor, and an earned move from 40 kg to 42.5 kg. It immediately shows the current target, a completed result, and recent history.

Demo state uses IndexedDB database `demo:rep-range-compass` and localStorage keys beginning `demo:`. The real app uses IndexedDB database `rep-range-compass` and has separate license keys. While the demo banner is visible, it does not read or write the real database or real license keys.

Use **Reset demo** to restore the sample. **Start for real** clears the demo database and opens the empty real log. The service worker precaches `/demo`, so the populated sample can be reloaded offline after its first visit.
