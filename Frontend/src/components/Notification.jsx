import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * Notification Component - Toast-style notification
 *
 * Usage:
 * const [notification, setNotification] = useState(null);
 *
 * // Show notification
 * setNotification({ type: "success", message: "บันทึกสำเร็จ!" });
 *
 * // In JSX
 * <Notification
 *   notification={notification}
 *   onClose={() => setNotification(null)}
 * />
 *
 * Types: "success" | "error" | "warning" | "info"
 */

const iconMap = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />
};

const styleMap = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-white",
  info: "bg-blue-500 text-white"
};

export default function Notification({ notification, onClose, duration = 3000 }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose, duration]);

  if (!notification) return null;

  const { type = "info", message } = notification;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${styleMap[type]}`}>
        {iconMap[type]}
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-80 transition"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
