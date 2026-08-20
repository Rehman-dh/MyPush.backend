"use client";

import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";
import type { SdkVersions } from "@/lib/sdk-versions";

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
  versions,
  hasAndroidConfig,
  hasIosConfig,
}: {
  appId: string;
  appKey: string;
  versions: SdkVersions;
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
          <TabsTrigger value="ios">iOS</TabsTrigger>
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
      ref: ${versions.flutter}`}
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
    implementation("com.github.Rehman-dh:my_push_android:${versions.android}")
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

        {/* ── iOS (native Swift) ── */}
        <TabsContent value="ios" className="grid gap-6 pt-2">
          <Step n={1} title="Add the Swift package">
            <p>
              In Xcode: <strong>File → Add Package Dependencies…</strong>, paste
              the repo URL, and add the <code>MyPush</code> library to your app
              target. (Private repo is fine — sign in under Xcode → Settings →
              Accounts.)
            </p>
            <CodeBlock
              language="text"
              code={`https://github.com/talhastackdev/My_Push_Notification_Swift.git`}
            />
          </Step>

          <Step n={2} title="Enable capabilities">
            <p>
              On the app target → <strong>Signing &amp; Capabilities</strong>,
              add <strong>Push Notifications</strong> and{" "}
              <strong>Background Modes → Remote notifications</strong>.
            </p>
          </Step>

          <Step n={3} title="Firebase is owned by your app">
            <p>
              Unlike the Flutter/Android zero-config path, the native iOS SDK
              expects your app to own Firebase: add your{" "}
              <code>GoogleService-Info.plist</code>, link{" "}
              <code>FirebaseMessaging</code>, and call{" "}
              <code>FirebaseApp.configure()</code>. MyPush only receives.
            </p>
          </Step>

          <Step n={4} title="Wire up the app delegate">
            <p>
              The app owns Firebase and forwards the FCM token to MyPush, which
              handles device registration and foreground/tap notifications.
            </p>
            <CodeBlock
              language="swift"
              code={`import UIKit
import FirebaseCore
import FirebaseMessaging
import MyPush

final class AppPushDelegate: NSObject, UIApplicationDelegate, MessagingDelegate {
    func application(_ app: UIApplication,
                     didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = MyPush.shared   // foreground + tap
        MyPush.shared.registerForPush()                              // ask for APNs token
        return true
    }

    func application(_ app: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken token: Data) {
        Messaging.messaging().apnsToken = token
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let fcmToken { MyPush.shared.register(token: fcmToken) }   // registers the device
    }
}`}
            />
          </Step>

          <Step n={5} title="Configure MyPush at launch">
            <p>
              Pass this app&apos;s App Key and your dashboard URL:
            </p>
            <CodeBlock
              language="swift"
              code={`@main
struct MyApp: App {
    @UIApplicationDelegateAdaptor(AppPushDelegate.self) private var push
    init() {
        MyPush.shared.configure(appKey: "${appKey}",
                                baseURL: "https://pushnotify.mycdnpro.com")
    }
    var body: some Scene { WindowGroup { ContentView() } }
}`}
            />
          </Step>

          <Step n={6} title="Request permission (optional timing)">
            <p>
              After your own notification-permission prompt, call{" "}
              <code>MyPush.shared.registerForPush()</code> so the device
              registers the moment the user allows — instead of on the next
              launch.
            </p>
          </Step>

          <Step n={7} title="API reference">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <code>MyPush.shared.configure(appKey:baseURL:)</code> — call once
                at launch.
              </li>
              <li>
                <code>MyPush.shared.register(token:)</code> — feed it the FCM
                token from Firebase.
              </li>
              <li>
                <code>MyPush.shared.registerForPush()</code> — request the APNs
                token.
              </li>
              <li>
                <code>MyPush.shared</code> is the{" "}
                <code>UNUserNotificationCenterDelegate</code> (foreground
                banners, opens <code>launch_url</code> on tap).
              </li>
              <li>
                <code>MyPush.shared.deviceId</code> — the persisted device id.
              </li>
            </ul>
          </Step>
        </TabsContent>
      </Tabs>
    </div>
  );
}
