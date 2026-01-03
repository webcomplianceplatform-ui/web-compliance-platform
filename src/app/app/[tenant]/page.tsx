import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantPanelPage({
  params,
}: {
  params: { tenant: string };
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Tenant: <span className="font-mono">{params.tenant}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            (Más adelante aquí irá login + RBAC + dashboard.)
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
