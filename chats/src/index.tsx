import ReactDOM from "react-dom/client";
import {
  CometChatUIKit,
  UIKitSettingsBuilder,
} from "@cometchat/chat-uikit-react";
import React from "react";
import App from "App";
import { setupLocalization } from "CometChat/utils/utils";
import cometChatLogo from "../src/CometChat/assets/cometchat_logo.svg";
import { CometChatProvider } from "CometChat/context/CometChatContext";
import { COMETCHAT_CONSTANTS } from "./cometchat-config";

export { COMETCHAT_CONSTANTS } from "./cometchat-config";

function clearPreloader() {
  try {
    const body = document.body;
    if (body) {
      body.classList.remove("cometchat-loading");
    }
    const screen = document.getElementById("preload-screen");
    if (screen) {
      screen.classList.add("hidden");
      screen.remove();
    }
  } catch (error) {
    console.warn("Unable to clear preloader", error);
  }
}
/**
 * Initialize CometChat if credentials are available, otherwise render the app directly.
 */
if (
  COMETCHAT_CONSTANTS.APP_ID &&
  COMETCHAT_CONSTANTS.REGION &&
  COMETCHAT_CONSTANTS.AUTH_KEY
) {
  const uiKitSettings = new UIKitSettingsBuilder()
    .setAppId(COMETCHAT_CONSTANTS.APP_ID)
    .setRegion(COMETCHAT_CONSTANTS.REGION)
    .setAuthKey(COMETCHAT_CONSTANTS.AUTH_KEY)
    .subscribePresenceForAllUsers()
    .build();

  /**
   * Initialize CometChat UIKit and render the application inside the CometChatProvider.
   */
  CometChatUIKit.init(uiKitSettings)
    ?.then(() => {
      clearPreloader();
      setupLocalization();
      const root = ReactDOM.createRoot(
        document.getElementById("root") as HTMLElement
      );
      root.render(
        <CometChatProvider>
          <App />
        </CometChatProvider>
      );
    })
    .catch((error) => {
      console.error("CometChat init failed", error);
      clearPreloader();
      const root = ReactDOM.createRoot(
        document.getElementById("root") as HTMLElement
      );
      root.render(
        <div className="App" style={{ gap: "20px" }}>
          <div className="cometchat-credentials__logo">
            <img src={cometChatLogo} alt="CometChat Logo" />
          </div>
          <div className="cometchat-credentials__header">
            Chat is temporarily unavailable. Please refresh this page.
          </div>
        </div>
      );
    });
} else {
  /**
   * If credentials are missing, render the app without initializing CometChat.
   */
  clearPreloader();
  const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
  );
  root.render(
    <div className="App" style={{ gap: "20px" }}>
      <div className="cometchat-credentials__logo">
        <img src={cometChatLogo} alt="CometChat Logo" />
      </div>
      <div className="cometchat-credentials__header">
        CometChat App credentials are missing. Please add them in{" "}
        <code>index.tsx</code> to continue.
      </div>
    </div>
  );
}
