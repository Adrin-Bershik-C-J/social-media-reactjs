import React from "react";

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-2xl w-fit">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
      </div>
    </div>
  );
};

export default TypingIndicator;
