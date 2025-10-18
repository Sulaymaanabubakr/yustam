import "./App.css";
import React, { useEffect, useState, useContext } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatUIKitLoginListener } from "@cometchat/chat-uikit-react";
import { CometChatHome } from "CometChat/components/CometChatHome/CometChatHome";
import { AppContextProvider } from "CometChat/context/AppContext";
import { AppContext } from "CometChat/context/AppContext";
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

interface StatusScreenProps {
  variant: StatusVariant;
  message: string;
  details?: string | null;
}

const StatusScreen: React.FC<StatusScreenProps> = ({
  variant,
  message,
  details,
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
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <span>{message}</span>
      {details ? (
        <code
          style={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "#5b5b5b",
            backgroundColor: "rgba(0,0,0,0.06)",
            padding: "8px 12px",
            borderRadius: "8px",
            maxWidth: "420px",
            wordBreak: "break-word",
          }}
          aria-live="polite"
        >
          {details}
        </code>
      ) : null}
    </div>
  );
};

const CHAT_FOCUS_STORAGE_KEY = "yustam_chat_focus";

const consumeChatFocus = (): { uid: string; name?: string } | null => {
  if (typeof window === "undefined") return null;
  const read = (storage: Storage) => {
    try {
      const raw = storage.getItem(CHAT_FOCUS_STORAGE_KEY);
      if (!raw) return null;
      storage.removeItem(CHAT_FOCUS_STORAGE_KEY);
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.uid === "string" && parsed.uid.trim().length) {
        return {
          uid: parsed.uid.trim(),
          name:
            typeof parsed.name === "string" && parsed.name.trim().length
              ? parsed.name.trim()
              : undefined,
        };
      }
    } catch (error) {
      console.warn("Unable to read chat focus request", error);
    }
    return null;
  };

  return read(window.sessionStorage) || read(window.localStorage);
};

const AppWithContext: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [defaultUser, setDefaultUser] = useState<CometChat.User | null>(null);

  const { styleFeatures, setStyleFeatures } = useCometChatContext();
  const systemTheme = useSystemColorScheme();
  const existingUIKitUser = CometChatUIKitLoginListener?.getLoggedInUser();
  useThemeStyles(styleFeatures, systemTheme, setStyleFeatures, loggedInUser);
  const { setAppState } = useContext(AppContext);

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
          setErrorDetails(null);
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
            setErrorDetails(null);
          }
          return;
        }

        const storedUid = readStoredUid();
        if (!storedUid) {
          if (isActive) {
            setErrorMessage(
              "Chat session missing. Please log out and log back into YUSTAM."
            );
            setErrorDetails(null);
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
          setErrorDetails(null);
        }
      } catch (error) {
        console.error("CometChat auto-login failed", error);

        let details: string | null = null;
        if (error && typeof error === "object") {
          const maybeException = error as Record<string, unknown>;
          const code =
            typeof maybeException["code"] === "string"
              ? maybeException["code"]
              : null;
          const message =
            typeof maybeException["message"] === "string"
              ? maybeException["message"]
              : null;
          details = [code, message]
            .filter((value) => typeof value === "string" && value.length > 0)
            .join(" · ");
        }
        if (!details && error instanceof Error) {
          details = error.message;
        }

        if (isActive) {
          setErrorMessage(
            "We couldn't connect to chat right now. Please refresh this page."
          );
          setErrorDetails(details);
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
      setErrorDetails(null);
      setIsInitializing(false);
    }
  }, [existingUIKitUser]);

  useEffect(() => {
    if (!loggedInUser) return;
    const focusRequest = consumeChatFocus();
    if (!focusRequest) return;

    if (focusRequest.uid === loggedInUser.getUid()) {
      setDefaultUser(null);
      return;
    }

    CometChat.getUser(focusRequest.uid)
      .then((user) => {
        setDefaultUser(user);
        setAppState({ type: "updateSelectedItemUser", payload: undefined });
        setAppState({ type: "updateSelectedItem", payload: undefined });
        setAppState({ type: "updateSelectedItemGroup", payload: undefined });
      })
      .catch((error) => {
        console.error("Unable to fetch chat focus user", error);
      });
  }, [loggedInUser, setAppState]);

  if (isInitializing) {
    return (
      <div className="App">
        <div className="App__content">
          <StatusScreen variant="loading" message="Connecting to chat…" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="App">
        <div className="App__content">
          <StatusScreen
            variant="error"
            message={errorMessage}
            details={errorDetails}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="App__content">
        {loggedInUser ? (
          <CometChatHome defaultUser={defaultUser ?? undefined} />
        ) : (
          <StatusScreen
            variant="loading"
            message=\ \Preparing chat…\\
            details="Awaiting chat session."
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppContextProvider>
      <AppWithContext />
    </AppContextProvider>
  );
}
export default App;












