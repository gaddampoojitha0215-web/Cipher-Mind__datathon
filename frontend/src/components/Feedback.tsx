import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import type { Theme } from "../types";

interface FeedbackProps {
  currentTheme: Theme;
}

export const Feedback: React.FC<FeedbackProps> = ({ currentTheme }) => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      fetch("https://manager.aivafreelancia.in/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "crime-mind-ai",
          message: feedback.trim(),
          category: "other",
          platform: "web",
          pageUrl: window.location.href
        })
      }).catch(err => {
        console.error("Failed to submit feedback", err);
      });

      setSubmitted(true);
      setFeedback("");
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 ${currentTheme.textMain}`}>
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-3 rounded-xl ${currentTheme.accentBg} bg-opacity-20`}>
          <MessageSquare className={`w-6 h-6 ${currentTheme.accentText}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback & Suggestions</h1>
          <p className={`text-sm mt-1 ${currentTheme.textMuted}`}>Help us improve CrimeMind AI by sharing your thoughts</p>
        </div>
      </div>

      <div className={`p-6 rounded-2xl ${currentTheme.cardBg}`}>
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Thank you for your feedback!</h3>
            <p className={`${currentTheme.textMuted}`}>Your input helps us make our platform better for everyone.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedback" className={`block text-sm font-medium mb-2 ${currentTheme.textMuted}`}>
                Your Message
              </label>
              <textarea
                id="feedback"
                rows={6}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think, report a bug, or suggest a new feature..."
                className={`w-full p-4 rounded-xl border ${currentTheme.border} bg-transparent ${currentTheme.textMain} placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none`}
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!feedback.trim()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  feedback.trim()
                    ? currentTheme.accentBg
                    : "opacity-50 cursor-not-allowed bg-gray-500 text-white"
                }`}
              >
                <Send className="w-4 h-4" />
                Submit Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
