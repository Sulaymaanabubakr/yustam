import "./App.css";
import React, { useEffect, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatUIKitLoginListener } from "@cometchat/chat-uikit-react";
import { CometChatHome } from "CometChat/components/CometChatHome/CometChatHome";
import { AppContextProvider } from "CometChat/context/AppContext";
import { useCometChatContext } from "CometChat/context/CometChatContext";
import useSystemColorScheme from "CometChat/customHooks";
import "@cometchat/chat-uikit-react/css-variables.css";
import useThemeStyles from "CometChat/customHook/useThemeStyles";
import {
  COMETCHAT_CONSTANTS,
  YUSTAM_STORAGE_KEY,
} from "./cometchat-config";

type StatusVariant = "loading" | "error";

const persistUid = (uid: string) => {
  if (typeof window === "undefined") return;
  const trimmed = (uid ?? "").trim();
  if (!trimmed.length) return;

  try {
    window.localStorage.setItem(YUSTAM_STORAGE_KEY, trimmed);
  } catch (error) {
    console.warn("Unable to persist uid in localStorage", error);
  }
  try {
    window.sessionStorage.setItem(YUSTAM_STORAGE_KEY, trimmed);
  } catch (error) {
    console.warn("Unable to persist uid in sessionStorage", error);
  }
};

const readStoredUid = (): string | null => {
  if (typeof window === "undefined") return null;

  const sanitize = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  try {
    const localUid = sanitize(window.localStorage.getItem(YUSTAM_STORAGE_KEY));
    if (localUid) {
      return localUid;
    }
  } catch (error) {
    console.warn("Unable to read uid from localStorage", error);
  }

  try {
    const sessionUid = sanitize(
      window.sessionStorage.getItem(YUSTAM_STORAGE_KEY)
    );
    if (sessionUid) {
      persistUid(sessionUid);
      return sessionUid;
    }
  } catch (error) {
    console.warn("Unable to read uid from sessionStorage", error);
  }

  return null;
};

const StatusScreen: React.FC<{ variant: StatusVariant; message: string }> = ({
  variant,
  message,
}) => {
  const baseColor = variant === "error" ? "#b3261e" : "#0f6a53";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "32px",
        textAlign: "center",
        fontWeight: 600,
        color: baseColor,
      }}
    >
      {message}
    </div>
  );
};

function App() {
  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { styleFeatures, setStyleFeatures } = useCometChatContext();
  const systemTheme = useSystemColorScheme();
  const existingUIKitUser = CometChatUIKitLoginListener?.getLoggedInUser();
  useThemeStyles(styleFeatures, systemTheme, setStyleFeatures, loggedInUser);

  useEffect(() => {
    const listenerId = "yustam-auto-login";
    CometChat.addLoginListener(
      listenerId,
      new CometChat.LoginListener({
        loginSuccess: (user: CometChat.User) => {
          persistUid(user.getUid());
          setErrorMessage(null);
          setLoggedInUser(user);
          setIsInitializing(false);
        },
        logoutSuccess: () => {
          setLoggedInUser(null);
          setErrorMessage(
            "You have been signed out of chat. Please log in to YUSTAM again."
          );
          setIsInitializing(false);
        },
      })
    );

    return () => CometChat.removeLoginListener(listenerId);
  }, []);

  useEffect(() => {
    let isActive = true;

    const connectToCometChat = async () => {
      try {
        const alreadyLoggedIn = await CometChat.getLoggedinUser();
        if (alreadyLoggedIn) {
          if (isActive) {
            persistUid(alreadyLoggedIn.getUid());
            setLoggedInUser(alreadyLoggedIn);
            setErrorMessage(null);
          }
          return;
        }

        const storedUid = readStoredUid();
        if (!storedUid) {
          if (isActive) {
            setErrorMessage(
              "Chat session missing. Please log out and log back into YUSTAM."
            );
          }
          return;
        }

        const user = await CometChat.login(
          storedUid,
          COMETCHAT_CONSTANTS.AUTH_KEY
        );
        if (isActive) {
          persistUid(user.getUid());
          setLoggedInUser(user);
          setErrorMessage(null);
        }
      } catch (error) {
        console.error("CometChat auto-login failed", error);
        if (isActive) {
          setErrorMessage(
            "We couldn't connect to chat right now. Please refresh this page."
          );
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    };

    connectToCometChat();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (existingUIKitUser) {
      persistUid(existingUIKitUser.getUid());
      setLoggedInUser(existingUIKitUser);
      setErrorMessage(null);
      setIsInitializing(false);
    }
  }, [existingUIKitUser]);

  if (isInitializing) {
    return (
      <div className="App">
        <AppContextProvider>
          <StatusScreen variant="loading" message="Connecting to chat…" />
        </AppContextProvider>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="App">
        <AppContextProvider>
          <StatusScreen variant="error" message={errorMessage} />
        </AppContextProvider>
      </div>
    );
  }

  return (
    <div className="App">
      <AppContextProvider>
        {loggedInUser ? <CometChatHome /> : <StatusScreen variant="loading" message="Preparing chat…" />}
      </AppContextProvider>
    </div>
  );
}

export default App;
