The combat tracker is the shared, visible list the AI keeps of everyone in the fight and their current initiative card, re-sorted at the top of every round.

## What it Shows
- Every combatant currently in the fight (players and enemies)
- The card each combatant — or each Extras group — was dealt this round (see [[Initiative]])
- Turn order, highest card to lowest
- Extras are listed as a single grouped entry (e.g. "Goblin Mob (x6) — 9♣") rather than one line per enemy

## Round Structure
1. **Deal.** The AI deals one card to every combatant and updates the tracker.
2. **Resolve turns.** Starting from the top of the tracker, each combatant takes their turn (see [[Combat Stages]]) in card order.
3. **New round.** Once everyone has acted, cards are cleared, a new round begins, and step 1 repeats.

Because the deck is redealt every round, turn order is never the same twice — a crawler acting last one round might open the next round first.
