"use client";

type Props = {
  label: string;
  confirmMessage: string;
  testId?: string;
  className?: string;
};

export function ConfirmSubmitButton({ label, confirmMessage, testId, className }: Props) {
  return (
    <button
      type="submit"
      data-testid={testId}
      className={className || "text-xs underline opacity-70"}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
