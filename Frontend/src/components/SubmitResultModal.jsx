import { CheckCircle, XCircle, X } from "lucide-react";

export default function SubmitResultModal({ isOpen, onClose, result }) {
  if (!isOpen || !result) return null;

  const isSuccess = result.is_correct;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div
          className={`p-6 ${isSuccess
            ? "bg-gradient-to-r from-green-500 to-green-600"
            : "bg-gradient-to-r from-red-500 to-red-600"
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <CheckCircle size={32} className="text-white" />
              ) : (
                <XCircle size={32} className="text-white" />
              )}
              <div className="text-white">
                <h2 className="text-2xl font-bold">
                  {isSuccess ? "Congratulations!" : "Not Quite There"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Score */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-800 mb-2">
              {result.total_score}/{result.max_score}
            </div>
            <div className="text-gray-600">
              {result.max_score > 0 ? ((result.total_score / result.max_score) * 100).toFixed(0) : 0}% Score
            </div>
          </div>

          {/* Test Results Summary */}
          {result.results && result.results.length > 0 && (
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">
                Test Results:
              </h3>
              {result.results.map((test, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${test.is_passed
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg ${test.is_passed ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {test.is_passed ? "✓" : "✗"}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {test.case_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {result.error_message && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {result.error_message}
              </p>
            </div>
          )}

          {/* Action Message */}
          {!isSuccess && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800">
                💡 Check the <strong>Test Cases</strong> tab for detailed
                feedback and try again!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
