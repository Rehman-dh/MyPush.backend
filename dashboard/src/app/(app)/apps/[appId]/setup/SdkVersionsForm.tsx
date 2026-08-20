"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import {
  updateSdkVersionsAction,
  UpdateSdkVersionsResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SdkVersions } from "@/lib/sdk-versions";

const initial: UpdateSdkVersionsResult = { ok: false };

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/**
 * Owner-only editor for the SDK versions the Setup page renders. Global — one
 * value for all apps — and applies immediately (no deploy). Type a version that
 * matches a real published tag (Flutter git tag / Android JitPack tag).
 */
export default function SdkVersionsForm({ versions }: { versions: SdkVersions }) {
  const [state, action] = useFormState(updateSdkVersionsAction, initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      setOpen(false);
    }
  }, [state.ok, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
        Latest versions: Flutter {versions.flutter} · Android {versions.android} —
        edit
      </button>
    );
  }

  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">SDK versions (latest)</h3>
        <p className="text-xs text-muted-foreground">
          Shown in the setup snippets for every app. Applies immediately — no
          deploy. Use a version that matches a published tag.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="v-flutter" className="text-xs">
            Flutter (git tag)
          </Label>
          <Input
            id="v-flutter"
            name="flutter"
            defaultValue={versions.flutter}
            placeholder="0.3.2"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="v-android" className="text-xs">
            Android (JitPack tag)
          </Label>
          <Input
            id="v-android"
            name="android"
            defaultValue={versions.android}
            placeholder="0.2.0"
            required
          />
        </div>
      </div>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <SaveBtn />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
