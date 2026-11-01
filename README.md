# Chronocraft: Time-Loop Architect

> A newspaper-styled puzzle game where you cooperate with past versions of yourself.

Every round lasts a short time. When you close the edition, your run is recorded and replayed as a **clone** that walks exactly the same path. Next round you work beside it. Clones hold pressure plates, stand in a gunner's sights, and open gates for you. The final run through the level is the one where everything lines up.

Built with plain HTML, CSS and JavaScript on a `<canvas>`. No libraries, no build step.

## How to run

1. Put `index.html`, `style.css` and `game.js` in the same folder.
2. Open `index.html` in a browser (or use a live-server extension).
3. An internet connection is needed once for the Google Fonts (UnifrakturCook, Old Standard TT, Courier Prime). Without it the game still works, just with fallback fonts.

To jump straight to a level, add `#N` to the address, e.g. `index.html#4`.

## How to play

| Key | Action |
| --- | --- |
| `W A S D` / Arrow keys | Move |
| `Enter` | Close the edition: record this run as a clone and start the next round |
| `Backspace` | Restart the level (removes all clones) |

On-screen buttons (arrows, **Close Edition**, **Recall All**) do the same on touch screens.

**Goal:** reach the hatched exit square. Clearing a level earns money. Finish in fewer rounds for a bigger bonus.

### The rules of the Yard

- **Clones replay your exact inputs.** After its recording ends, a clone stands still where it finished. That is how a clone "holds" a plate.
- **Plates and gates.** A lowercase plate (`a`) opens the gate with the matching capital letter (`A`) while someone stands on it. A gate also stays open while anyone is standing in it.
- **Guards** patrol a fixed route (shown as a dotted line) in the same rhythm every round. Touching one reprints the round (your clones stay).
- **Gunners** lock on to the nearest thing they can see inside the red circle, whether that is you or a clone. If the lock completes, the shot always hits. A hit on you restarts the round. A hit on a clone does nothing, so clones make perfect decoys. Walls and closed gates block their line of sight.
- **Rounds are limited** (5 by default). Running out of rounds or time restarts the level.

### The shop

After every level you can spend your earnings. Each purchase makes the next one of the same kind more expensive.

| Item | Effect | Max |
| --- | --- | --- |
| Running Shoes | +15% walking speed | 3 |
| Pocket Watch | +5 seconds every round | 4 |
| Energy Drink | +1 extra round (and clone) per level | 4 |
| Iron Hat | Survive one guard or gunner hit per round | 2 |

## Levels

| # | Name | New idea |
| --- | --- | --- |
| 1 | Guards patrol the yard | Time your crossing past patrolling guards |
| 2 | Guard stands between you and the plate | A clone holds a plate to open a gate while a guard roams |
| 3 | The gunner cannot tell you from your clone | A clone draws the gunner's fire |
| 4 | Two gates, two plates | Chain two clones: one opens gate A, the other opens gate B |
| 5 | A clone holds the gate, another takes the fire | Combine a gate clone and a decoy clone |
| 6 | All defenders together | Guard, gunner, plate and gate in one room |

## Adding your own levels

Levels are plain data in the `LEVELS` array at the top of `game.js`. Copy a block and change it:

```js
{
    name: "my level",
    seconds: 45,                     // time per round
    reward: 30,                      // money for clearing it
    maxRounds: 5,                    // optional, default 5
    hints: ["Shown in round 1.", "Shown in round 2."],
    enemies: [ { from:[6,1], to:[6,10], speed:110, offset:0.3 } ],   // optional guards
    shooters: [ { at:[18,5], range:10, every:75 } ],                 // optional gunners
    map: [ /* exactly 12 rows of exactly 20 characters */ ]
}
```

Map legend:

| Char | Meaning |
| --- | --- |
| `#` | Wall |
| `.` | Floor |
| `@` | Player start (exactly one) |
| `*` | Exit |
| `a`-`z` | Pressure plate |
| `A`-`Z` | Gate, opened by the plate with the same letter |

Gunner options: `range` is in tiles, `every` is the number of ticks (60 per second) needed to lock on before firing. Guard `speed` is in pixels per second, and `offset` (0 to 1) shifts where on its route the guard starts.

If a map has the wrong number of rows or columns, or no `@`, the game throws a clear error naming the level.

## How it works (short version)

- A **fixed 60-tick-per-second** loop makes every run deterministic, which is what lets clones replay perfectly.
- Each tick's input is stored as a bitmask (up/down/left/right). A clone is just that list fed back through the same `step()` function the player uses.
- Movement uses acceleration and friction with per-axis tile collision, so you slide along walls.
- Guards are a pure function of the tick number, so they behave the same every round.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout, HUD, shop overlay |
| `style.css` | Old-newspaper look (paper texture, masthead, hatched walls) |
| `game.js` | Game loop, levels, clones, guards, gunners, shop, rendering |

## Ideas for later

- Paradox penalty when you block a clone's path
- Carrying items and resource chains
- More levels and a level-select screen
