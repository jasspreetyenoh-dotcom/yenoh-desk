"use client";

// A submit button that asks "are you sure?" first, and does nothing if you cancel.
export default function ConfirmButton({ message, className, children }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
