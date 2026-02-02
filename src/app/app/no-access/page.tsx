export default function NoAccessPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">No tenant assigned</h1>
      <p className="mt-2 text-sm opacity-80">
        Your account doesn’t have access to any tenant yet. Ask an admin to create a tenant and assign you a role.
      </p>
    </main>
  );
}
