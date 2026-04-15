# apviz

A deep sky object viewer for amateur astronomers. Enter your location and a date to see which NGC objects are visible that night, along with their rise, peak, and set times and compass bearings.

## Features

- **Location panel** — enter coordinates manually or use browser geolocation. Set the date, minimum altitude, and maximum magnitude to filter results.
- **Visible Tonight** — lists NGC objects visible above your chosen altitude and magnitude limits between sunset and sunrise, sortable by altitude, magnitude, or size.
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

### Weather & twilight
Astronomical twilight times and tonight's forecast are fetched from the [weather.gov API](https://api.weather.gov) (US locations only).

### NGC catalog
Object data (coordinates, type, magnitude, size) sourced from [OpenNGC](https://github.com/mattiaverga/openngc) by Mattia Verga, a comprehensive open-source catalog of NGC and IC objects.

### Object images
- Primary images (93 Messier objects): [NASA Hubble Messier Catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/) — images courtesy NASA/ESA and the Hubble Heritage Team.
- Supplementary images: [Wikimedia Commons](https://commons.wikimedia.org/) via the [Messier object article on Wikipedia](https://en.wikipedia.org/wiki/Messier_object).

### Astronomical calculations
Rise, set, altitude, and azimuth calculations are performed client-side using standard spherical astronomy formulas (hour angle, local sidereal time, Greenwich sidereal time).
