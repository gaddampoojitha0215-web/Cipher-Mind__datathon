import React, { useState } from "react";
import { X, MessageSquare, Bug, Lightbulb, CheckCircle2 } from "lucide-react";
import type { Theme } from "../types";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
}) => {
  const [category, setCategory] = useState<"Bug" | "Feature" | "General">("General");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");
      
      const response = await fetch(`${API_BASE_URL}/api/v1/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, text }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setText("");
          setCategory("General");
          onClose();
        }, 2000);
      } else {
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${currentTheme.cardBg} ${currentTheme.border} animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className={`w-5 h-5 ${currentTheme.textMain}`} />
            <h2 className={`font-semibold ${currentTheme.textMain}`}>Send Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg hover:bg-black/20 transition-colors ${currentTheme.textMuted} hover:${currentTheme.textMain}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-lg font-medium ${currentTheme.textMain}`}>Thank You!</h3>
              <p className={`text-sm mt-1 ${currentTheme.textMuted}`}>Your feedback helps us improve CrimeMind AI.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${currentTheme.textMain}`}>What kind of feedback is this?</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("Bug")}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    category === "Bug"
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : `border-white/10 hover:border-white/20 bg-black/20 ${currentTheme.textMuted}`
                  }`}
                >
                  <Bug className="w-5 h-5" />
                  <span className="text-xs font-medium">Issue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("Feature")}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    category === "Feature"
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : `border-white/10 hover:border-white/20 bg-black/20 ${currentTheme.textMuted}`
                  }`}
                >
                  <Lightbulb className="w-5 h-5" />
                  <span className="text-xs font-medium">Idea</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("General")}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    category === "General"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : `border-white/10 hover:border-white/20 bg-black/20 ${currentTheme.textMuted}`
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs font-medium">Other</span>
                </button>
              </div>
            </div>

            {/* Feedback Text */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${currentTheme.textMain}`}>Your message</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className={`w-full min-h-[120px] p-3 text-sm rounded-xl border bg-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all ${currentTheme.border} ${currentTheme.textMain}`}
                required
              />
            </div>

            {/* Footer / Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  !text.trim() || isSubmitting
                    ? "opacity-50 cursor-not-allowed bg-black/40 text-white/50"
                    : `${currentTheme.accentBg}`
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
