"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Bell,
  ChevronDown,
  Plus,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { sendNotificationAction, SendResult } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: SendResult = { ok: false };

interface Row {
  key: string;
  value: string;
}
interface BtnRow {
  id: string;
  text: string;
  icon: string;
}

function SubmitBtn({ mode }: { mode: string }) {
  const { pending } = useFormStatus();
  const label = mode === "now" ? "Send" : "Schedule";
  return (
    <Button type="submit" disabled={pending} size="lg">
      <Send className="h-4 w-4" />
      {pending ? "Working…" : `Review & ${label}`}
    </Button>
  );
}

function SectionCard({
  step,
  title,
  children,
}: {
  step?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {step && <span className="mr-2 text-muted-foreground">{step}.</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function AdvancedRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

export default function ComposeForm({ appId }: { appId: string }) {
  const [state, action] = useFormState(sendNotificationAction, initial);

  // ── content ──
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [launchUrl, setLaunchUrl] = useState("");

  // ── audience ──
  const [audience, setAudience] = useState<"all" | "particular">("all");
  const [targetType, setTargetType] = useState<"tags" | "external_ids">("tags");
  const [tagRows, setTagRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [externalIds, setExternalIds] = useState("");
  const [iosOn, setIosOn] = useState(true);
  const [androidOn, setAndroidOn] = useState(true);

  // ── iOS options ──
  const [badgeMode, setBadgeMode] = useState<"none" | "set">("none");
  const [badge, setBadge] = useState("1");
  const [iosSound, setIosSound] = useState("");
  const [contentAvailable, setContentAvailable] = useState(false);
  const [interruption, setInterruption] = useState("active");

  // ── Android options ──
  const [bigPicture, setBigPicture] = useState("");
  const [smallIcon, setSmallIcon] = useState("");
  const [largeIcon, setLargeIcon] = useState("");
  const [androidSound, setAndroidSound] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [accentColor, setAccentColor] = useState("");

  // ── advanced ──
  const [collapseId, setCollapseId] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("high");
  const [ttlValue, setTtlValue] = useState("3");
  const [ttlUnit, setTtlUnit] = useState("days");
  const [dataRows, setDataRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [buttons, setButtons] = useState<BtnRow[]>([]);

  // ── delivery ──
  const [mode, setMode] = useState<"now" | "fixed" | "timezone">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tzDate, setTzDate] = useState("");
  const [tzTime, setTzTime] = useState("09:00");

  // ── preview ──
  const [previewPlatform, setPreviewPlatform] = useState<"ios" | "android">("ios");

  const ttlSeconds = useMemo(() => {
    const n = parseInt(ttlValue || "0", 10) || 0;
    const mult = ttlUnit === "days" ? 86400 : ttlUnit === "hours" ? 3600 : ttlUnit === "minutes" ? 60 : 1;
    return n * mult;
  }, [ttlValue, ttlUnit]);

  const payload = useMemo(() => {
    const platforms = [iosOn && "ios", androidOn && "android"].filter(Boolean);

    let target_type: "all" | "tags" | "external_ids" = "all";
    let target_filter: unknown = {};
    if (audience === "particular") {
      target_type = targetType;
      if (targetType === "tags") {
        target_filter = Object.fromEntries(
          tagRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()])
        );
      } else {
        target_filter = externalIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const data = Object.fromEntries(
      dataRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()])
    );

    const validButtons = buttons
      .filter((b) => b.id.trim() && b.text.trim())
      .map((b) => ({ id: b.id.trim(), text: b.text.trim(), icon: b.icon.trim() || undefined }));

    return {
      app_id: appId,
      name: name.trim() || undefined,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      body: body.trim(),
      image_url: imageUrl.trim() || undefined,
      launch_url: launchUrl.trim() || undefined,
      data,
      platforms,
      options: {
        ios: {
          badge: badgeMode === "set" ? parseInt(badge || "0", 10) || 0 : null,
          sound: iosSound.trim() || undefined,
          contentAvailable,
          interruptionLevel: interruption,
        },
        android: {
          bigPicture: bigPicture.trim() || undefined,
          smallIcon: smallIcon.trim() || undefined,
          largeIcon: largeIcon.trim() || undefined,
          sound: androidSound.trim() || undefined,
          visibility,
          accentColor: accentColor.trim() || undefined,
        },
        advanced: {
          collapseId: collapseId.trim() || undefined,
          priority,
          ttlSeconds,
        },
        buttons: validButtons,
      },
      target_type,
      target_filter,
      delivery: {
        mode,
        scheduled_at: mode === "fixed" ? scheduledAt : undefined,
        tz_send_local: mode === "timezone" ? tzTime : undefined,
        tz_send_date: mode === "timezone" ? tzDate : undefined,
      },
    };
  }, [
    appId, name, title, subtitle, body, imageUrl, launchUrl, audience, targetType,
    tagRows, externalIds, iosOn, androidOn, badgeMode, badge, iosSound, contentAvailable,
    interruption, bigPicture, smallIcon, largeIcon, androidSound, visibility, accentColor,
    collapseId, priority, ttlSeconds, dataRows, buttons, mode, scheduledAt, tzDate, tzTime,
  ]);

  const canSubmit = title.trim() && body.trim() && (iosOn || androidOn);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Push Notification</h1>
          <p className="text-sm text-muted-foreground">
            Compose, target, and schedule a push.
          </p>
        </div>
        <SubmitBtn mode={mode} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── left: form ── */}
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Message Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign or internal name"
            />
          </div>

          {/* 1. Audience */}
          <SectionCard step="1" title="Audience">
            <RadioGroup value={audience} onValueChange={(v) => setAudience(v as any)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="aud-all" />
                <Label htmlFor="aud-all" className="font-normal">
                  Send to all subscribed
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="particular" id="aud-part" />
                <Label htmlFor="aud-part" className="font-normal">
                  Send to a particular segment
                </Label>
              </div>
            </RadioGroup>

            {audience === "particular" && (
              <div className="grid gap-3 rounded-md border p-3">
                <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tags">Tags (equality + AND)</SelectItem>
                    <SelectItem value="external_ids">External user IDs</SelectItem>
                  </SelectContent>
                </Select>

                {targetType === "tags" ? (
                  <div className="grid gap-2">
                    {tagRows.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="key (e.g. city)"
                          value={r.key}
                          onChange={(e) =>
                            setTagRows((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                            )
                          }
                        />
                        <Input
                          placeholder="value (e.g. lahore)"
                          value={r.value}
                          onChange={(e) =>
                            setTagRows((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setTagRows((rows) => rows.filter((_, j) => j !== i) || [])
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-self-start"
                      onClick={() => setTagRows((r) => [...r, { key: "", value: "" }])}
                    >
                      <Plus className="h-4 w-4" /> Add tag
                    </Button>
                  </div>
                ) : (
                  <Input
                    placeholder="4821, 99, 1500"
                    value={externalIds}
                    onChange={(e) => setExternalIds(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">Platforms</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={iosOn} onCheckedChange={(v) => setIosOn(!!v)} />
                  Apple iOS
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={androidOn} onCheckedChange={(v) => setAndroidOn(!!v)} />
                  Google Android
                </label>
              </div>
            </div>
          </SectionCard>

          {/* 2. Message */}
          <SectionCard step="2" title="Message">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subtitle">Subtitle (iOS)</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea id="body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="launch">Launch URL / deep link</Label>
              <Input
                id="launch"
                placeholder="myapp://order/A-100"
                value={launchUrl}
                onChange={(e) => setLaunchUrl(e.target.value)}
              />
            </div>
          </SectionCard>

          {/* iOS options */}
          {iosOn && (
            <SectionCard title="Apple iOS options">
              <AdvancedRow label="Badge">
                <RadioGroup
                  value={badgeMode}
                  onValueChange={(v) => setBadgeMode(v as any)}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="none" id="badge-none" />
                    <Label htmlFor="badge-none" className="font-normal">Don&apos;t set</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="set" id="badge-set" />
                    <Label htmlFor="badge-set" className="font-normal">Set to</Label>
                  </div>
                  {badgeMode === "set" && (
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                    />
                  )}
                </RadioGroup>
              </AdvancedRow>
              <AdvancedRow label="Sound">
                <Input
                  placeholder=".wav, .aiff, .caf"
                  value={iosSound}
                  onChange={(e) => setIosSound(e.target.value)}
                />
              </AdvancedRow>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={contentAvailable}
                  onCheckedChange={(v) => setContentAvailable(!!v)}
                />
                Content available (background)
              </label>
              <AdvancedRow label="Interruption Level">
                <Select value={interruption} onValueChange={setInterruption}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="time-sensitive">Time Sensitive</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </AdvancedRow>
            </SectionCard>
          )}

          {/* Android options */}
          {androidOn && (
            <SectionCard title="Google Android options">
              <AdvancedRow label="Big Picture URL">
                <Input value={bigPicture} onChange={(e) => setBigPicture(e.target.value)} placeholder="https://…" />
              </AdvancedRow>
              <AdvancedRow label="Large Icon URL">
                <Input value={largeIcon} onChange={(e) => setLargeIcon(e.target.value)} placeholder="https://…" />
              </AdvancedRow>
              <AdvancedRow label="Small Icon (resource name)">
                <Input value={smallIcon} onChange={(e) => setSmallIcon(e.target.value)} placeholder="ic_stat_notify" />
              </AdvancedRow>
              <AdvancedRow label="Accent Color (hex)">
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#4f7cff" />
              </AdvancedRow>
              <AdvancedRow label="Sound">
                <Input value={androidSound} onChange={(e) => setAndroidSound(e.target.value)} placeholder="default" />
              </AdvancedRow>
              <AdvancedRow label="Lockscreen Visibility">
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="secret">Secret</SelectItem>
                  </SelectContent>
                </Select>
              </AdvancedRow>
            </SectionCard>
          )}

          {/* Advanced */}
          <Card>
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-6 text-base font-semibold [&[data-state=open]>svg]:rotate-180">
                Advanced Settings
                <ChevronDown className="h-4 w-4 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid gap-4 pt-0">
                  <AdvancedRow label="Collapse ID">
                    <Input value={collapseId} onChange={(e) => setCollapseId(e.target.value)} />
                  </AdvancedRow>
                  <AdvancedRow label="Priority">
                    <RadioGroup
                      value={priority}
                      onValueChange={(v) => setPriority(v as any)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="normal" id="pri-n" />
                        <Label htmlFor="pri-n" className="font-normal">Normal</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="high" id="pri-h" />
                        <Label htmlFor="pri-h" className="font-normal">High</Label>
                      </div>
                    </RadioGroup>
                  </AdvancedRow>
                  <AdvancedRow label="Time To Live">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={ttlValue}
                        onChange={(e) => setTtlValue(e.target.value)}
                      />
                      <Select value={ttlUnit} onValueChange={setTtlUnit}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">seconds</SelectItem>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">hours</SelectItem>
                          <SelectItem value="days">days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AdvancedRow>

                  <div className="grid gap-2">
                    <Label className="text-sm">Additional Data</Label>
                    {dataRows.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="key"
                          value={r.key}
                          onChange={(e) =>
                            setDataRows((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                            )
                          }
                        />
                        <Input
                          placeholder="value"
                          value={r.value}
                          onChange={(e) =>
                            setDataRows((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDataRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-self-start"
                      onClick={() => setDataRows((r) => [...r, { key: "", value: "" }])}
                    >
                      <Plus className="h-4 w-4" /> Add field
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-sm">Action Buttons</Label>
                    {buttons.map((b, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="id (e.g. accept)"
                          value={b.id}
                          onChange={(e) =>
                            setButtons((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, id: e.target.value } : x))
                            )
                          }
                        />
                        <Input
                          placeholder="label (e.g. Accept)"
                          value={b.text}
                          onChange={(e) =>
                            setButtons((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x))
                            )
                          }
                        />
                        <Input
                          placeholder="icon (optional)"
                          value={b.icon}
                          onChange={(e) =>
                            setButtons((rows) =>
                              rows.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x))
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setButtons((rows) => rows.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-self-start"
                      onClick={() => setButtons((r) => [...r, { id: "", text: "", icon: "" }])}
                    >
                      <Plus className="h-4 w-4" /> Add button
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* 3. Delivery */}
          <SectionCard step="3" title="Delivery Schedule">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="now" id="d-now" />
                <Label htmlFor="d-now" className="font-normal">Immediately</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed" id="d-fixed" />
                <Label htmlFor="d-fixed" className="font-normal">Specific time</Label>
              </div>
              {mode === "fixed" && (
                <Input
                  type="datetime-local"
                  className="max-w-xs"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
              <div className="flex items-center gap-2">
                <RadioGroupItem value="timezone" id="d-tz" />
                <Label htmlFor="d-tz" className="font-normal">
                  Per-user timezone (each user&apos;s local time)
                </Label>
              </div>
              {mode === "timezone" && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="max-w-[10rem]"
                    value={tzDate}
                    onChange={(e) => setTzDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    className="max-w-[8rem]"
                    value={tzTime}
                    onChange={(e) => setTzTime(e.target.value)}
                  />
                </div>
              )}
            </RadioGroup>
          </SectionCard>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.ok && state.status === "scheduled" && (
            <Alert>
              <AlertDescription>Scheduled — it will be sent at the set time.</AlertDescription>
            </Alert>
          )}
          {state.ok && state.status === "completed" && (
            <Alert>
              <AlertDescription>
                Sent — {state.sent} delivered, {state.failed} failed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <SubmitBtn mode={mode} />
            {!canSubmit && (
              <span className="text-sm text-muted-foreground">
                Title, message and at least one platform required.
              </span>
            )}
          </div>
        </div>

        {/* ── right: live preview ── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PhonePreview
            platform={previewPlatform}
            onPlatform={setPreviewPlatform}
            title={title}
            subtitle={subtitle}
            body={body}
            image={imageUrl}
            buttons={buttons.filter((b) => b.text.trim())}
          />
        </div>
      </div>
    </form>
  );
}

function PhonePreview({
  platform,
  onPlatform,
  title,
  subtitle,
  body,
  image,
  buttons,
}: {
  platform: "ios" | "android";
  onPlatform: (p: "ios" | "android") => void;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  buttons: BtnRow[];
}) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPlatform(p)}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
              platform === p
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {p === "ios" ? "iOS" : "Android"}
          </button>
        ))}
      </div>

      <div className="rounded-[2rem] border bg-muted/40 p-4 pt-6">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted-foreground/30" />
        <div
          className={cn(
            "overflow-hidden bg-background shadow-sm",
            platform === "ios" ? "rounded-2xl" : "rounded-lg"
          )}
        >
          <div className="flex items-start gap-3 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {platform === "ios" ? <Bell className="size-4" /> : <Smartphone className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {title || "Notification title"}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">now</span>
              </div>
              {platform === "ios" && subtitle && (
                <div className="truncate text-xs font-medium">{subtitle}</div>
              )}
              <div className="line-clamp-3 text-xs text-muted-foreground">
                {body || "Your message body appears here as you type."}
              </div>
            </div>
          </div>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="max-h-40 w-full object-cover" />
          )}
          {buttons.length > 0 && (
            <div className="flex border-t">
              {buttons.slice(0, 3).map((b, i) => (
                <div
                  key={i}
                  className="flex-1 truncate border-r p-2 text-center text-xs font-medium text-primary last:border-r-0"
                >
                  {b.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
