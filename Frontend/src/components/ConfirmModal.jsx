import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";

/**
 * ConfirmModal Component - Modal for confirmation dialogs
 *
 * Usage:
 * const [confirmModal, setConfirmModal] = useState(null);
 *
 * // Show confirm modal
 * setConfirmModal({
 *   title: "ยืนยันการลบ",
 *   message: "ต้องการลบรายการนี้หรือไม่?",
 *   type: "danger", // "danger" | "warning" | "info"
 *   confirmText: "ลบ",
 *   cancelText: "ยกเลิก",
 *   onConfirm: () => { // do something },
 * });
 *
 * // In JSX
 * <ConfirmModal
 *   config={confirmModal}
 *   onClose={() => setConfirmModal(null)}
 * />
 */

const iconMap = {
  danger: <Trash2 size={28} />,
  warning: <AlertTriangle size={28} />,
  info: <HelpCircle size={28} />
};

const colorMap = {
  danger: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    confirmBtn: "bg-red-600 hover:bg-red-700"
  },
  warning: {
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    confirmBtn: "bg-yellow-600 hover:bg-yellow-700"
  },
  info: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    confirmBtn: "bg-blue-600 hover:bg-blue-700"
  }
};

export default function ConfirmModal({ config, onClose }) {
  if (!config) return null;

  const {
    title = "ยืนยัน",
    message = "คุณแน่ใจหรือไม่?",
    type = "danger",
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก",
    onConfirm
  } = config;

  const colors = colorMap[type] || colorMap.info;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`mx-auto w-14 h-14 rounded-full ${colors.iconBg} ${colors.iconColor} flex items-center justify-center mb-4`}>
            {iconMap[type]}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg transition font-semibold"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 ${colors.confirmBtn} text-white px-4 py-2.5 rounded-lg transition font-semibold`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
