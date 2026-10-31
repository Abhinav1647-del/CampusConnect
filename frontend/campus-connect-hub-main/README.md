# Campus Connect Hub

app/
├── (tabs)/
│   ├── index.tsx          # Home
│   ├── mess/
│   │   ├── index.tsx      # Mess dashboard
│   │   ├── menu.tsx
│   │   ├── dining.tsx
│   │   └── history.tsx
│   ├── clubs/
│   │   ├── index.tsx
│   │   ├── [clubId].tsx
│   │   └── events.tsx
│   ├── campuscart/
│   │   ├── index.tsx
│   │   ├── [listingId].tsx
│   │   ├── create.tsx
│   │   └── my-activity.tsx
│   └── profile.tsx
├── admin/
│   ├── index.tsx
│   ├── mess.tsx
│   ├── clubs.tsx
│   └── campuscart.tsx
├── _layout.tsx
context/
└── AppContext.tsx
services/
├── api.ts
├── messService.ts
├── clubService.ts
└── campusCartService.ts
components/
types/

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ab99505-b22c-523c-bb3f-0f8f1d94c280).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
