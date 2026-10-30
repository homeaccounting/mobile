import ExpoModulesCore
import GoogleSignIn

// Google's sign-in returns to the app through its reversed-client-ID URL scheme.
public class GoogleIdTokenAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return GIDSignIn.sharedInstance.handle(url)
  }
}
