package expo.modules.googleidtoken

import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GoogleSignInException(message: String, cause: Throwable? = null) :
  CodedException("ERR_GOOGLE_SIGN_IN", message, cause)

class GoogleIdTokenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GoogleIdToken")

    AsyncFunction("signIn") Coroutine { nonce: String ->
      val activity = appContext.currentActivity
        ?: throw GoogleSignInException("No current activity")
      val resId = activity.resources.getIdentifier(
        "google_id_token_web_client_id", "string", activity.packageName
      )
      if (resId == 0) throw GoogleSignInException("Web client ID is not configured")
      val option = GetSignInWithGoogleOption.Builder(activity.getString(resId))
        .setNonce(nonce)
        .build()
      val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
      try {
        val credential = CredentialManager.create(activity)
          .getCredential(activity, request)
          .credential
        if (credential !is CustomCredential ||
          credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          throw GoogleSignInException("Unexpected credential type")
        }
        mapOf(
          "type" to "success",
          "idToken" to GoogleIdTokenCredential.createFrom(credential.data).idToken
        )
      } catch (e: GetCredentialCancellationException) {
        mapOf("type" to "cancelled")
      } catch (e: GetCredentialException) {
        throw GoogleSignInException(e.message ?: e.type, e)
      } catch (e: GoogleIdTokenParsingException) {
        throw GoogleSignInException(e.message ?: "Invalid Google ID token", e)
      }
    }
  }
}
