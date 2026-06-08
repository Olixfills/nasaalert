# NasaAlert OPS Room v2

Real-time operations room security monitoring dashboard designed for the Nasarawa State Police Command. It enables operational staff to view, dispatch, resolve, and escalate security threat reports in real time.

## Project Structure

This project has been modularized for clean separation of concerns and maintainability:

```bash
nasaalert/
├── index.html   # Main layout structure & semantic HTML
├── styles.css   # Fluid responsive grid & styling system (dark mode first)
└── app.js       # App state, channels simulation, map interactions, and CSV/Print operations
```

## Features

- **Multi-channel Reporting Simulation**: Simulate threat reports incoming from:
  - **USSD (`*384#`)**
  - **WhatsApp Bot**
  - **Mobile App** (with multi-step forms and anonymity toggle)
- **Live Threat Map**: interactive LGA map showing hotspot status (active alerts vs. medium alerts) in Nasarawa State.
- **Incident Management**: Dispatch patrol units, resolve events, or escalate critical threats directly to the State Security Council.
- **Command Broadcasts**: Send tactical messages to all units or specific divisions with priority levels.
- **Shift Timeline & Logs**: Chronological logging of all operations room activities.
- **Data Exporting**: Export reports directly to CSV or generate clean print layouts for shift handovers.
- **Responsive Web Design**: Optimized with CSS Grid and Flexbox to scale beautifully across mobile, tablet, and widescreen displays.
- **Aesthetic Premium Dark Mode**: Deep blues, greens, and amber accent colors with subtle animations and glassmorphism.
- **Audio Feedback**: Custom Web Audio API alert sound prompts for critical threat dispatches.

## Getting Started

To run the dashboard locally, simply open the `index.html` file in any modern web browser or serve it using a local development server (such as VS Code Live Server or `npx serve`).

```bash
# Serve locally using npx
npx serve .
```
