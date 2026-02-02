This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## WebCompliance Platform notes

### Evidence Packs (Storage + RLS)

If you enabled Evidence Packs, create a private Storage bucket (default: `evidence-packs`) and run:

- `sql/p5_evidence_packs.sql` (tables)
- `sql/p11_rls_storage.sql` (Row Level Security + Storage policies)

Server-side operations use the Supabase **service role** and will continue to work even with RLS enabled.

### Main routes

- Public tenant website: `/t/[tenant]`
- Private tenant app: `/app/[tenant]`
- Tenant selector (user hub): `/app`
- **Platform superadmin** (your internal view): `/admin`

### Superadmin access

`/admin` is protected by an env allowlist. Add your email(s):

```bash
SUPERADMIN_EMAILS=you@yourdomain.com,other@yourdomain.com
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
