# Visual direction

A light, ink-on-white study workspace. Inspired by Cycle's strong typography and
soft surfaces, with the restraint of shadcn controls. Use white, near-black, and
neutral grays for the interface. Reserve green, red, and yellow for answer
feedback: correct selections, incorrect selections, and missed correct
multiple-response options. Keep markers and text
alongside color.

## Foundation

| Role                     | Value                              |
| ------------------------ | ---------------------------------- |
| Canvas and cards         | `#ffffff`                          |
| Primary text and actions | `#171618`                          |
| Quiet surfaces           | `#fafafa`                          |
| Secondary text           | `#6c6b70`                          |
| Dividers                 | `#e7e7e9`                          |
| Control borders          | `#d1d1d5`                          |
| Correct answer text      | `#166534` on `#f0fdf4`             |
| Incorrect answer text    | `#b42318` on `#fff5f4`             |
| Missed answer text       | `#854d0e` on `#fef9c3`             |
| Display face             | Plus Jakarta Sans, 700–800         |
| Body and UI face         | Inter, 400–600                     |
| Cards                    | 20px radius; subtle neutral shadow |
| Buttons and select       | 8px radius                         |
| Badges                   | Pill radius; neutral background    |
| Content width            | 1120px maximum                     |

Fonts are self-hosted using Fontsource, with only the normal Latin variable font
files included. Edit the shared tokens and component styles in
`src/styles/global.css`.

## Composition and interaction

- Use Study AIB-C01 as the website name. Center the homepage introduction with
  AWS Certified AI Business Strategist as the main heading and Study the strategy
  behind AI. as the subheading. Use a heavy, tightly tracked display face for the
  main heading and a smaller responsive size on mobile.
- Keep configuration compact, with one clear primary action. Use two columns on
  desktop and a single readable column at viewport widths of 800px or less.
- Use gray domain cards with small neutral metadata. No decorative category colors,
  mascots, gradients, or marketing illustrations.
- Use a dark primary button for the next enabled step: Submit before feedback,
  Next after feedback, Practice again on results.
- Keep native form semantics and keyboard operation. Interactive controls get a
  visible ink focus ring. Programmatically focused reading headings do not get
  a control-style ring.
- In revealed Practice feedback and finalized Exam review, distinguish selected
  correct options with green borders and text, a pale green fill, and a check.
  Mark an incorrect selected option with red borders and text, a pale red fill,
  and a cross. Mark unselected correct multiple-response options with yellow
  borders, a pale yellow fill, dark readable text, and “Missed correct answer”.
  Keep unselected incorrect options neutral and single-answer feedback unchanged.
  Overall incorrect feedback and review summaries remain red; unanswered Exam
  questions retain their separate Unanswered status. Correctness and missed
  selections must remain understandable without color. Active Exams conceal all
  answer feedback until finalized.
- Use 17px regular-weight Inter for question text on desktop and 16px on mobile,
  with comfortable line height and blank-line paragraph spacing. Omit the extra
  answer instruction. Label the exit action End practice in Practice and End exam
  in Exam, including completed results. Keep the existing exit/configuration action
  and the separate Practice again or Test again action.
- Keep active Practice progress to the current question number and progress bar.
  Place the compact Show/Hide domain & task control beside the question eyebrow,
  with a visible keyboard focus ring and accessible expanded state. Show the
  Domain x / Task y.z eyebrow initially and retain the display choice in tab
  memory across question navigation, feedback and fresh Practice sessions.
- Center the active Exam countdown in large, readable, tabular digits. Display
  only the time in the countdown, with a separate quiet Exam label and a meaningful
  accessible Time remaining label. On narrow screens, place the countdown on its
  own centered row below the mode label and End exam control.
- Preserve white space, comfortable line height, and full-width controls on small
  screens. Avoid shrinking content to fit extra columns.

## Stack

The design uses native Astro HTML, CSS, and browser TypeScript. It adopts shadcn's
visual conventions without installing its component library.
[Shadcn's Astro integration](https://ui.shadcn.com/docs/installation/astro) is
available if richer components are needed later; its documented setup includes
React and Tailwind. Adding those is a separate implementation decision.
