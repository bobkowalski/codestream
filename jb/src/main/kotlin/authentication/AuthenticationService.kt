package com.codestream.authentication

import com.codestream.agentService
import com.codestream.gson
import com.codestream.sessionService
import com.codestream.settingsService
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonObject
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await
import protocols.agent.LoginResult
import protocols.agent.LoginWithTokenParams
import protocols.webview.BootstrapResponse
import protocols.webview.Capabilities
import protocols.webview.UserSession

class AuthenticationService(val project: Project) {

    private val logger = Logger.getInstance(AuthenticationService::class.java)
    private var agentCapabilities: JsonObject = JsonObject()

    fun bootstrap(): Any? {
        val settings = project.settingsService ?: return Unit
        val session = project.sessionService ?: return Unit

        return BootstrapResponse(
            UserSession(session.userLoggedIn?.userId),
            Capabilities(),
            settings.webViewConfigs,
            settings.webViewContext,
            settings.extensionInfo.versionFormatted
        )
    }

    suspend fun autoSignIn() {
        val settings = project.settingsService ?: return

        if (!settings.state.autoSignIn) return

        val tokenStr = PasswordSafe.instance.getPassword(settings.credentialAttributes) ?: return

        val agent = project.agentService?.agent ?: return

        try {
            val token = gson.fromJson<JsonObject>(tokenStr)
            val loginResult =
                agent.loginToken(
                    LoginWithTokenParams(
                        token,
                        settings.state.teamId,
                        settings.team
                    )
                ).await()

            if (loginResult.error != null) {
                logger.warn(loginResult.error)
            } else {
                completeLogin(loginResult)
            }
        } catch (err: Exception) {
            logger.warn(err)
        }
    }

    fun completeLogin(result: LoginResult) {
        if (project.sessionService?.userLoggedIn == null) {
            result.state?.let {
                agentCapabilities = it.capabilities
                project.settingsService?.state?.teamId = it.teamId
                project.settingsService?.setWebViewContextJson(gson.toJsonTree(mapOf("currentTeamId" to it.teamId)))
                saveAccessToken(it.token)
            }
            project.sessionService?.login(result.userLoggedIn)
        }
    }

    suspend fun logout() {
        val agent = project.agentService ?: return
        val session = project.sessionService ?: return
        val settings = project.settingsService ?: return

        session.logout()
        agent.restart()
        settings.state.teamId = null
        saveAccessToken(null)
    }

    private fun saveAccessToken(accessToken: JsonObject?) {
        val settings = project.settingsService ?: return
        val credentials = accessToken?.let {
            Credentials(null, it.toString())
        }

        PasswordSafe.instance.set(
            settings.credentialAttributes,
            credentials
        )
    }
}
