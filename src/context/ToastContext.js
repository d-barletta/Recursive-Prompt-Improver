import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { toast as sonnerToast } from "sonner";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);

    // Auto-dismiss after timeout if specified
    if (toast.timeout) {
      setTimeout(() => {
        removeToast(id);
      }, toast.timeout);
    }
  };

  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const showSuccess = (title, subtitle = "", timeout = 5000, linkTo = null, linkText = null) => {
    const message = subtitle ? `${title}\n${subtitle}` : title;
    const toastId = sonnerToast.success(message, {
      duration: timeout,
      action: linkTo ? {
        label: linkText || "View",
        onClick: () => navigate(linkTo),
      } : undefined,
    });
    return toastId;
  };

  const showError = (title, subtitle = "", timeout = 8000, linkTo = null, linkText = null) => {
    const message = subtitle ? `${title}\n${subtitle}` : title;
    const toastId = sonnerToast.error(message, {
      duration: timeout,
      action: linkTo ? {
        label: linkText || "View",
        onClick: () => navigate(linkTo),
      } : undefined,
    });
    return toastId;
  };

  const showWarning = (title, subtitle = "", timeout = 5000, linkTo = null, linkText = null) => {
    const message = subtitle ? `${title}\n${subtitle}` : title;
    const toastId = sonnerToast.warning(message, {
      duration: timeout,
      action: linkTo ? {
        label: linkText || "View",
        onClick: () => navigate(linkTo),
      } : undefined,
    });
    return toastId;
  };

  const showInfo = (title, subtitle = "", timeout = 2000, linkTo = null, linkText = null) => {
    const message = subtitle ? `${title}\n${subtitle}` : title;
    const toastId = sonnerToast.info(message, {
      duration: timeout,
      action: linkTo ? {
        label: linkText || "View",
        onClick: () => navigate(linkTo),
      } : undefined,
    });
    return toastId;
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ToastContext.Provider>
  );
};

export default ToastContext;
