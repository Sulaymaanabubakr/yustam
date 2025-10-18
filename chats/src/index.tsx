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
  CometChatUIKit.init(uiKitSettings)?.then((response) => {
    setupLocalization();
    const root = ReactDOM.createRoot(
      document.getElementById("root") as HTMLElement
    );
    root.render(
      <CometChatProvider>
        <App />
      </CometChatProvider>
    );
  });
} else {
  /**
   * If credentials are missing, render the app without initializing CometChat.
   */
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
