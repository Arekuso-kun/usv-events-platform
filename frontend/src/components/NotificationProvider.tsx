import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotifyOptions {
  type?: NotificationType;
  durationMs?: number;
}

interface NotificationContextValue {
  notify: (message: string, options?: NotifyOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  clearType: (type: NotificationType) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const notificationStyles: Record<NotificationType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-[#b9d7f0] bg-[#e8f4fc] text-[#254591]",
};

const notificationIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearType = useCallback((type: NotificationType) => {
    setNotifications((current) =>
      current.filter((notification) => notification.type !== type),
    );
  }, []);

  const notify = useCallback(
    (message: string, options: NotifyOptions = {}) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        clearNotifications();
        return;
      }

      const type = options.type ?? "info";
      const id = crypto.randomUUID();
      setNotifications((current) => {
        const alreadyVisible = current.some(
          (notification) =>
            notification.type === type &&
            notification.message === trimmedMessage,
        );
        if (alreadyVisible) {
          return current;
        }

        return [...current.slice(-2), { id, message: trimmedMessage, type }];
      });

      const durationMs =
        options.durationMs ?? (type === "error" ? 7000 : 4500);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [clearNotifications, dismiss],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (message) => notify(message, { type: "success" }),
      error: (message) => notify(message, { type: "error" }),
      info: (message) => notify(message, { type: "info" }),
      clearType,
      clearNotifications,
    }),
    [clearNotifications, clearType, notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationViewport
        notifications={notifications}
        dismiss={dismiss}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
}

function NotificationViewport(props: {
  notifications: Notification[];
  dismiss: (id: string) => void;
}) {
  const { notifications, dismiss } = props;

  useEffect(() => {
    if (!notifications.length) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss(notifications[notifications.length - 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, notifications]);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-32px))] gap-2"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          dismiss={dismiss}
        />
      ))}
    </div>
  );
}

function NotificationToast(props: {
  notification: Notification;
  dismiss: (id: string) => void;
}) {
  const Icon = notificationIcons[props.notification.type];

  return (
    <div
      role={props.notification.type === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-3 text-sm shadow-[0_14px_35px_rgba(25,32,65,0.16)]",
        notificationStyles[props.notification.type],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="m-0 min-w-0 flex-1 leading-5">{props.notification.message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-md hover:bg-white/55"
        aria-label="Inchide notificarea"
        onClick={() => props.dismiss(props.notification.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
