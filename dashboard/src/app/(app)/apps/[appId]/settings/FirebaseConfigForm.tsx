"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { setFirebaseConfigAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial = { ok: false } as { ok: boolean; error?: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save Firebase config"}
    </Button>
  );
}

export default function FirebaseConfigForm({
  appId,
  hasAndroid,
  hasIos,
}: {
  appId: string;
  hasAndroid: boolean;
  hasIos: boolean;
}) {
  const [state, action] = useFormState(setFirebaseConfigAction, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {hasAndroid || hasIos ? "Edit Firebase config" : "Set up Firebase config"}
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="app_id" value={appId} />

      <div className="grid gap-2">
        <Label htmlFor="gs-json" className="flex items-center gap-2 text-muted-foreground">
          Android — upload <code className="text-foreground">google-services.json</code>
          {hasAndroid && <Badge variant="secondary">set</Badge>}
        </Label>
        <Input
          id="gs-json"
          type="file"
          name="google_services_json"
          accept=".json,application/json"
          className="cursor-pointer"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gs-plist" className="flex items-center gap-2 text-muted-foreground">
          iOS — upload{" "}
          <code className="text-foreground">GoogleService-Info.plist</code>
          {hasIos && <Badge variant="secondary">set</Badge>}
        </Label>
        <Input
          id="gs-plist"
          type="file"
          name="google_service_info_plist"
          accept=".plist,text/xml,application/xml"
          className="cursor-pointer"
        />
      </div>

      <div className="flex gap-2">
        <SubmitBtn />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.ok && (
        <Alert>
          <AlertDescription>Saved.</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
