"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { sendNotificationAction, SendResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: SendResult = { ok: false };

// Native select styled to match shadcn Input — kept native so the value posts
// in FormData (Radix Select does not), preserving the server action unchanged.
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Send className="h-4 w-4" />
      {pending ? "Sending…" : "Send"}
    </Button>
  );
}

export default function ComposeForm({ appId }: { appId: string }) {
  const [state, action] = useFormState(sendNotificationAction, initial);
  const [target, setTarget] = useState("all");

  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="app_id" value={appId} />

      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" name="body" rows={3} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="image_url">Image URL (optional)</Label>
        <Input id="image_url" name="image_url" placeholder="https://…" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="launch_url">Launch URL / deep link (optional)</Label>
        <Input id="launch_url" name="launch_url" placeholder="myapp://order/A-100" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="data">Custom data JSON (optional)</Label>
        <Textarea
          id="data"
          name="data"
          rows={2}
          className="font-mono text-xs"
          placeholder='{"screen":"order","order_id":"A-100"}'
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="target_type">Target</Label>
        <select
          id="target_type"
          name="target_type"
          className={selectClass}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="all">All subscribed</option>
          <option value="tags">Tags (equality + AND)</option>
          <option value="external_ids">External user IDs</option>
        </select>
      </div>

      {target === "tags" && (
        <div className="grid gap-2">
          <Label htmlFor="target_filter">Tags filter JSON</Label>
          <Input
            id="target_filter"
            name="target_filter"
            className="font-mono"
            placeholder='{"city":"lahore","plan":"premium"}'
          />
        </div>
      )}
      {target === "external_ids" && (
        <div className="grid gap-2">
          <Label htmlFor="target_filter">External IDs (comma separated)</Label>
          <Input id="target_filter" name="target_filter" placeholder="4821, 99, 1500" />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="scheduled_at">
          Schedule (optional — leave empty to send now)
        </Label>
        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" />
      </div>

      <div>
        <SubmitBtn />
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.ok && state.status === "scheduled" && (
        <Alert>
          <AlertDescription>
            Scheduled — cron will send it at the set time.
          </AlertDescription>
        </Alert>
      )}
      {state.ok && state.status === "completed" && (
        <Alert>
          <AlertDescription>
            Sent — {state.sent} delivered, {state.failed} failed.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
