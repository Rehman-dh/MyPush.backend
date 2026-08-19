"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Plus } from "lucide-react";
import { createAppAction, CreateAppResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initial: CreateAppResult = { ok: false };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Creating…" : "Create app"}
    </Button>
  );
}

export default function CreateAppForm() {
  const [state, action] = useFormState(createAppAction, initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Refresh the app list once a new app is created.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New app
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>New app</CardTitle>
        <CardDescription>
          Create an app and (optionally) attach its FCM service-account JSON now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="app-name">App name</Label>
            <Input id="app-name" name="name" placeholder="My App" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="app-fcm">
              FCM service-account JSON{" "}
              <span className="font-normal text-muted-foreground">
                (optional — add later per app)
              </span>
            </Label>
            <Input
              id="app-fcm"
              type="file"
              name="fcm_service_account"
              accept=".json,application/json"
              className="cursor-pointer file:mr-3 file:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2">
            <SubmitBtn />
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.ok && state.secretKey && (
            <Alert>
              <AlertTitle className="text-primary">
                App created — save these keys now
              </AlertTitle>
              <AlertDescription className="grid gap-2">
                <p className="text-muted-foreground">
                  The secret REST key won&apos;t be shown again.
                </p>
                <div className="grid gap-1">
                  <span className="text-xs font-medium">Public App Key</span>
                  <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                    {state.publicKey}
                  </code>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-medium">Secret REST Key</span>
                  <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                    {state.secretKey}
                  </code>
                </div>
                {state.appId && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/apps/${state.appId}/dashboard`}>
                        Open {state.appName ?? "app"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/apps/${state.appId}/setup`}>
                        View setup guide
                      </Link>
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
