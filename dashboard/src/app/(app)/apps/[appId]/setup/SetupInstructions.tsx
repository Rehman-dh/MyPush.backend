"use client";

import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {n}
        </span>
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="ml-8 grid gap-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default function SetupInstructions({
  appId,
  appKey,
  hasAndroidConfig,
  hasIosConfig,
}: {
  appId: string;
  appKey: string;
  hasAndroidConfig: boolean;
  hasIosConfig: boolean;
}) {
  const anyFirebase = hasAndroidConfig || hasIosConfig;

  return (
    <div className="grid gap-4">
      {/* Firebase config status callout */}
      {anyFirebase ? (
        <Alert className="border-green-600/40 text-green-700 dark:text-green-500 [&>svg]:text-green-700 dark:[&>svg]:text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Firebase config is set</AlertTitle>
          <AlertDescription>
            Configured for{" "}
            {[hasAndroidConfig && "Android", hasIosConfig && "iOS"]
              .filter(Boolean)
              .join(" & ")}
            . The SDK fetches it at runtime — no google-services files needed in
            the app.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/50 text-amber-600 dark:text-amber-500 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Add your Firebase config first</AlertTitle>
          <AlertDescription>
            This app has no Firebase config yet, so notifications won&apos;t
            deliver. Add it on the{" "}
            <Link
              href={`/apps/${appId}/settings`}
              className="font-medium underline underline-offset-4"
            >
              Settings
            </Link>{" "}
            page (paste your google-services.json / GoogleService-Info.plist),
            then come back here.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="flutter">
        <TabsList>
          <TabsTrigger value="flutter">Flutter</TabsTrigger>
          <TabsTrigger value="android">Android</TabsTrigger>
        </TabsList>

        {/* ── Flutter ── */}
        <TabsContent value="flutter" className="grid gap-6 pt-2">
          <Step n={1} title="Add the package">
            <p>
              Add the git dependency to your <code>pubspec.yaml</code>, then run{" "}
              <code>flutter pub get</code>.
            </p>
            <CodeBlock
              language="yaml"
              code={`dependencies:
  my_push:
    git:
      url: https://github.com/Rehman-dh/MyPush.Package.git
      ref: main`}
            />
          </Step>

          <Step n={2} title="Initialize in main()">
            <p>
              The backend URL is baked into the SDK, so you only pass this app&apos;s
              App Key. Permission is requested only when you call{" "}
              <code>requestPermission()</code>.
            </p>
            <CodeBlock
              language="dart"
              code={`Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await MyPush.instance.initialize(appKey: '${appKey}');
  await MyPush.instance.requestPermission();

  MyPush.instance.onNotificationClick((data) {
    // Navigate using data, e.g. data['screen'], data['order_id'].
    // data['action_id'] is set when an action button was tapped.
  });

  runApp(const MyApp());
}`}
            />
          </Step>

          <Step n={3} title="Identify users & set tags (optional)">
            <p>Link a user id and attach tags for targeting.</p>
            <CodeBlock
              language="dart"
              code={`await MyPush.instance.login('your-user-id');
await MyPush.instance.setTags({'plan': 'premium', 'city': 'lahore'});`}
            />
          </Step>

          <Step n={4} title="iOS extras">
            <p>
              In Xcode, add the <strong>Push Notifications</strong> and{" "}
              <strong>Background Modes → Remote notifications</strong>{" "}
              capabilities, and upload your APNs <code>.p8</code> key in the
              Firebase console. iOS action buttons need{" "}
              <code>iosCategories:</code> at init plus a Notification Service
              Extension (see <code>my_push/IOS_NSE.md</code>). Android needs
              none of this.
            </p>
          </Step>
        </TabsContent>

        {/* ── Android ── */}
        <TabsContent value="android" className="grid gap-6 pt-2">
          <Step n={1} title="Add the JitPack repository">
            <p>
              In <code>settings.gradle.kts</code>, add JitPack to your
              repositories.
            </p>
            <CodeBlock
              language="kotlin"
              code={`dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}`}
            />
          </Step>

          <Step n={2} title="Add the dependency">
            <p>
              In your app module&apos;s <code>build.gradle.kts</code>:
            </p>
            <CodeBlock
              language="kotlin"
              code={`dependencies {
    implementation("com.github.Rehman-dh:my_push_android:0.2.0")
}`}
            />
          </Step>

          <Step n={3} title="Initialize in your Application">
            <p>
              The backend URL is baked into the SDK, so you only pass this app&apos;s
              App Key. Register the <code>Application</code> class in your
              manifest via <code>android:name=&quot;.App&quot;</code>.
            </p>
            <CodeBlock
              language="kotlin"
              code={`class App : Application() {
    override fun onCreate() {
        super.onCreate()
        MyPush.initialize(context = this, appKey = "${appKey}")
        MyPush.onNotificationClick { data ->
            // data["action_id"] is set when an action button was tapped.
        }
    }
}`}
            />
          </Step>

          <Step n={4} title="Request the notifications permission">
            <p>
              Call from an Activity (Android 13+; it&apos;s a no-op on older
              versions).
            </p>
            <CodeBlock
              language="kotlin"
              code={`MyPush.requestPermission(this)`}
            />
          </Step>

          <Step n={5} title="Identify users & set tags (optional)">
            <CodeBlock
              language="kotlin"
              code={`MyPush.login("your-user-id")
MyPush.setTags(mapOf("plan" to "premium", "city" to "lahore"))`}
            />
          </Step>

          <Step n={6} title="Firebase">
            <p>
              The FCM service, receiver, and <code>POST_NOTIFICATIONS</code>{" "}
              permission are merged in by the library — you declare nothing
              extra. For Firebase, either add <code>google-services.json</code> +
              the <code>com.google.gms.google-services</code> plugin, or pass{" "}
              <code>autoInitializeFirebase = true</code> to{" "}
              <code>initialize(...)</code> for zero-config (set the Firebase
              config in the dashboard first).
            </p>
          </Step>
        </TabsContent>
      </Tabs>
    </div>
  );
}
