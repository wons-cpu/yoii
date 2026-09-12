# Yoii

Turn a walk into a record. Yoii tracks your route while you listen on Spotify, then renders the whole thing as a map you can share.

![demo](docs/demo.gif)

## What it is

You start a walk in the app, put your phone away, and listen to whatever you were going to listen to anyway. Yoii records the path you took and the songs that played over it, including the ones you skipped and where you skipped them.

When you stop, you get a **movement**: the route drawn on a dark map, colored by the album art of whatever was playing on each stretch. Skips show up as small marks across the line, like bar lines on a score. Places where you stood still become rests. The whole thing exports as a short vertical video or a single still frame.

The unit names come from sheet music because that is what the finished map ends up looking like.

| term | meaning |
| --- | --- |
| movement | one recorded walk |
| phrase | one song's stretch of the route |
| bar | the point where a song was skipped |
| rest | a place you stopped for a while |
| score | every movement you have recorded |

## Status

Early. I am building this in the open, roughly a week per layer.

- [x] Week 1: render pipeline — Remotion renders the sample fixture to an mp4 and a still frame, gif embedded above
- [ ] Week 2: the app — background location + Spotify polling, produces a valid movement JSON
- [ ] Week 3: custom dark vector map, Protomaps tiles
- [ ] Week 4: share flow, logo, onboarding, TestFlight

Nothing is shippable yet. The checkboxes are honest.

## How it works

```
walk  ->  background location task  ->  movement.json  ->  render worker  ->  mp4 / png
             + Spotify poll (15s)
```

The app writes one file per walk. That file is the only input to everything downstream, so the map in the app and the video on the server draw from exactly the same data.

Two things made this less obvious than it sounds:

**Spotify's API gives you snapshots, not events.** There is no "user skipped a track" callback. You poll `currently-playing` and get back a track and a progress value. Everything else has to be inferred: if the track changed while the previous one was only 40 seconds into a 4 minute song, that was a skip. So the JSON keeps the raw polls separately from the interpreted phrases, and the interpretation can be re-run later when I inevitably get the thresholds wrong.

**The poll cannot be its own background job.** iOS does not guarantee background fetch intervals, so a separate timer leaves holes in the data. Instead the poll rides along inside the location task: every time a new coordinate arrives, check whether 15 seconds have passed and call Spotify if so. Walking produces coordinates continuously, so the poll runs on its own. Standing still stops both, which is fine, because `recently-played` fills the gap when the walk ends.

## Stack

- React Native + Expo (expo-location, expo-task-manager)
- Spotify Web API, Authorization Code with PKCE
- MapLibre + Protomaps for self hosted vector tiles
- Remotion on Node for server side video and frame rendering
- Supabase for auth, storage, and the movement table

## Design decisions

Writing these down mostly so I remember why I did things.

**React Native instead of native Kotlin/Swift.** I am more comfortable in Kotlin, but this needs both platforms and the only genuinely native piece is background location, which expo-location already handles on both. Spotify is plain HTTP, so no native SDK is needed for v1. One codebase was worth more than the familiarity.

**Protomaps instead of Mapbox.** The map has to be almost entirely stripped: no labels, no POI icons, no road names, nothing but road geometry and a faint building layer. That means writing the style JSON by hand either way, so the remaining question was hosting. Protomaps ships the basemap as a single file I host myself, which costs effectively nothing and does not meter me.

**Server side rendering instead of on device.** Rendering video on device means writing it twice, once per platform, and shipping an app update every time the share layout changes. The layout is the part most likely to change, so it lives on the server. Remotion also lets me pull a single frame out of the same composition as a PNG, which is how the still image export works without a second code path.

**Dark map, not light.** Route color comes from album art, and album art is frequently pale. On a light map those tracks wash out and I would have to darken every color to keep contrast, which means the route stops matching the cover it came from. On a dark map any color survives untouched.

**Skips as tick marks, not breaks in the line.** I tried breaking the color at each skip. It looks good with two skips and unreadable with eight, because the route stops being a continuous line. A small perpendicular mark keeps the path intact and records the event, and it happens to look like a bar line, which is where the whole naming scheme came from.

**Walking only, for now.** Driving records fine but ruins the picture. Forty minutes of walking is about two kilometers and eight songs, which fits one screen with the color changing several times. Forty minutes of driving is forty kilometers and the same eight songs, which is one long line at a zoom level where the map detail disappears.

## Known constraints

**Spotify Developer Mode caps this at 5 users.** As of the February 2026 platform changes, a development mode app is limited to five authorized users and requires the developer to hold a Premium account. Extended quota exists but is aimed at organizations with 250k+ monthly actives, so it is not realistically open to an individual project. I knew this going in. Yoii works end to end for a handful of people, and the parts that would matter at scale, mainly the render pipeline, are built as if they had to.

**Refresh tokens expire after six months.** The June and July 2026 changes introduced a six month refresh token lifetime, so reauthorization is handled from the start rather than discovered when a demo breaks.

**Audio features are gone.** `audio-features` and `audio-analysis` were cut off for new apps in November 2024, so route color comes from album artwork rather than track energy or valence. This turned out better anyway, since the color visibly belongs to the cover you were listening to.

## Movement format

One walk serializes to a single JSON document. Times are milliseconds relative to `startedAt`, never absolute, so timezones and DST cannot corrupt a recording.

```jsonc
{
  "schema": 1,
  "number": 23,
  "startedAt": "2026-09-05T21:14:03Z",
  "path":   [[0, 33.77412, -84.39631, 8], ...],   // [t, lat, lng, accuracy_m]
  "polls":  [[0, "spotify:track:...", 18400, true], ...],  // raw snapshots
  "phrases": [...],   // interpreted: one song's stretch, with how it ended
  "rests":   [...],
  "photos":  [...],
  "tracks":  { "spotify:track:...": { "name": ..., "colors": ["#D85A30", "#7A2E14"] } }
}
```

Coordinates are stored to five decimal places, roughly one meter, which is past the point where GPS noise makes more precision meaningful. Accuracy is kept per point so bad fixes can be filtered out later instead of being baked into the route.

Album colors are extracted at record time and stored. Spotify's artwork URLs are not permanent, and I would rather not have old walks turn gray in a year.

Start and end trim distances are stored as settings, not applied to the stored path. Routes almost always begin and end at home, so the display trims them, but the original stays intact in case the setting needs to change.

## Running it

```bash
npm install
cp .env.example .env   # add your Spotify client id and redirect uri
npx expo run:ios       # background location does not work in Expo Go
```

You need a development build on a real device. The simulator will happily report a location and tell you nothing about whether this actually works on a walk.

## License

MIT
