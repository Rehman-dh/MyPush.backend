"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateFcmAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial = { ok: false } as { ok: boolean; error?: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save FCM key"}
    </Button>
  );
}

export default function UpdateFcmForm({
  appId,
  hasFcm,
}: {
  appId: string;
  hasFcm: boolean;
}) {
  const [state, action] = useFormState(updateFcmAction, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {hasFcm ? "Update FCM key" : "Add FCM key"}
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="app_id" value={appId} />
      <Label htmlFor="fcm-file" className="text-muted-foreground">
        Upload the FCM <b className="text-foreground">service-account JSON</b>{" "}
        (Firebase → Project Settings → Service Accounts → Generate new private
        key). Used server-side to send.
      </Label>
      <Input
        id="fcm-file"
        type="file"
        name="fcm_service_account"
        accept=".json,application/json"
        className="cursor-pointer"
      />
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
