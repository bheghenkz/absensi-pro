import Swal from "sweetalert2";

/* ================= TOAST ================= */

export const showToast = (icon, title) => {
  Swal.fire({
    toast: true,
    position: "top-end",

    icon: icon,
    title: title,

    width: 300,
    padding: "8px 12px",

    showConfirmButton: false,

    timer: 2000,
    timerProgressBar: true,

    backdrop: false,

    customClass: {
      popup: "premium-toast",
      title: "premium-toast-title"
    },

    showClass: {
      popup: "animate__animated animate__fadeInDown"
    },

    hideClass: {
      popup: "animate__animated animate__fadeOutUp"
    }
  });
};


/* ================= ALERT ================= */

export const showAlert = (icon, title, text) => {
  Swal.fire({

    icon: icon,
    title: title,
    text: text,

    width: 320,
    padding: "1.5em",

    showConfirmButton: false,

    timer: 2500,
    timerProgressBar: true,

    customClass: {
      popup: "premium-alert",
      title: "premium-title",
      htmlContainer: "premium-text"
    },

    showClass: {
      popup: "animate__animated animate__zoomIn"
    },

    hideClass: {
      popup: "animate__animated animate__fadeOut"
    }
  });
};


/* ================= CONFIRM ================= */

export const showConfirm = async (title, text) => {

  const result = await Swal.fire({

    icon: "warning",

    title: title,
    text: text,

    width: 320,
    padding: "1.5em",

    showCancelButton: true,

    confirmButtonText: "Ya",
    cancelButtonText: "Batal",

    reverseButtons: true,

    buttonsStyling: false,

    customClass: {

      popup: "premium-confirm",

      title: "premium-title",
      htmlContainer: "premium-text",

      confirmButton: "btn-confirm",
      cancelButton: "btn-cancel"
    },

    showClass: {
      popup: "animate__animated animate__zoomIn"
    },

    hideClass: {
      popup: "animate__animated animate__fadeOut"
    }

  });

  return result.isConfirmed;
};