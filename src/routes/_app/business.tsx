import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAction } from "@/lib/mutate";
import { useCurrentUser, useOwnClient, useAscStore } from "@/lib/store";

export const Route = createFileRoute("/_app/business")({
  component: BusinessPage,
});

function BusinessPage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const clients = useAscStore((s) => s.clients);
  const [picked, setPicked] = useState(own?.id ?? clients[0]?.id ?? "");
  const clientId = own?.id ?? picked;
  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <PageHeader
        title="No business yet"
        description="ASC will add your company here when the tenant exists."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Business"
        title="Business"
        description="Phone, hours, address — stored for your public site once it is wired."
      />
      {user?.role === "operator" ? (
        <label className="max-w-md">
          <NativeSelect value={client.id} onChange={(e) => setPicked(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
      ) : null}
      <BusinessForm key={client.id} clientId={client.id} />
    </div>
  );
}

function BusinessForm({ clientId }: { clientId: string }) {
  const client = useAscStore((s) => s.clients.find((c) => c.id === clientId));
  const updateClient = useAscStore((s) => s.updateClient);
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(client?.whatsapp ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [hours, setHours] = useState(client?.hours ?? "");
  const [contactName, setContactName] = useState(client?.contactName ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    void saveAction("Saved in Manager — not live until the public site is wired.", () =>
      updateClient(clientId, { phone, email, whatsapp, address, hours, contactName }),
    );
  }

  if (!client) return null;

  return (
    <Surface>
      <form onSubmit={submit} className="grid gap-5 p-5">
        <Field label="Who answers the phone">
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </Field>
        <Field label="Public email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Hours">
          <Textarea value={hours} onChange={(e) => setHours(e.target.value)} rows={2} />
        </Field>
        <Button type="submit" className="w-fit rounded-full">
          Save on my site
        </Button>
      </form>
    </Surface>
  );
}
