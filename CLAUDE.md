# CLAUDE.md

Context for working in this repo. Read this before writing code.

## What this is

Yoii records a walk and the music that played over it, then renders the result as a short vertical video and a still frame. See README.md for the product description.

I am an undergrad building this as a portfolio project, targeting internship applications. Speed to something demonstrable matters more than completeness. Prefer a working end to end path over a well covered partial one.

## Current goal: week 1

Build the render pipeline **before** the app exists, driven entirely by `fixtures/sample-movement.json`.

By the end of the week I want:

- `npx remotion render` producing a 1080x1920 mp4 from the fixture
- the same composition producing a single PNG of the final frame
- a gif of that video embedded at the top of README.md

The app, Spotify auth, and background location are **week 2**. Do not start them. If a task seems to require the app, it is out of scope for now.

## Decisions already made

These were settled deliberately. Do not re-open them without asking.

- **Dark map, never light.** Route color comes from album art, which is often pale. On a light background those colors wash out and have to be darkened, which breaks the link to the cover.
- **Skips are tick marks, not breaks in the line.** A short perpendicular mark across the route. Breaking the color fragments the path and becomes unreadable past a few skips. The mark looks like a bar line, which is where the naming comes from.
- **Route draws with equal time per phrase, not proportional to real elapsed time.** Real proportions make the first songs flash past. Equal time gives the animation a regular pulse.
- **Server side rendering, not on device.** The share layout will change often and must not require an app update.
- **Walking only.** Driving is out of scope for v1.
- **No song list on the final frame.** A track list makes it look like a Spotify screenshot. The songs already appeared during the video.

## Vocabulary

Use these names in code, not generic ones.

| term | meaning |
| --- | --- |
| movement | one recorded walk, and the JSON that represents it |
| phrase | one song's stretch of the route |
| bar | the mark where a song was skipped |
| rest | a place the walker stopped for a while |
| score | the collection of all movements |

## Data contract

`fixtures/sample-movement.json` is the single input. It is synthetic (`"synthetic": true`) and the track IDs are placeholders, not real Spotify URIs. Its shape is the shape the app will produce in week 2, so treat it as fixed.

- All times are **milliseconds relative to `startedAt`**. Never absolute. Never seconds.
- `path` entries are `[t, lat, lng, accuracyMeters]`.
- `polls` are raw 30 second snapshots: `[t, uri, progressMs, isPlaying]`. They are evidence, not events.
- `phrases` are the interpretation of those polls. The renderer reads `phrases`, not `polls`.

Keep the interpreter separate from the renderer, in its own module with its own tests. It will be rewritten in week 2 when real data exposes cases the fixture does not.

### Rules the fixture is designed to exercise

- **Accuracy filter.** Drop path points with `accuracy > 30`. Index 7 of the fixture is 38m and will visibly kink the route if it is not dropped.
- **Gap from a rest.** There are no path points between t=420000 and t=540000 because the walker stood still, so there are no polls either. A track change happened inside that silence. The phrase that starts there is marked `"source": "inferred"` because its start time was back-calculated from the next poll's progress value, not observed.
- **Three endings, not two.** `completed`, `skipped`, and `trip_ended`. Only `skipped` draws a bar. `trip_ended` means the song was still playing when the walk stopped.
- **Repeated tracks.** The same URI appears in two phrases. `tracks` is a dictionary keyed by URI precisely so it is stored once.

## Visual spec

Canvas 1080x1920, 30fps. Total length about 7 seconds: roughly 5s drawing the route, 2s holding the final frame. It should loop without a jarring cut.

Instagram stories overlay UI on roughly the top and bottom 15% of the frame. Keep all text out of those bands.

```
background        #12110F
road geometry     #221F1C
bar mark          #F2EEE5
primary text      #F2EEE5
secondary text    #8A8579
```

Route color comes from `tracks[uri].colors`, a two color array, applied as a gradient along that phrase. The colors are pre-extracted and stored at record time because Spotify artwork URLs are not permanent.

Route stroke is uniform width, round caps and joins. Start point is a hollow circle in the first phrase's color, end point is filled in the last phrase's color. These two dots are the two i's in the Yoii logo, so keep them visually paired.

Final frame carries: the full route, the movement number in roman numerals, and one meta line of date, city, temperature, and duration. Nothing else. The Yoii mark goes small at the end of the meta line.

Map tiles are **not** needed this week. Draw the route on the flat background first. The Protomaps basemap lands in week 3.

## Stack

React Native + Expo for the app (week 2). Remotion on Node for rendering. MapLibre + Protomaps for tiles. Supabase for auth, storage, and the movement table. TypeScript throughout.

## Conventions

- Commit messages in English, explaining **why** rather than what. `drop gps points with accuracy over 30m to stop route jitter`, not `fix bug`.
- Work on branches and merge by PR even though I am solo. The PR descriptions are part of the portfolio.
- Never commit secrets. `.env` is ignored; `.env.example` holds empty keys only. Spotify uses PKCE so there is no client secret to leak, but do not introduce one.
- Keep the README status checkboxes honest. Tick them as things actually work.

## Out of scope for now

Photos, weather fetching, rests rendering, accounts, feeds, Android, settings screens, onboarding, and the replay feature where another person walks the same route. The JSON reserves fields for some of these. Leave them empty rather than filling them in.

## Known external constraint

Spotify Developer Mode caps the app at 5 authorized users and requires a Premium developer account, as of the February 2026 platform changes. Extended quota is aimed at organizations with 250k+ monthly actives. This is accepted, not a problem to solve. Design the render pipeline as if it had to scale; do not bother hardening anything else.
