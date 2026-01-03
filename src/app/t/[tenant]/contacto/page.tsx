import ContactForm from "./contact-form";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  return (
    <main className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Contacto</h1>
      <p className="text-sm text-muted-foreground">
        Cuéntanos qué necesitas y lo gestionamos.
      </p>

      <ContactForm tenant={tenant} />
    </main>
  );
}
