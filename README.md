# apviz

A Messier catalog viewer for amateur astronomers. Enter your location and a date to see which Messier objects are visible that night, along with their rise, peak, and set times and compass bearings.

## Features

- **Location panel** — enter coordinates manually or use browser geolocation. Set the date and a minimum altitude threshold to filter results.
- **Visible Tonight** — lists all Messier objects that rise above your chosen minimum altitude between sunset and sunrise, sortable by altitude or magnitude.
- **Sun & Moon** — sunset and sunrise times from the USNO API, with moon phase, illumination, and a note on moon visibility during the night.
- **Peak Position** — select any visible object to see its rise, peak, and set times with azimuth and altitude. An interactive compass displays the object's arc across the sky, with distance from centre representing altitude (centre = 90°, edge = 0°).

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data & image sources

### Sun & moon data
Sunset, sunrise, and moon data are fetched from the [US Naval Observatory Astronomical Applications API](https://aa.usno.navy.mil/data/api) (USNO AA API). Times are returned in the local timezone of the observer.

### Messier catalog
Object data (coordinates, type, magnitude, size, distance) sourced from the [Messier catalog at astropixels.com](https://astropixels.com/messier/messiercat.html).

### Object images
- Primary images (93 objects): [NASA Hubble Messier Catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/) — images courtesy NASA/ESA and the Hubble Heritage Team.
- Supplementary images (17 objects): [Wikimedia Commons](https://commons.wikimedia.org/) via the [Messier object article on Wikipedia](https://en.wikipedia.org/wiki/Messier_object).

### Astronomical calculations
Rise, set, altitude, and azimuth calculations are performed client-side using standard spherical astronomy formulas (hour angle, local sidereal time, Greenwich sidereal time).
