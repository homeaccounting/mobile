import ExpoModulesCore
import GoogleSignIn

final class GoogleSignInException: GenericException<String> {
  override var code: String { "ERR_GOOGLE_SIGN_IN" }
  override var reason: String { param }
}

public class GoogleIdTokenModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GoogleIdToken")

    // GIDSignIn reads GIDClientID from Info.plist (written by the config plugin).
    AsyncFunction("signIn") { (nonce: String, promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject(GoogleSignInException("No view controller to present from"))
        return
      }
      GIDSignIn.sharedInstance.signIn(
        withPresenting: presenter, hint: nil, additionalScopes: nil, nonce: nonce
      ) { result, error in
        if let error = error as NSError? {
          if error.domain == kGIDSignInErrorDomain && error.code == GIDSignInError.canceled.rawValue {
            promise.resolve(["type": "cancelled"])
          } else {
            promise.reject(GoogleSignInException(error.localizedDescription))
          }
          return
        }
        guard let idToken = result?.user.idToken?.tokenString else {
          promise.reject(GoogleSignInException("No ID token in the sign-in result"))
          return
        }
        promise.resolve(["type": "success", "idToken": idToken])
      }
    }.runOnQueue(.main)
  }
}
